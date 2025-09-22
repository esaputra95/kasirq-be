import Model from "#root/services/PrismaService";
import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { handleValidationError } from "#root/helpers/handleValidationError";
import { errorType } from "#root/helpers/errorType";
import { v4 as uuidv4 } from "uuid";
import { SalesQueryInterface } from "#root/interfaces/sales/SalesInterface";
import moment from "moment";
import momentT from "moment-timezone";
import "moment/locale/id";
import { DecrementStock, GetHpp, IncrementStock } from "#root/helpers/stock";
import formatter from "#root/helpers/formatCurrency";
import {
    handleErrorMessage,
    ValidationError,
} from "#root/helpers/handleErrors";
import { transactionNumber } from "#root/helpers/transactionNumber";

const getData = async (
    req: Request<{}, {}, {}, SalesQueryInterface>,
    res: Response
) => {
    try {
        const query = req.query;
        // PAGING
        const take: number = parseInt(query.limit ?? 20);
        const page: number = parseInt(query.page ?? 1);
        const skip: number = (page - 1) * take;
        // FILTER
        let filter: any = [];
        query.invoice
            ? (filter = [...filter, { name: { contains: query.invoice } }])
            : null;
        if (filter.length > 0) {
            filter = {
                OR: [...filter],
            };
        }
        const data = await Model.sales.findMany({
            where: {
                ...filter,
                storeId: query.storeId,
            },
            orderBy: {
                createdAt: "desc",
            },
            include: {
                members: true,
            },
            skip: skip,
            take: take,
        });
        const total = await Model.sales.count({
            where: {
                ...filter,
            },
        });

        res.status(200).json({
            status: true,
            message: "successful in getting sales data",
            data: {
                sales: data,
                info: {
                    page: page,
                    limit: take,
                    total: total,
                },
            },
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const postData = async (req: Request, res: Response) => {
    const salesId = uuidv4();
    const data = req.body;

    const transaction = async () => {
        const dataDetail = data.detailItem ?? [];
        // Start transaction
        return Model.$transaction(async (prisma) => {
            const invoice = await transactionNumber({
                storeId: data.storeId,
                module: "SALE",
            });
            const salesData = {
                id: salesId,
                date: moment().format(),
                storeId: data.storeId,
                accountCashId: data.accountId,
                payMetodeId: data.accountId,
                memberId: data.memberId,
                invoice: invoice.invoice,
                subTotal: parseInt(data.subTotal ?? 0),
                total:
                    parseInt(data.subTotal ?? 0) - parseInt(data.discount ?? 0),
                description: data.description,
                userCreate: res.locals.userId,
                discount: parseInt(data.discount ?? 0),
                payCash: parseInt(data.pay ?? 0),
                transactionNumber: invoice.transactionNumber,
            };
            const createSales = await prisma.sales.create({
                data: salesData,
            });

            if (data.salePendingId) {
                await prisma.salePending.update({
                    data: {
                        status: "finish",
                    },
                    where: {
                        id: data.salePendingId,
                    },
                });
            }

            for (const key in dataDetail) {
                if (dataDetail[key].quantity === 0) continue;
                const idDetail = uuidv4();
                await prisma.saleDetails.create({
                    data: {
                        id: idDetail,
                        saleId: salesData.id,
                        productId: key,
                        productConversionId: dataDetail[key].unitId,
                        quantity: dataDetail[key].quantity ?? 1,
                        price: dataDetail[key].price ?? 0,
                    },
                });

                const conversion = await prisma.productConversions.findFirst({
                    where: {
                        id: dataDetail[key].unitId,
                    },
                });

                if (!conversion) {
                    throw new Error(
                        `Konversi produk dengan ID ${dataDetail[key].unitId} tidak ditemukan`
                    );
                }

                const decrement = await DecrementStock(
                    prisma,
                    key,
                    data.storeId,
                    dataDetail[key].quantity * (conversion?.quantity ?? 1)
                );

                if (!decrement.status) {
                    throw new ValidationError(
                        JSON.stringify(decrement.message),
                        400,
                        "quantity"
                    );
                }

                const hpp = await GetHpp({
                    prisma,
                    storeId: data.storeId,
                    quantityNeed:
                        dataDetail[key].quantity * conversion?.quantity,
                    productId: key,
                });

                for (const value of hpp.hpp) {
                    if (value.hppHistoryId) {
                        await prisma.cogs.create({
                            data: {
                                id: uuidv4(),
                                hppHistoryId: value.hppHistoryId,
                                saleDetailId: idDetail,
                                price: value.price,
                                quantity: value.quantity,
                                createdAt: moment().format(),
                            },
                        });
                        await prisma.hppHistory.update({
                            data: {
                                quantityUsed: {
                                    increment: value.quantity,
                                },
                            },
                            where: {
                                id: value.hppHistoryId,
                            },
                        });
                    } else {
                        await prisma.cogs.create({
                            data: {
                                id: uuidv4(),
                                saleDetailId: idDetail,
                                price: value.price,
                                quantity: value.quantity,
                                createdAt: moment().format(),
                            },
                        });
                    }
                }
            }

            return { createSales };
        });
    };

    try {
        await transaction();
        res.status(200).json({
            status: true,
            message: "Successful in created sales data",
            data: salesId,
            remainder:
                parseInt(data?.pay ?? 0) -
                (parseInt(data.subTotal ?? 0) - parseInt(data.discount ?? 0)),
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const updateData = async (req: Request, res: Response) => {
    try {
        const salesId = req.params.id;
        const body = { ...req.body };
        const detailInput = body.detailItem ?? {};

        await Model.$transaction(async (prisma) => {
            // Ambil data sales + detail lama
            const existing = await prisma.sales.findUnique({
                where: { id: salesId },
                include: { saleDetails: true },
            });

            if (!existing) throw new Error("sales data not found");

            // --- Update header (totals) ---
            const headerUpdate = {
                discount: parseInt(body.discount ?? 0),
                payCash: parseInt(body.pay ?? 0),
                subTotal: parseInt(body.subTotal ?? 0),
                total:
                    parseInt(body.subTotal ?? 0) - parseInt(body.discount ?? 0),
                memberId: body.memberId ?? existing.memberId,
                description: body.description ?? existing.description,
            } as const;

            await prisma.sales.update({
                where: { id: salesId },
                data: headerUpdate,
            });

            // Index detail lama by id untuk memudahkan rekonsiliasi
            const existingById = new Map(
                (existing.saleDetails ?? []).map((d) => [d.id, d])
            );

            // Helper: hitung qty basis stok (konversi)
            const getBaseQty = async (
                conversionId: string | null,
                qty: Prisma.Decimal | number
            ) => {
                const conv = conversionId
                    ? await prisma.productConversions.findFirst({
                          where: { id: conversionId },
                          select: { quantity: true },
                      })
                    : null;
                return Number(qty) * Number(conv?.quantity ?? 1);
            };

            // Proses semua item dari input (create/update/delete)
            for (const productId in detailInput) {
                const item = detailInput[productId];
                const salesDetailId: string | undefined = item.salesDetailId;

                // Jika ada id detail, berarti update/delete
                if (salesDetailId) {
                    const prev = existingById.get(salesDetailId);
                    if (!prev) continue;

                    // Jika quantity 0 => kembalikan stok lama & hapus
                    if ((item.quantity ?? 0) === 0) {
                        const prevBase = await getBaseQty(
                            prev.productConversionId,
                            prev.quantity ?? 0
                        );

                        const inc = await IncrementStock(
                            prisma,
                            prev.productId,
                            existing.storeId ?? "",
                            prevBase
                        );
                        if (!inc.status) {
                            throw new Error(
                                typeof inc.message === "string"
                                    ? inc.message
                                    : JSON.stringify(inc.message)
                            );
                        }

                        await prisma.cogs.deleteMany({
                            where: { saleDetailId: prev.id },
                        });
                        await prisma.saleDetails.delete({
                            where: { id: prev.id },
                        });
                        existingById.delete(salesDetailId);
                        continue;
                    }

                    // Update detail & sesuaikan stok berdasarkan selisih
                    const newBase = await getBaseQty(
                        item.unitId ?? null,
                        item.quantity ?? 0
                    );
                    const oldBase = await getBaseQty(
                        prev.productConversionId,
                        prev.quantity ?? 0
                    );
                    const diff = newBase - oldBase; // + berarti perlu kurangi stok, - berarti kembalikan stok

                    await prisma.saleDetails.update({
                        where: { id: prev.id },
                        data: {
                            productId,
                            productConversionId: item.unitId,
                            quantity: item.quantity ?? 1,
                            price: item.price ?? 0,
                        },
                    });

                    if (diff > 0) {
                        const dec = await DecrementStock(
                            prisma,
                            productId,
                            existing.storeId ?? "",
                            diff
                        );
                        if (!dec.status) {
                            throw new ValidationError(
                                JSON.stringify(dec.message),
                                400,
                                "quantity"
                            );
                        }
                    } else if (diff < 0) {
                        const inc = await IncrementStock(
                            prisma,
                            productId,
                            existing.storeId ?? "",
                            Math.abs(diff)
                        );
                        if (!inc.status) {
                            throw new Error(
                                typeof inc.message === "string"
                                    ? inc.message
                                    : JSON.stringify(inc.message)
                            );
                        }
                    }

                    // Catatan: perhitungan COGS/HPP untuk perubahan kuantitas
                    // bisa ditambahkan di sini bila diperlukan (hapus & hitung ulang)

                    existingById.delete(salesDetailId);
                } else {
                    // Detail baru
                    if ((item.quantity ?? 0) === 0) continue;
                    const idDetail = uuidv4();

                    await prisma.saleDetails.create({
                        data: {
                            id: idDetail,
                            saleId: salesId,
                            productId,
                            productConversionId: item.unitId,
                            quantity: item.quantity ?? 1,
                            price: item.price ?? 0,
                        },
                    });

                    const base = await getBaseQty(
                        item.unitId ?? null,
                        item.quantity ?? 0
                    );
                    const dec = await DecrementStock(
                        prisma,
                        productId,
                        body.storeId,
                        base
                    );
                    if (!dec.status) {
                        throw new ValidationError(
                            JSON.stringify(dec.message),
                            400,
                            "quantity"
                        );
                    }

                    // Catatan: Tambahkan pencatatan HPP/COGS baru jika diperlukan
                }
            }

            // Sisa detail lama yang tidak ada lagi di input => hapus & kembalikan stok
            for (const leftover of existingById.values()) {
                const base = await getBaseQty(
                    leftover.productConversionId,
                    leftover.quantity ?? 1
                );
                const inc = await IncrementStock(
                    prisma,
                    leftover.productId,
                    existing.storeId ?? "",
                    base
                );
                if (!inc.status) {
                    throw new Error(
                        typeof inc.message === "string"
                            ? inc.message
                            : JSON.stringify(inc.message)
                    );
                }

                await prisma.cogs.deleteMany({
                    where: { saleDetailId: leftover.id },
                });
                await prisma.saleDetails.delete({ where: { id: leftover.id } });
            }
        });

        res.status(200).json({
            status: true,
            message: "successful in updated sales data",
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const deleteData = async (req: Request, res: Response) => {
    try {
        await Model.$transaction(async (prisma) => {
            // Ambil sales + detailnya di dalam transaksi
            const model = await prisma.sales.findUnique({
                where: { id: req.params.id },
                include: { saleDetails: true },
            });

            if (!model) {
                throw new Error("sales data not found");
            }

            // Kembalikan stok untuk tiap detail berdasarkan konversi unit
            for (const value of model.saleDetails) {
                const conversion = await prisma.productConversions.findFirst({
                    where: { id: value.productConversionId ?? "" },
                    select: { quantity: true },
                });

                const qtyBase =
                    Number(value.quantity) * Number(conversion?.quantity ?? 1);
                const inc = await IncrementStock(
                    prisma,
                    value.productId,
                    model.storeId ?? "",
                    qtyBase
                );

                if (!inc.status) {
                    // Jika helper mengembalikan status false, hentikan transaksi
                    throw new Error(
                        typeof inc.message === "string"
                            ? inc.message
                            : JSON.stringify(inc.message)
                    );
                }

                // Hapus jejak COGS untuk detail ini (jika ada)
                await prisma.cogs.deleteMany({
                    where: { saleDetailId: value.id },
                });
            }

            // Hapus detail penjualan terlebih dahulu, kemudian header
            await prisma.saleDetails.deleteMany({
                where: { saleId: model.id },
            });
            await prisma.sales.delete({ where: { id: model.id } });
        });

        res.status(200).json({
            status: true,
            message: "successfully deleted sales data",
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getDataById = async (req: Request, res: Response) => {
    try {
        const model = await Model.sales.findUnique({
            where: {
                id: req.params.id,
            },
        });

        if (!model) throw new Error("data not found");
        res.status(200).json({
            status: true,
            message: "successfully in get sales data",
            data: {
                sales: model,
            },
        });
    } catch (error) {
        let message = {
            status: 500,
            message: { msg: `${error}` },
        };
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            message = await handleValidationError(error);
        }
        res.status(500).json({
            status: message.status,
            errors: [message.message],
        });
    }
};

const getSelect = async (req: Request, res: Response) => {
    try {
        let filter: any = {};
        req.query.name
            ? (filter = {
                  ...filter,
                  name: { contains: req.query?.name as string },
              })
            : null;
        let dataOption: any = [];
        const data = await Model.sales.findMany({
            where: {
                ...filter,
            },
            take: 10,
        });
        for (const value of data) {
            dataOption = [
                ...dataOption,
                {
                    id: value.id,
                    title: value.date,
                },
            ];
        }
        res.status(200).json({
            status: true,
            message: "successfully in get sales data",
            data: {
                sales: dataOption,
            },
        });
    } catch (error) {
        let message = {
            status: 500,
            message: { msg: `${error}` },
        };
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            message = await handleValidationError(error);
        }
        res.status(500).json({
            status: message.status,
            errors: [message.message],
        });
    }
};

const getFacture = async (req: Request, res: Response) => {
    try {
        const id = req.query.id as string;
        const storeId = req.query.storeId as string;
        const data = await Model.sales.findUnique({
            where: {
                id: id ?? "",
            },
            select: {
                id: true,
                date: true,
                total: true,
                subTotal: true,
                payCash: true,
                discount: true,
                createdAt: true,
                members: true,
                description: true,
                invoice: true,
                users: {
                    select: {
                        name: true,
                    },
                },
                saleDetails: {
                    select: {
                        id: true,
                        quantity: true,
                        price: true,
                        productConversions: {
                            select: {
                                id: true,
                                units: {
                                    select: {
                                        name: true,
                                    },
                                },
                            },
                        },
                        products: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
                paymentMethod: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        const store = await Model.stores.findUnique({
            where: {
                id: storeId,
            },
            select: {
                name: true,
                address: true,
            },
        });

        let newData: any = [];
        const salesDetails = data?.saleDetails ?? [];
        for (let index = 0; index < salesDetails.length; index++) {
            newData = [
                ...newData,
                {
                    product: salesDetails[index].products.name,
                    quantity: formatter.format(
                        parseInt(salesDetails[index].quantity + "") ?? 0
                    ),
                    price: formatter.format(
                        parseInt(salesDetails[index].price + "") ?? 0
                    ),
                    unit: salesDetails[index].productConversions?.units?.name,
                },
            ];
        }
        const payCash = Number(data?.payCash ?? 0); // uang dibayar
        const subTotal = Number(data?.subTotal ?? 0); // total sebelum diskon
        const discount = Number(data?.discount ?? 0); // diskon

        const totalBelanja = subTotal - discount; // total akhir
        const selisih = payCash - totalBelanja; // kembalian (+) atau kurang (-)
        res.status(200).json({
            status: true,
            message: "successfully in get sales data",
            data: {
                sales: {
                    date:
                        moment(data?.date).format("DD/MM/YYYY") +
                        " " +
                        momentT(data?.createdAt)
                            .tz("Asia/Jakarta")
                            .format("HH:mm"),
                    total: formatter.format(parseInt(totalBelanja + "") ?? 0),
                    subTotal: formatter.format(parseInt(subTotal + "") ?? 0),
                    discount: formatter.format(parseInt(discount + "") ?? 0),
                    payCash: formatter.format(parseInt(payCash + "") ?? 0),
                    change: formatter.format(parseInt(selisih + "") ?? 0),
                    id: data?.id,
                    user: data?.users?.name,
                    member: data?.members?.name ?? "Umum",
                    paymentMethod: data?.paymentMethod?.name ?? "Cash",
                    invoice: data?.invoice,
                    salesDetails: newData,
                    description: data?.description ?? "",
                },
                store,
            },
        });
    } catch (error) {
        let message = {
            status: 500,
            message: { msg: `${error}` },
        };
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            message = await handleValidationError(error);
        }
        res.status(500).json({
            status: message.status,
            errors: [message.message],
        });
    }
};

const getDataUpdate = async (req: Request, res: Response) => {
    try {
        const data = await Model.sales.findUnique({
            where: {
                id: req.params.id,
            },
            include: {
                saleDetails: {
                    include: {
                        products: true,
                    },
                },
            },
        });
        let newData: any = {};
        const dataDetail = data?.saleDetails ?? [];
        for (const value of dataDetail) {
            newData = {
                ...newData,
                [value.productId]: {
                    quantity: value.quantity,
                    unit: value.productConversionId,
                    price: value.price,
                    product: value.products,
                    salesId: value.saleId,
                    salesDetailId: value.id,
                },
            };
        }

        res.status(200).json({
            status: true,
            message: "Success get data sales",
            data: {
                sale: {
                    pay: data?.payCash,
                    discount: data?.discount,
                    memberId: data?.memberId,
                },
                saleDetail: newData,
                id: req.params.id,
            },
        });
    } catch (error) {
        res.status(500);
    }
};

export {
    getData,
    postData,
    updateData,
    deleteData,
    getDataById,
    getSelect,
    getFacture,
    getDataUpdate,
};
