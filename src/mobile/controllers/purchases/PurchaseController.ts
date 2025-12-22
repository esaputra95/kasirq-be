import Model from "#root/services/PrismaService";
import e, { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { handleValidationError } from "#root/helpers/handleValidationError";
import { errorType } from "#root/helpers/errorType";
import { v4 as uuidv4 } from "uuid";
import { BrandQueryInterface } from "#root/interfaces/masters/BrandInterface";
import getOwnerId from "#root/helpers/GetOwnerId";
import moment from "moment";
import { DecrementStock, IncrementStock } from "#root/helpers/stock";
import { handleErrorMessage } from "#root/helpers/handleErrors";

const getData = async (
    req: Request<{}, {}, {}, BrandQueryInterface>,
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
        query.name
            ? (filter = [...filter, { name: { contains: query.name } }])
            : null;
        if (filter.length > 0) {
            filter = {
                OR: [...filter],
            };
        }
        const data = await Model.purchases.findMany({
            where: {
                ...filter,
                storeId: query.storeId,
            },
            include: {
                suppliers: true,
            },
            skip: skip,
            take: take,
            orderBy: {
                createdAt: "desc",
            },
        });
        const total = await Model.purchases.count({
            where: {
                ...filter,
            },
        });

        res.status(200).json({
            status: true,
            message: "successful in getting Purchase data",
            data: {
                purchase: data,
                info: {
                    page: page,
                    limit: take,
                    total: total,
                },
            },
        });
    } catch (error) {
        let message = errorType;
        message.message.msg = `${error}`;
        res.status(500).json({
            status: message.status,
            errors: [message.message],
        });
    }
};

import {
    createCashflowEntry,
    revertCashflowByReference,
} from "#root/mobile/services/accountancy/CashflowService";

const postData = async (req: Request, res: Response) => {
    const purchaseId = uuidv4();

    const transaction = async () => {
        const ownerId: any = await getOwnerId(
            res.locals.userId,
            res.locals.userType
        );
        const data = req.body;
        const dataDetail = data.detailItem;

        // Start transaction
        return Model.$transaction(async (prisma) => {
            const purchaseData = {
                id: purchaseId,
                supplierId: data.supplierId,
                date: moment().format(),
                storeId: data.storeId,
                discount: data.discount ?? 0,
                invoice: uuidv4(),
                payCash: data.pay ?? 0,
                total: data.total ?? 0,
                accountCashId: data.accountId, // Simpan akun kas yang digunakan
            };

            // LOGIC DEFAULT ACCOUNT
            if (!purchaseData.accountCashId) {
                const store = await prisma.stores.findUnique({
                    where: { id: data.storeId },
                    select: { defaultCashId: true },
                });
                if (store?.defaultCashId) {
                    purchaseData.accountCashId = store.defaultCashId;
                }
            }

            const createPurchase = await prisma.purchases.create({
                data: purchaseData,
            });

            // ---------------------------------------------------
            // INTEGRASI CASHFLOW (OUT)
            // ---------------------------------------------------
            // INTEGRASI CASHFLOW (OUT)
            // ---------------------------------------------------
            if (parseFloat(data.pay ?? 0) > 0 && purchaseData.accountCashId) {
                await createCashflowEntry(prisma, {
                    storeId: data.storeId,
                    kasId: purchaseData.accountCashId,
                    type: "OUT",
                    amount: parseFloat(data.pay ?? 0),
                    description: `Pembelian Supplier ${data.supplierId}`, // Bisa diganti nama supplier kalau ada
                    referenceId: createPurchase.id,
                    referenceType: "PURCHASE",
                    userCreate: res.locals.userId,
                    transactionDate: new Date(),
                });
            }

            for (const key in dataDetail) {
                const idDetail = uuidv4();
                const purchaseDetail = await prisma.purchaseDetails.create({
                    data: {
                        id: idDetail,
                        purchaseId: purchaseData.id,
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

                await prisma.hppHistory.create({
                    data: {
                        id: uuidv4(),
                        productId: key,
                        price:
                            dataDetail[key].price / (conversion?.quantity ?? 1),
                        quantity:
                            dataDetail[key].quantity *
                            (conversion?.quantity ?? 1),
                        quantityUsed: 0,
                        transactionDetailId: purchaseDetail.id,
                        storeId: data.storeId,
                    },
                });

                const increment = await IncrementStock(
                    prisma,
                    key,
                    data.storeId,
                    dataDetail[key].quantity * (conversion?.quantity ?? 1)
                );

                if (!increment.status) {
                    throw increment.message;
                }
            }

            return { createPurchase };
        });
    };

    try {
        const result = await transaction();
        res.status(200).json({
            status: true,
            message: "Successful in created Purchase data",
            data: purchaseId,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

// ... (kode komentar yang ada sebelumnya dilewati di sini)

const updateData = async (req: Request, res: Response) => {
    const data = { ...req.body };
    const dataDetail = data.detailItem;
    const purchaseId = req.params.id;

    const transaction = async () => {
        await Model.$transaction(async (prisma) => {
            // Ambil purchase lama untuk data referensi
            const existing = await prisma.purchases.findUnique({
                where: { id: purchaseId },
            });

            if (!existing) throw new Error("Purchase not found");

            // ---------------------------------------------------
            // INTEGRASI CASHFLOW (UPDATE)
            // ---------------------------------------------------
            // 1. Revert cashflow lama
            await revertCashflowByReference(
                prisma,
                purchaseId,
                "PURCHASE",
                existing.storeId ?? ""
            );

            // 2. Buat cashflow baru (jika ada pembayaran)
            let accountCashId = data.accountId ?? existing.accountCashId;

            // Logic Default Account jika tidak ada akun sama sekali
            if (!accountCashId && existing.storeId) {
                const store = await prisma.stores.findUnique({
                    where: { id: existing.storeId },
                    select: { defaultCashId: true },
                });
                if (store?.defaultCashId) {
                    accountCashId = store.defaultCashId;
                }
            }
            const payAmount = parseFloat(data.pay ?? 0);

            if (payAmount > 0 && accountCashId) {
                await createCashflowEntry(prisma, {
                    storeId: existing.storeId ?? "",
                    kasId: accountCashId,
                    type: "OUT",
                    amount: payAmount,
                    description: `Update Pembelian Supplier ${data.supplierId}`,
                    referenceId: purchaseId,
                    referenceType: "PURCHASE",
                    userCreate: res.locals.userId,
                    transactionDate: existing.date || new Date(), // Fix lint: null is not date
                });
            }

            const purchaseData = {
                supplierId: data.supplierId,
                discount: data.discount,
                payCash: data.pay ?? 0,
                total: data.total ?? 0,
                accountCashId: accountCashId, // Update akun kas
            };

            const updatePurchase = await prisma.purchases.update({
                data: purchaseData,
                where: { id: purchaseId },
            });

            for (const key in dataDetail) {
                const detail = dataDetail[key];
                const idDetail = detail.purchaseDetailId;

                const newConversion =
                    await prisma.productConversions.findUnique({
                        where: { id: detail.unitId },
                    });

                if (idDetail) {
                    const oldDetail = await prisma.purchaseDetails.findUnique({
                        where: { id: idDetail },
                        include: { productConversions: true },
                    });

                    const oldQty =
                        (Number(oldDetail?.quantity) ?? 0) *
                        (oldDetail?.productConversions?.quantity ?? 1);
                    const newQty =
                        (detail.quantity ?? 0) * (newConversion?.quantity ?? 1);

                    if (detail.quantity === 0) {
                        await prisma.purchaseDetails.delete({
                            where: { id: idDetail },
                        });
                        await prisma.hppHistory.deleteMany({
                            where: { transactionDetailId: idDetail },
                        });
                        await DecrementStock(prisma, key, data.storeId, oldQty);
                    } else {
                        await prisma.purchaseDetails.update({
                            where: { id: idDetail },
                            data: {
                                quantity: detail.quantity,
                                productConversionId: detail.unitId,
                                price: detail.price ?? 0,
                            },
                        });

                        await prisma.hppHistory.deleteMany({
                            where: { transactionDetailId: idDetail },
                        });

                        await prisma.hppHistory.create({
                            data: {
                                id: uuidv4(),
                                productId: key,
                                price:
                                    (detail.price ?? 0) /
                                    (newConversion?.quantity ?? 1),
                                quantity: newQty,
                                quantityUsed: 0,
                                storeId: updatePurchase.storeId,
                                transactionDetailId: idDetail,
                            },
                        });

                        const diff = newQty - oldQty;
                        if (diff > 0) {
                            await IncrementStock(
                                prisma,
                                key,
                                data.storeId,
                                diff
                            );
                        } else if (diff < 0) {
                            await DecrementStock(
                                prisma,
                                key,
                                data.storeId,
                                -diff
                            );
                        }
                    }
                } else {
                    const newIdDetail = uuidv4();
                    await prisma.purchaseDetails.create({
                        data: {
                            id: newIdDetail,
                            purchaseId: purchaseId,
                            productId: key,
                            productConversionId: detail.unitId,
                            quantity: detail.quantity ?? 1,
                            price: detail.price ?? 0,
                        },
                    });

                    await prisma.hppHistory.create({
                        data: {
                            id: uuidv4(),
                            productId: key,
                            price:
                                (detail.price ?? 0) /
                                (newConversion?.quantity ?? 1),
                            quantity:
                                (detail.quantity ?? 1) *
                                (newConversion?.quantity ?? 1),
                            quantityUsed: 0,
                            storeId: updatePurchase.storeId,
                            transactionDetailId: newIdDetail,
                        },
                    });

                    await IncrementStock(
                        prisma,
                        key,
                        data.storeId,
                        (detail.quantity ?? 1) * (newConversion?.quantity ?? 1)
                    );
                }
            }

            return { updatePurchase };
        });
    };

    try {
        await transaction();
        res.status(200).json({
            status: true,
            message: "Successful in updating purchase data",
            data: purchaseId,
            remainder:
                parseInt(data?.pay ?? 0) -
                (parseInt(data.subTotal ?? 0) - parseInt(data.discount ?? 0)),
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const deleteData = async (req: Request, res: Response) => {
    try {
        await Model.$transaction(async (prisma) => {
            const model = await prisma.purchases.findUnique({
                where: { id: req.params.id },
                include: { purchaseDetails: true },
            });

            if (!model) {
                throw new Error("data not found");
            }

            // ---------------------------------------------------
            // INTEGRASI CASHFLOW (DELETE)
            // ---------------------------------------------------
            await revertCashflowByReference(
                prisma,
                model.id,
                "PURCHASE",
                model.storeId ?? ""
            );

            const detail = model.purchaseDetails ?? [];

            for (const value of detail) {
                const conversion = await prisma.productConversions.findFirst({
                    where: { id: value.productConversionId ?? "" },
                });

                // Hapus HPP history yang terkait detail ini
                await prisma.hppHistory.deleteMany({
                    where: { transactionDetailId: value.id },
                });

                // Kembalikan stok sesuai konversi
                await DecrementStock(
                    prisma,
                    value.productId,
                    model.storeId ?? "",
                    Number(value.quantity) * (conversion?.quantity ?? 1)
                );
            }

            // Hapus header purchase (detail akan mengikuti kebijakan FK di DB)
            await prisma.purchases.delete({
                where: { id: req.params.id },
            });
        });

        res.status(200).json({
            status: true,
            message: "successfully deleted Purchase data",
            data: req.params.id,
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

const getDataById = async (req: Request, res: Response) => {
    try {
        const model = await Model.brands.findUnique({
            where: {
                id: req.params.id,
            },
        });

        if (!model) throw new Error("data not found");
        res.status(200).json({
            status: true,
            message: "successfully in get Brand data",
            data: {
                Brand: model,
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
        const data = await Model.brands.findMany({
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
                    title: value.name,
                },
            ];
        }
        res.status(200).json({
            status: true,
            message: "successfully in get Brand data",
            data: {
                brand: dataOption,
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
        const data = await Model.purchases.findUnique({
            where: {
                id: id ?? "",
            },
            select: {
                suppliers: {
                    select: {
                        name: true,
                        id: true,
                    },
                },
                id: true,
                date: true,
                total: true,
                payCash: true,
                purchaseDetails: {
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
            },
        });

        let newData: any = [];
        const purchaseDetails = data?.purchaseDetails ?? [];
        for (let index = 0; index < purchaseDetails.length; index++) {
            newData = [
                ...newData,
                {
                    product: purchaseDetails[index].products.name,
                    quantity: purchaseDetails[index].quantity,
                    price: purchaseDetails[index].price,
                    unit: purchaseDetails[index].productConversions?.units
                        ?.name,
                },
            ];
        }
        res.status(200).json({
            status: true,
            message: "successfully in get Brand data",
            data: {
                purchase: {
                    payCash: data?.payCash,
                    date: data?.date,
                    total: data?.total,
                    id: data?.id,
                    purchaseDetails: newData,
                },
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
        const data = await Model.purchases.findUnique({
            where: {
                id: req.params.id,
            },
            include: {
                purchaseDetails: {
                    include: {
                        products: true,
                    },
                },
            },
        });
        let newData: any = {};
        const dataDetail = data?.purchaseDetails ?? [];
        for (const value of dataDetail) {
            newData = {
                ...newData,
                [value.productId]: {
                    quantity: value.quantity,
                    unit: value.productConversionId,
                    price: value.price,
                    product: value.products,
                    purchaseId: value.purchaseId,
                    purchaseDetailId: value.id,
                },
            };
        }

        res.status(200).json({
            status: true,
            message: "Success get data purchase",
            data: {
                purchase: newData,
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
