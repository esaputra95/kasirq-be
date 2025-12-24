import Model from "#root/services/PrismaService";
import { Request, Response } from "express";
import { sales_status } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { SalesQueryInterface } from "#root/interfaces/sales/SalesInterface";
import moment from "moment";
import momentT from "moment-timezone";
import "moment/locale/id";
import formatter from "#root/helpers/formatCurrency";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import { transactionNumber } from "#root/helpers/transactionNumber";

/**
 * Helper aman untuk konversi angka
 */
const toNumber = (val: any): number => {
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
};

/**
 * GET list salePending (with pagination & filter)
 */
const getData = async (
    req: Request<{}, {}, {}, SalesQueryInterface>,
    res: Response
) => {
    try {
        const query = req.query;

        // PAGING
        const take: number = toNumber(query.limit) || 20;
        const page: number = toNumber(query.page) || 1;
        const skip: number = (page - 1) * take;

        // FILTER
        let filter: any[] = [];
        if (query.description) {
            filter.push({ description: { contains: query.description } });
        }

        const where: any = {
            status: "pending" as sales_status,
            storeId: query.storeId,
            ...(filter.length > 0 ? { OR: filter } : {}),
        };

        const data = await Model.salePending.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: {
                members: true,
                salePendingDetails: {
                    include: {
                        products: {
                            include: {
                                stocks: true,
                                productConversions: {
                                    include: {
                                        units: true,
                                        productSellPrices: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            skip,
            take,
        });

        const total = await Model.salePending.count({ where });

        res.status(200).json({
            status: true,
            message: "successful in getting sale pending data",
            data: {
                sales: data,
                info: {
                    page,
                    limit: take,
                    total,
                },
            },
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

/**
 * POST create salePending
 */
const postData = async (req: Request, res: Response) => {
    const salesId = uuidv4();
    const data = req.body;

    const transaction = async () => {
        const dataDetail = data.detailItem ?? {};

        return Model.$transaction(async (prisma) => {
            const invoice = await transactionNumber({
                storeId: data.storeId,
                module: "PENDING",
            });

            const subTotal = toNumber(data.subTotal);
            const discount = toNumber(data.discount);
            const pay = toNumber(data.pay);

            const salesData = {
                id: salesId,
                date: moment().format(),
                storeId: data.storeId,
                accountCashId: data.accountId,
                payMetodeId: data.accountId,
                memberId: data.memberId,
                invoice: invoice.invoice,
                status: "pending" as sales_status,
                subTotal,
                total: subTotal - discount,
                description: data.description,
                userCreate: res.locals.userId,
                discount,
                payCash: pay,
                transactionNumber: invoice.transactionNumber,
            };

            const createSales = await prisma.salePending.create({
                data: salesData,
            });

            for (const key in dataDetail) {
                const item = dataDetail[key];
                if (!item || toNumber(item.quantity) === 0) continue;

                await prisma.salePendingDetails.create({
                    data: {
                        id: uuidv4(),
                        saleId: salesData.id,
                        productId: key,
                        productConversionId: item.unitId,
                        quantity: toNumber(item.quantity) || 1,
                        price: toNumber(item.price),
                    },
                });
            }

            return { createSales };
        });
    };

    try {
        await transaction();

        const subTotal = toNumber(data.subTotal);
        const discount = toNumber(data.discount);
        const pay = toNumber(data.pay);
        const remainder = pay - (subTotal - discount);

        res.status(200).json({
            status: true,
            message: "Successful in created sale pending data",
            data: salesId,
            remainder,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

/**
 * PUT update salePending
 */
const updateData = async (req: Request, res: Response) => {
    try {
        const data = { ...req.body };
        const dataDetail = data.detailItem || {};
        const salesId = req.params.id;

        const updated = await Model.$transaction(async (prisma) => {
            // Pastikan salePending ada
            const exists = await prisma.salePending.findUnique({
                where: { id: salesId },
            });

            if (!exists) {
                // Akan ditangkap di catch dan dibalas 404
                throw new Error("Sale Pending not found");
            }

            const salesData = {
                supplierId: data.supplierId,
                discount: toNumber(data.discount),
                payCash: toNumber(data.pay),
                total: toNumber(data.total),
                description: data?.description,
            };

            // Update Sale
            const updatedSale = await prisma.salePending.update({
                data: salesData,
                where: { id: salesId },
            });

            // Update and Create Details
            for (const key in dataDetail) {
                const detail = dataDetail[key];
                if (!detail || toNumber(detail.quantity) === 0) continue;

                const found = await prisma.salePendingDetails.findFirst({
                    where: {
                        productId: key,
                        saleId: salesId,
                    },
                });

                if (found) {
                    await prisma.salePendingDetails.update({
                        data: {
                            quantity:
                                toNumber(found.quantity) +
                                toNumber(detail.quantity),
                        },
                        where: { id: found.id },
                    });
                } else {
                    await prisma.salePendingDetails.create({
                        data: {
                            id: uuidv4(),
                            saleId: salesId,
                            productId: key,
                            productConversionId: detail.unitId,
                            quantity: toNumber(detail.quantity) || 1,
                            price: toNumber(detail.price),
                        },
                    });
                }
            }

            return updatedSale;
        });

        // Kalau error message "Sale Pending not found"
        if (!updated) {
            return res.status(404).json({
                status: false,
                message: "Sale Pending not found",
            });
        }

        return res.status(200).json({
            status: true,
            message: "Sales transaction updated successfully",
            data: updated,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

/**
 * DELETE salePending + details
 */
const deleteData = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;

        await Model.$transaction(async (prisma) => {
            const model = await prisma.salePending.findUnique({
                where: { id },
            });

            if (!model) {
                throw new Error("sales data not found");
            }

            await prisma.salePendingDetails.deleteMany({
                where: { saleId: model.id },
            });

            await prisma.salePending.delete({ where: { id: model.id } });
        });

        res.status(200).json({
            status: true,
            message: "successfully deleted sales data",
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

/**
 * GET single sales by id (final sales, bukan pending)
 */
const getDataById = async (req: Request, res: Response) => {
    try {
        console.log("dsii");

        const model = await Model.salePending.findUnique({
            where: { id: req.params.id },
            include: {
                salePendingDetails: true,
            },
        });

        if (!model) {
            return res.status(404).json({
                status: false,
                message: "data not found",
            });
        }

        res.status(200).json({
            status: true,
            message: "successfully in get sales data",
            data: {
                sales: model,
            },
        });
    } catch (error) {
        console.log({ error });

        handleErrorMessage(res, error);
    }
};

/**
 * GET select data (for dropdown, etc)
 */
const getSelect = async (req: Request, res: Response) => {
    try {
        let filter: any = {};
        if (req.query.name) {
            filter = {
                ...filter,
                name: { contains: req.query?.name as string },
            };
        }

        let dataOption: any[] = [];
        const data = await Model.sales.findMany({
            where: { ...filter },
            take: 10,
        });

        for (const value of data) {
            dataOption.push({
                id: value.id,
                title: value.date,
            });
        }

        res.status(200).json({
            status: true,
            message: "successfully in get sales data",
            data: {
                sales: dataOption,
            },
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

/**
 * GET facture / nota
 */
const getFacture = async (req: Request, res: Response) => {
    try {
        const id = req.query.id as string;
        const storeId = req.query.storeId as string;

        const data = await Model.sales.findUnique({
            where: { id: id ?? "" },
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
                    select: { name: true },
                },
                saleDetails: {
                    select: {
                        id: true,
                        quantity: true,
                        price: true,
                        productConversions: {
                            select: {
                                id: true,
                                units: { select: { name: true } },
                            },
                        },
                        products: { select: { name: true } },
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

        if (!data) {
            return res.status(404).json({
                status: false,
                message: "sales data not found",
            });
        }

        const store = await Model.stores.findUnique({
            where: { id: storeId },
            select: {
                name: true,
                address: true,
            },
        });

        let newData: any[] = [];
        const salesDetails = data.saleDetails ?? [];

        for (let index = 0; index < salesDetails.length; index++) {
            const d = salesDetails[index];
            newData.push({
                product: d.products.name,
                quantity: formatter.format(toNumber(d.quantity)),
                price: formatter.format(toNumber(d.price)),
                unit: d.productConversions?.units?.name,
            });
        }

        const payCash = toNumber(data.payCash);
        const subTotal = toNumber(data.subTotal);
        const discount = toNumber(data.discount);

        const totalBelanja = subTotal - discount;
        const selisih = payCash - totalBelanja;

        res.status(200).json({
            status: true,
            message: "successfully in get sales data",
            data: {
                sales: {
                    date:
                        moment(data.date).format("DD/MM/YYYY") +
                        " " +
                        momentT(data.createdAt)
                            .tz("Asia/Jakarta")
                            .format("HH:mm"),
                    total: formatter.format(toNumber(totalBelanja)),
                    subTotal: formatter.format(toNumber(subTotal)),
                    discount: formatter.format(toNumber(discount)),
                    payCash: formatter.format(toNumber(payCash)),
                    change: formatter.format(toNumber(selisih)),
                    id: data.id,
                    user: data.users?.name,
                    member: data.members?.name ?? "Umum",
                    paymentMethod: data.paymentMethod?.name ?? "Cash",
                    invoice: data.invoice,
                    salesDetails: newData,
                    description: data.description ?? "",
                },
                store,
            },
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

/**
 * GET data untuk update (final sales)
 */
const getDataUpdate = async (req: Request, res: Response) => {
    try {
        const data = await Model.sales.findUnique({
            where: { id: req.params.id },
            include: {
                saleDetails: {
                    include: {
                        products: true,
                    },
                },
            },
        });

        if (!data) {
            return res.status(404).json({
                status: false,
                message: "sales data not found",
            });
        }

        let newData: any = {};
        const dataDetail = data.saleDetails ?? [];

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
                    pay: data.payCash,
                    discount: data.discount,
                    memberId: data.memberId,
                },
                saleDetail: newData,
                id: req.params.id,
            },
        });
    } catch (error) {
        handleErrorMessage(res, error);
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
