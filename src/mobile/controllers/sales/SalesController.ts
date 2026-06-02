import Model from "#root/services/PrismaService";
import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { handleValidationError } from "#root/helpers/handleValidationError";
import { v4 as uuidv4 } from "uuid";
import { SalesQueryInterface } from "#root/interfaces/sales/SalesInterface";
import moment from "moment";
import momentT from "moment-timezone";
import { DecrementStock, GetHpp, IncrementStock } from "#root/helpers/stock";
import formatter from "#root/helpers/formatCurrency";
import {
    handleErrorMessage,
    ValidationError,
} from "#root/helpers/handleErrors";
import { transactionNumber } from "#root/helpers/transactionNumber";
import { assertStoreCanTransact } from "#root/helpers/assertStoreCanTransact";

const getData = async (
    req: Request<{}, {}, {}, SalesQueryInterface>,
    res: Response,
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
            ? (filter = [...filter, { invoice: { contains: query.invoice } }])
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

import {
    createCashflowEntry,
    revertCashflowByReference,
} from "#root/mobile/services/accountancy/CashflowService";
import { Decimal } from "@prisma/client/runtime/library";

type NormalizedPayment = {
    accountId: string;
    accountName: string;
    accountType: string;
    amount: number;
    changeAmount: number;
    paymentRef?: string;
    note?: string;
};

const toNumber = (value: unknown): number => {
    const parsed = parseFloat(`${value ?? 0}`);
    return Number.isFinite(parsed) ? parsed : 0;
};

const isCashAccount = (account: {
    type?: string | null;
    name?: string | null;
}) => {
    const type = `${account.type ?? ""}`.toUpperCase();
    const name = `${account.name ?? ""}`.toLowerCase();
    return type === "CASH" || name.includes("cash") || name.includes("tunai");
};

const getDefaultAccountId = async (prisma: any, storeId: string) => {
    const store = await prisma.stores.findUnique({
        where: { id: storeId },
        select: { defaultCashId: true },
    });
    return store?.defaultCashId ?? "";
};

const normalizeSalePayments = async (
    prisma: any,
    data: {
        storeId: string;
        payments?: Array<{
            accountId?: string;
            amount?: number | string;
            paymentRef?: string;
            note?: string;
        }>;
        accountId?: string;
        pay?: number | string;
        grandTotal: number;
        allowPartial?: boolean;
    },
): Promise<{
    payments: NormalizedPayment[];
    totalPaid: number;
    totalChange: number;
}> => {
    const defaultAccountId =
        data.accountId || (await getDefaultAccountId(prisma, data.storeId));
    const rawPayments: Array<{
        accountId?: string;
        amount?: number | string;
        paymentRef?: string;
        note?: string;
    }> =
        Array.isArray(data.payments) && data.payments.length > 0
            ? data.payments
            : [
                  {
                      accountId: defaultAccountId,
                      amount: data.pay || data.grandTotal,
                  },
              ];

    const grouped = new Map<
        string,
        {
            accountId: string;
            amount: number;
            paymentRef?: string;
            note?: string;
        }
    >();

    for (const payment of rawPayments) {
        const accountId = payment.accountId || defaultAccountId;
        const amount = toNumber(payment.amount);

        if (!accountId) {
            throw new ValidationError(
                "Metode pembayaran wajib dipilih",
                400,
                "payments",
            );
        }

        if (amount <= 0) {
            throw new ValidationError(
                "Nominal pembayaran harus lebih dari 0",
                400,
                "payments",
            );
        }

        const existing = grouped.get(accountId);
        grouped.set(accountId, {
            accountId,
            amount: (existing?.amount ?? 0) + amount,
            paymentRef: payment.paymentRef ?? existing?.paymentRef,
            note: payment.note ?? existing?.note,
        });
    }

    const accountIds = [...grouped.keys()];

    const accounts = await prisma.account.findMany({
        where: {
            id: { in: accountIds },
            deletedAt: null,
        },
        select: {
            id: true,
            name: true,
            type: true,
            storeId: true,
        },
    });

    if (accounts.length !== accountIds.length) {
        throw new ValidationError(
            "Metode pembayaran tidak ditemukan",
            404,
            "payments",
        );
    }

    const accountById = new Map<
        string,
        {
            id: string;
            name: string | null;
            type: string | null;
            storeId: string | null;
        }
    >(accounts.map((account: any) => [account.id, account]));
    const payments: NormalizedPayment[] = [];

    for (const groupedPayment of grouped.values()) {
        const account = accountById.get(groupedPayment.accountId);
        if (account?.storeId && account.storeId !== data.storeId) {
            throw new ValidationError(
                "Metode pembayaran tidak sesuai toko",
                400,
                "payments",
            );
        }

        payments.push({
            accountId: groupedPayment.accountId,
            accountName: account?.name ?? "Pembayaran",
            accountType: account?.type ?? "",
            amount: groupedPayment.amount,
            changeAmount: 0,
            paymentRef: groupedPayment.paymentRef,
            note: groupedPayment.note,
        });
    }

    const totalPaid = payments.reduce(
        (sum, payment) => sum + payment.amount,
        0,
    );
    const roundedGrandTotal = Math.max(data.grandTotal, 0);

    if (!data.allowPartial && totalPaid < roundedGrandTotal) {
        throw new ValidationError("Pembayaran masih kurang", 400, "pay");
    }

    let remainingChange = Math.max(totalPaid - roundedGrandTotal, 0);
    const cashPayments = payments.filter((payment) =>
        isCashAccount({
            type: payment.accountType,
            name: payment.accountName,
        }),
    );
    const totalCash = cashPayments.reduce(
        (sum, payment) => sum + payment.amount,
        0,
    );

    if (remainingChange > 0 && totalCash < remainingChange) {
        throw new ValidationError(
            "Kembalian hanya dapat diambil dari pembayaran tunai",
            400,
            "payments",
        );
    }

    for (
        let index = payments.length - 1;
        index >= 0 && remainingChange > 0;
        index--
    ) {
        const payment = payments[index];
        if (
            !isCashAccount({
                type: payment.accountType,
                name: payment.accountName,
            })
        ) {
            continue;
        }

        const changeForPayment = Math.min(payment.amount, remainingChange);
        payment.changeAmount = changeForPayment;
        remainingChange -= changeForPayment;
    }

    return {
        payments,
        totalPaid,
        totalChange: totalPaid - roundedGrandTotal,
    };
};

const createSalePaymentsAndCashflows = async (
    prisma: any,
    data: {
        saleId?: string;
        salePendingId?: string;
        splitBillId?: string;
        storeId: string;
        invoice?: string | null;
        payments: NormalizedPayment[];
        userCreate?: string;
        transactionDate?: Date;
        descriptionPrefix?: string;
        referenceId?: string;
        referenceType?: string;
    },
) => {
    for (const payment of data.payments) {
        await prisma.salePayments.create({
            data: {
                id: uuidv4(),
                saleId: data.saleId || undefined,
                salePendingId: data.salePendingId,
                splitBillId: data.splitBillId,
                storeId: data.storeId,
                accountId: payment.accountId,
                amount: new Decimal(payment.amount),
                changeAmount: new Decimal(payment.changeAmount),
                paymentRef: payment.paymentRef,
                note: payment.note,
                userCreate: data.userCreate,
            },
        });

        const cashflowAmount = payment.amount - payment.changeAmount;
        if (cashflowAmount > 0) {
            await createCashflowEntry(prisma, {
                storeId: data.storeId,
                kasId: payment.accountId,
                type: "IN",
                amount: cashflowAmount,
                description: `${data.descriptionPrefix ?? "Penjualan"} Invoice #${
                    data.invoice ?? data.saleId
                }`,
                referenceId: data.referenceId ?? data.saleId,
                referenceType: data.referenceType ?? "SALE",
                userCreate: data.userCreate,
                transactionDate: data.transactionDate ?? new Date(),
            });
        }
    }
};

const postData = async (req: Request, res: Response) => {
    const salesId = uuidv4();
    const data = req.body;

    const transaction = async () => {
        const dataDetail = data.detailItem ?? [];
        // Start transaction
        return Model.$transaction(async (prisma) => {
            await assertStoreCanTransact(prisma, data.storeId);

            const invoice = await transactionNumber({
                storeId: data.storeId,
                module: "SALE",
            });
            const grandTotal =
                toNumber(data.subTotal) - toNumber(data.discount);
            const hasPendingSplitBills = data.salePendingId
                ? (await prisma.saleSplitBills.count({
                      where: {
                          salePendingId: data.salePendingId,
                          deletedAt: null,
                      },
                  })) > 0
                : false;
            const pendingPaymentTotal = hasPendingSplitBills
                ? await prisma.salePayments.aggregate({
                      _sum: {
                          amount: true,
                          changeAmount: true,
                      },
                      where: {
                          salePendingId: data.salePendingId,
                          deletedAt: null,
                      },
                  })
                : null;
            const normalizedPayments = await normalizeSalePayments(prisma, {
                storeId: data.storeId,
                payments: data.payments,
                accountId: data.accountId,
                pay: data.pay,
                grandTotal,
                allowPartial: hasPendingSplitBills,
            });
            const transferredPendingPaid =
                toNumber(pendingPaymentTotal?._sum.amount) -
                toNumber(pendingPaymentTotal?._sum.changeAmount);
            const primaryPayment = normalizedPayments.payments[0];
            const salesData: Prisma.salesUncheckedCreateInput = {
                salePeopleId: data.salePeopleId,
                id: salesId,
                date: moment().format(),
                storeId: data.storeId,
                accountCashId: primaryPayment.accountId,
                payMetodeId: primaryPayment.accountId,
                memberId: data.memberId,
                invoice: invoice.invoice,
                subTotal: toNumber(data.subTotal),
                total: grandTotal,
                description: data.description,
                userCreate: res.locals.userId,
                discount: toNumber(data.discount),
                payCash: hasPendingSplitBills
                    ? transferredPendingPaid
                    : normalizedPayments.totalPaid,
                transactionNumber: invoice.transactionNumber,
            };

            const createSales = await prisma.sales.create({
                data: salesData,
            });

            if (hasPendingSplitBills && data.salePendingId) {
                await prisma.saleSplitBills.updateMany({
                    where: { salePendingId: data.salePendingId },
                    data: { saleId: createSales.id },
                });
                await prisma.salePayments.updateMany({
                    where: { salePendingId: data.salePendingId },
                    data: { saleId: createSales.id },
                });
                await prisma.cashflow.updateMany({
                    where: {
                        referenceId: data.salePendingId,
                        referenceType: "SALE_PENDING",
                        deletedAt: null,
                    },
                    data: {
                        referenceId: createSales.id,
                        referenceType: "SALE",
                    },
                });
            } else {
                await createSalePaymentsAndCashflows(prisma, {
                    saleId: createSales.id,
                    storeId: data.storeId,
                    invoice: invoice.invoice,
                    payments: normalizedPayments.payments,
                    userCreate: res.locals.userId,
                    transactionDate: new Date(),
                    descriptionPrefix: "Penjualan",
                });
            }

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

            for (const rawKey in dataDetail) {
                const productId = rawKey.includes("_")
                    ? rawKey.split("_")[0]
                    : rawKey;

                if (dataDetail[rawKey].quantity === 0) continue;
                const idDetail = uuidv4();

                // Get product info to check type
                const product = await prisma.products.findUnique({
                    where: { id: productId },
                    select: { type: true, isStock: true },
                });

                await prisma.saleDetails.create({
                    data: {
                        id: idDetail,
                        saleId: salesData.id,
                        productId: productId,
                        productConversionId: dataDetail[rawKey].unitId,
                        quantity: dataDetail[rawKey].quantity ?? 1,
                        price: dataDetail[rawKey].price ?? 0,
                    },
                });

                const conversion = await prisma.productConversions.findFirst({
                    where: {
                        id: dataDetail[rawKey].unitId,
                    },
                });

                if (!conversion) {
                    throw new Error(
                        `Konversi produk dengan ID ${dataDetail[rawKey].unitId} tidak ditemukan`,
                    );
                }

                const saleQuantity = dataDetail[rawKey].quantity ?? 1;
                const baseQuantity = saleQuantity * (conversion?.quantity ?? 1);

                // Handle package and formula type products
                if (
                    product?.type === "package" ||
                    product?.type === "formula"
                ) {
                    // Get product components
                    const components = await prisma.productComponents.findMany({
                        where: {
                            productId: productId,
                            status: 1,
                            // type: product.type as "package" | "formula",
                        },
                        include: {
                            component: {
                                select: { id: true, isStock: true },
                            },
                            conversion: {
                                select: { quantity: true },
                            },
                        },
                    });

                    // Process each component
                    for (const comp of components) {
                        // Calculate component quantity: saleQty * componentQty * conversionQty
                        const componentConversionQty =
                            comp.conversion?.quantity ?? 1;
                        const componentQtyNeeded =
                            saleQuantity *
                            comp.quantity *
                            componentConversionQty;

                        // Decrement stock for component (if it tracks stock)
                        if (comp.component?.isStock) {
                            const decrement = await DecrementStock(
                                prisma,
                                comp.componentId,
                                data.storeId,
                                componentQtyNeeded,
                            );

                            if (!decrement.status) {
                                throw new ValidationError(
                                    JSON.stringify(decrement.message),
                                    400,
                                    "quantity",
                                );
                            }
                        }

                        // Get HPP for component
                        const hpp = await GetHpp({
                            prisma,
                            storeId: data.storeId,
                            quantityNeed: componentQtyNeeded,
                            productId: comp.componentId,
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
                } else {
                    // Handle regular product (existing logic)
                    const decrement = await DecrementStock(
                        prisma,
                        productId,
                        data.storeId,
                        baseQuantity,
                    );

                    if (!decrement.status) {
                        throw new ValidationError(
                            JSON.stringify(decrement.message),
                            400,
                            "quantity",
                        );
                    }

                    const hpp = await GetHpp({
                        prisma,
                        storeId: data.storeId,
                        quantityNeed: baseQuantity,
                        productId: productId,
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
                toNumber(data?.pay) -
                (toNumber(data.subTotal) - toNumber(data.discount)),
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
                include: {
                    saleDetails: {
                        include: {
                            products: {
                                select: {
                                    type: true,
                                    isStock: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!existing) throw new Error("sales data not found");

            await assertStoreCanTransact(prisma, existing.storeId);

            await revertCashflowByReference(
                prisma,
                salesId,
                "SALE",
                existing.storeId ?? "",
            );
            await prisma.salePayments.deleteMany({
                where: { saleId: salesId },
            });

            const grandTotal =
                toNumber(body.subTotal) - toNumber(body.discount);
            const normalizedPayments = await normalizeSalePayments(prisma, {
                storeId: existing.storeId ?? "",
                payments: body.payments,
                accountId: body.accountId ?? existing.accountCashId ?? "",
                pay: body.pay,
                grandTotal,
            });
            const primaryPayment = normalizedPayments.payments[0];

            await createSalePaymentsAndCashflows(prisma, {
                saleId: salesId,
                storeId: existing.storeId ?? "",
                invoice: existing.invoice,
                payments: normalizedPayments.payments,
                userCreate: res.locals.userId,
                transactionDate: existing.createdAt || new Date(),
                descriptionPrefix: "Update Penjualan",
            });

            // --- Update header (totals) ---
            const headerUpdate = {
                discount: toNumber(body.discount),
                payCash: normalizedPayments.totalPaid,
                subTotal: toNumber(body.subTotal),
                total: grandTotal,
                memberId: body.memberId ?? existing.memberId,
                description: body.description ?? existing.description,
                accountCashId: primaryPayment.accountId,
                payMetodeId: primaryPayment.accountId,
            } as const;

            await prisma.sales.update({
                where: { id: salesId },
                data: headerUpdate,
            });

            // Index detail lama by id untuk memudahkan rekonsiliasi
            const existingById = new Map(
                (existing.saleDetails ?? []).map((d) => [d.id, d]),
            );

            // Helper: hitung qty basis stok (konversi)
            const getBaseQty = async (
                conversionId: string | null,
                qty: Prisma.Decimal | number,
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
                            prev.quantity ?? 0,
                        );

                        const inc = await IncrementStock(
                            prisma,
                            prev.productId,
                            existing.storeId ?? "",
                            prevBase,
                        );
                        if (!inc.status) {
                            throw new Error(
                                typeof inc.message === "string"
                                    ? inc.message
                                    : JSON.stringify(inc.message),
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
                        item.quantity ?? 0,
                    );
                    const oldBase = await getBaseQty(
                        prev.productConversionId,
                        prev.quantity ?? 0,
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

                    if (diff !== 0) {
                        const product = prev.products;
                        if (
                            product?.type === "package" ||
                            product?.type === "formula"
                        ) {
                            const components =
                                await prisma.productComponents.findMany({
                                    where: {
                                        productId,
                                        status: 1,
                                        type: product.type as
                                            | "package"
                                            | "formula",
                                    },
                                    include: {
                                        component: {
                                            select: { id: true, isStock: true },
                                        },
                                        conversion: {
                                            select: { quantity: true },
                                        },
                                    },
                                });

                            for (const comp of components) {
                                const compConversionQty =
                                    comp.conversion?.quantity ?? 1;
                                const compDiffQty =
                                    diff * comp.quantity * compConversionQty;

                                if (compDiffQty > 0) {
                                    const dec = await DecrementStock(
                                        prisma,
                                        comp.componentId,
                                        existing.storeId ?? "",
                                        compDiffQty,
                                    );
                                    if (!dec.status)
                                        throw new Error(
                                            JSON.stringify(dec.message),
                                        );
                                } else if (compDiffQty < 0) {
                                    const inc = await IncrementStock(
                                        prisma,
                                        comp.componentId,
                                        existing.storeId ?? "",
                                        Math.abs(compDiffQty),
                                    );
                                    if (!inc.status)
                                        throw new Error(
                                            JSON.stringify(inc.message),
                                        );
                                }
                            }
                        } else if (product?.isStock) {
                            if (diff > 0) {
                                const dec = await DecrementStock(
                                    prisma,
                                    productId,
                                    existing.storeId ?? "",
                                    diff,
                                );
                                if (!dec.status) {
                                    throw new ValidationError(
                                        JSON.stringify(dec.message),
                                        400,
                                        "quantity",
                                    );
                                }
                            } else if (diff < 0) {
                                const inc = await IncrementStock(
                                    prisma,
                                    productId,
                                    existing.storeId ?? "",
                                    Math.abs(diff),
                                );
                                if (!inc.status) {
                                    throw new Error(
                                        typeof inc.message === "string"
                                            ? inc.message
                                            : JSON.stringify(inc.message),
                                    );
                                }
                            }
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
                        item.quantity ?? 0,
                    );

                    // Get product info to check type
                    const product = await prisma.products.findUnique({
                        where: { id: productId },
                        select: { type: true, isStock: true },
                    });

                    if (
                        product?.type === "package" ||
                        product?.type === "formula"
                    ) {
                        const components =
                            await prisma.productComponents.findMany({
                                where: {
                                    productId,
                                    status: 1,
                                    type: product.type as "package" | "formula",
                                },
                                include: {
                                    component: {
                                        select: { id: true, isStock: true },
                                    },
                                    conversion: { select: { quantity: true } },
                                },
                            });

                        for (const comp of components) {
                            const compConversionQty =
                                comp.conversion?.quantity ?? 1;
                            const compQtyNeeded =
                                (item.quantity ?? 1) *
                                comp.quantity *
                                compConversionQty;

                            if (comp.component?.isStock) {
                                const dec = await DecrementStock(
                                    prisma,
                                    comp.componentId,
                                    existing.storeId ?? "",
                                    compQtyNeeded,
                                );
                                if (!dec.status)
                                    throw new Error(
                                        JSON.stringify(dec.message),
                                    );
                            }

                            // Get HPP for component and record COGS
                            const hpp = await GetHpp({
                                prisma,
                                storeId: existing.storeId ?? "",
                                quantityNeed: compQtyNeeded,
                                productId: comp.componentId,
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
                                        where: { id: value.hppHistoryId },
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
                    } else {
                        if (product?.isStock) {
                            const dec = await DecrementStock(
                                prisma,
                                productId,
                                existing.storeId ?? "",
                                base,
                            );
                            if (!dec.status) {
                                throw new ValidationError(
                                    JSON.stringify(dec.message),
                                    400,
                                    "quantity",
                                );
                            }
                        }

                        // Record COGS for regular product
                        const hpp = await GetHpp({
                            prisma,
                            storeId: existing.storeId ?? "",
                            quantityNeed: base,
                            productId,
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
                                    where: { id: value.hppHistoryId },
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
                }
            }

            // Sisa detail lama yang tidak ada lagi di input => hapus & kembalikan stok
            for (const leftover of existingById.values()) {
                const base = await getBaseQty(
                    leftover.productConversionId,
                    leftover.quantity ?? 1,
                );

                const product = leftover.products;
                if (
                    product?.type === "package" ||
                    product?.type === "formula"
                ) {
                    const components = await prisma.productComponents.findMany({
                        where: {
                            productId: leftover.productId,
                            status: 1,
                            type: product.type as "package" | "formula",
                        },
                        include: {
                            component: { select: { id: true, isStock: true } },
                            conversion: { select: { quantity: true } },
                        },
                    });

                    for (const comp of components) {
                        const compConversionQty =
                            comp.conversion?.quantity ?? 1;
                        const compQtyToReturn =
                            Number(leftover.quantity) *
                            comp.quantity *
                            compConversionQty;

                        if (comp.component?.isStock) {
                            await IncrementStock(
                                prisma,
                                comp.componentId,
                                existing.storeId ?? "",
                                compQtyToReturn,
                            );
                        }
                    }
                } else if (product?.isStock) {
                    const inc = await IncrementStock(
                        prisma,
                        leftover.productId,
                        existing.storeId ?? "",
                        base,
                    );
                    if (!inc.status) {
                        throw new Error(
                            typeof inc.message === "string"
                                ? inc.message
                                : JSON.stringify(inc.message),
                        );
                    }
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
            data: salesId,
            remainder:
                toNumber(body?.pay) -
                (toNumber(body.subTotal) - toNumber(body.discount)),
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
                select: {
                    id: true,
                    storeId: true,
                    saleDetails: {
                        select: {
                            id: true,
                            quantity: true,
                            productConversionId: true,
                            productId: true,
                            products: {
                                select: {
                                    isStock: true,
                                    type: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!model) {
                throw new Error("sales data not found");
            }

            // ---------------------------------------------------
            // INTEGRASI CASHFLOW (DELETE)
            // ---------------------------------------------------
            await revertCashflowByReference(
                prisma,
                model.id,
                "SALE",
                model.storeId ?? "",
            );
            await prisma.salePayments.deleteMany({
                where: { saleId: model.id },
            });

            // Kembalikan stok untuk tiap detail berdasarkan konversi unit
            for (const value of model.saleDetails) {
                const conversion = await prisma.productConversions.findFirst({
                    where: { id: value.productConversionId ?? "" },
                    select: { quantity: true },
                });

                const qtyBase =
                    Number(value.quantity) * Number(conversion?.quantity ?? 1);

                const product = value.products;
                if (
                    product?.type === "package" ||
                    product?.type === "formula"
                ) {
                    const components = await prisma.productComponents.findMany({
                        where: {
                            productId: value.productId,
                            status: 1,
                            type: product.type as "package" | "formula",
                        },
                        include: {
                            component: { select: { id: true, isStock: true } },
                            conversion: { select: { quantity: true } },
                        },
                    });

                    for (const comp of components) {
                        const compConversionQty =
                            comp.conversion?.quantity ?? 1;
                        const compQtyToReturn =
                            Number(value.quantity) *
                            comp.quantity *
                            compConversionQty;

                        if (comp.component?.isStock) {
                            await IncrementStock(
                                prisma,
                                comp.componentId,
                                model.storeId ?? "",
                                compQtyToReturn,
                            );
                        }
                    }
                } else if (product?.isStock) {
                    const inc = await IncrementStock(
                        prisma,
                        value.productId,
                        model.storeId ?? "",
                        qtyBase,
                    );
                    if (!inc.status) {
                        // Jika helper mengembalikan status false, hentikan transaksi
                        throw new Error(
                            typeof inc.message === "string"
                                ? inc.message
                                : JSON.stringify(inc.message),
                        );
                    }
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
                members: {
                    select: {
                        name: true,
                        address: true,
                        phone: true,
                    },
                },
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
                salePayments: {
                    where: {
                        deletedAt: null,
                    },
                    select: {
                        id: true,
                        accountId: true,
                        amount: true,
                        changeAmount: true,
                        paymentRef: true,
                        note: true,
                        account: {
                            select: {
                                id: true,
                                name: true,
                                type: true,
                            },
                        },
                    },
                },
                salePeoples: {
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
                image: true,
                phone: true,
            },
        });

        let newData: any = [];
        const salesDetails = data?.saleDetails ?? [];
        for (let index = 0; index < salesDetails.length; index++) {
            newData = [
                ...newData,
                {
                    product: salesDetails[index].products?.name,
                    quantity: formatter.format(
                        parseInt(salesDetails[index].quantity + "") ?? 0,
                    ),
                    price: formatter.format(
                        parseInt(salesDetails[index].price + "") ?? 0,
                    ),
                    unit: salesDetails[index].productConversions?.units?.name,
                },
            ];
        }
        const payCash = Number(data?.payCash ?? 0); // uang dibayar
        const subTotal = Number(data?.subTotal ?? 0); // total sebelum diskon
        const discount = Number(data?.discount ?? 0); // diskon

        const totalBelanja = subTotal - discount; // total akhir
        const salePayments = data?.salePayments ?? [];
        const totalPaymentAmount =
            salePayments.length > 0
                ? salePayments.reduce(
                      (sum, payment) => sum + Number(payment.amount ?? 0),
                      0,
                  )
                : payCash;
        const totalChangeAmount =
            salePayments.length > 0
                ? salePayments.reduce(
                      (sum, payment) => sum + Number(payment.changeAmount ?? 0),
                      0,
                  )
                : Math.max(payCash - totalBelanja, 0);
        const paymentMethodLabel =
            salePayments.length > 0
                ? salePayments
                      .map((payment) => payment.account?.name)
                      .filter(Boolean)
                      .join(" + ")
                : (data?.paymentMethod?.name ?? "Cash");
        const payments = salePayments.map((payment) => ({
            id: payment.id,
            accountId: payment.accountId,
            name: payment.account?.name ?? "Pembayaran",
            type: payment.account?.type,
            amount: formatter.format(parseInt(`${payment.amount ?? 0}`)),
            changeAmount: formatter.format(
                parseInt(`${payment.changeAmount ?? 0}`),
            ),
            paymentRef: payment.paymentRef,
            note: payment.note,
        }));
        const selisih = totalChangeAmount; // kembalian
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
                    payCash: formatter.format(
                        parseInt(totalPaymentAmount + "") ?? 0,
                    ),
                    change: formatter.format(parseInt(selisih + "") ?? 0),
                    id: data?.id,
                    user: data?.users?.name,
                    member: data?.members?.name ?? "Umum",
                    members: data?.members,
                    paymentMethod: paymentMethodLabel || "Cash",
                    payments,
                    invoice: data?.invoice,
                    salesDetails: newData,
                    description: data?.description ?? "",
                    salePeople: data?.salePeoples?.name,
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

const getSplitBillFacture = async (req: Request, res: Response) => {
    try {
        const splitBillId = req.params.splitBillId;
        const transactionId = req.params.id;
        const storeId = req.query.storeId as string;

        const splitBill = await Model.saleSplitBills.findUnique({
            where: { id: splitBillId },
            include: {
                sale: {
                    select: {
                        id: true,
                        date: true,
                        invoice: true,
                        description: true,
                        createdAt: true,
                        members: {
                            select: {
                                name: true,
                                address: true,
                                phone: true,
                            },
                        },
                        users: {
                            select: { name: true },
                        },
                    },
                },
                salePending: {
                    select: {
                        id: true,
                        date: true,
                        invoice: true,
                        description: true,
                        createdAt: true,
                        name: true,
                        phone: true,
                        address: true,
                        members: {
                            select: {
                                name: true,
                                address: true,
                                phone: true,
                            },
                        },
                        users: {
                            select: { name: true },
                        },
                    },
                },
                payments: {
                    where: { deletedAt: null },
                    include: {
                        account: {
                            select: {
                                id: true,
                                name: true,
                                type: true,
                            },
                        },
                    },
                },
                items: {
                    where: { deletedAt: null },
                    include: {
                        products: {
                            select: { name: true },
                        },
                        productConversions: {
                            select: {
                                units: {
                                    select: { name: true },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!splitBill || splitBill.deletedAt) {
            return res.status(404).json({
                status: false,
                message: "Split bill tidak ditemukan",
            });
        }

        const belongsToTransaction =
            splitBill.saleId === transactionId ||
            splitBill.salePendingId === transactionId;
        if (!belongsToTransaction) {
            return res.status(404).json({
                status: false,
                message: "Split bill tidak ditemukan",
            });
        }

        const store = await Model.stores.findUnique({
            where: { id: storeId || splitBill.storeId },
            select: {
                name: true,
                address: true,
                image: true,
                phone: true,
            },
        });

        const source = splitBill.sale ?? splitBill.salePending;
        const member =
            splitBill.sale?.members ??
            splitBill.salePending?.members ??
            (splitBill.salePending
                ? {
                      name: splitBill.salePending.name,
                      phone: splitBill.salePending.phone,
                      address: splitBill.salePending.address,
                  }
                : null);
        const total = Number(splitBill.total ?? 0);
        const paidAmount = splitBill.payments.reduce(
            (sum, payment) => sum + Number(payment.amount ?? 0),
            0,
        );
        const changeAmount = splitBill.payments.reduce(
            (sum, payment) => sum + Number(payment.changeAmount ?? 0),
            0,
        );
        const paymentMethodLabel =
            splitBill.payments.length > 0
                ? splitBill.payments
                      .map((payment) => payment.account?.name)
                      .filter(Boolean)
                      .join(" + ")
                : "Belum Dibayar";
        const payments = splitBill.payments.map((payment) => ({
            id: payment.id,
            accountId: payment.accountId,
            name: payment.account?.name ?? "Pembayaran",
            type: payment.account?.type,
            amount: formatter.format(parseInt(`${payment.amount ?? 0}`)),
            changeAmount: formatter.format(
                parseInt(`${payment.changeAmount ?? 0}`),
            ),
            paymentRef: payment.paymentRef,
            note: payment.note,
        }));

        const splitItems =
            splitBill.items.length > 0
                ? splitBill.items.map((item) => ({
                      product: item.products?.name ?? "Produk",
                      quantity: formatter.format(
                          parseInt(`${item.quantity ?? 0}`),
                      ),
                      price: formatter.format(parseInt(`${item.price ?? 0}`)),
                      unit:
                          item.productConversions?.units?.name ??
                          "Item",
                  }))
                : [
                      {
                          product: splitBill.name ?? "Split Bill",
                          quantity: "1",
                          price: formatter.format(parseInt(`${total}`)),
                          unit: "Tagihan",
                      },
                  ];

        res.status(200).json({
            status: true,
            message: "successfully in get split bill facture",
            data: {
                sales: {
                    date:
                        moment(source?.date ?? splitBill.createdAt).format(
                            "DD/MM/YYYY",
                        ) +
                        " " +
                        momentT(source?.createdAt ?? splitBill.createdAt)
                            .tz("Asia/Jakarta")
                            .format("HH:mm"),
                    total: formatter.format(parseInt(`${total}`)),
                    subTotal: formatter.format(parseInt(`${total}`)),
                    discount: formatter.format(
                        parseInt(`${splitBill.discount ?? 0}`),
                    ),
                    payCash: formatter.format(parseInt(`${paidAmount}`)),
                    change: formatter.format(parseInt(`${changeAmount}`)),
                    id: splitBill.id,
                    user: source?.users?.name,
                    member: member?.name ?? "Umum",
                    members: member,
                    paymentMethod: paymentMethodLabel,
                    payments,
                    invoice: `${source?.invoice ?? "SPLIT"}-${
                        splitBill.name ?? splitBill.id
                    }`,
                    salesDetails: splitItems,
                    description: `Split Bill ${splitBill.name ?? ""} (${
                        splitBill.status
                    })`,
                    splitBill: {
                        id: splitBill.id,
                        name: splitBill.name,
                        status: splitBill.status,
                        mode: splitBill.mode,
                    },
                },
                store,
            },
        });
    } catch (error) {
        handleErrorMessage(res, error);
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

const getSaleForSplit = async (prisma: any, saleId: string) => {
    const sale = await prisma.sales.findUnique({
        where: { id: saleId },
        select: {
            id: true,
            storeId: true,
            invoice: true,
            subTotal: true,
            discount: true,
            total: true,
            status: true,
            saleSplitBills: {
                where: { deletedAt: null },
                select: {
                    id: true,
                    mode: true,
                    items: {
                        where: { deletedAt: null },
                        select: {
                            productId: true,
                            productConversionId: true,
                            quantity: true,
                        },
                    },
                },
            },
            saleDetails: {
                where: { deletedAt: null },
                select: {
                    id: true,
                    productId: true,
                    productConversionId: true,
                    quantity: true,
                    price: true,
                    total: true,
                    products: {
                        select: { name: true },
                    },
                    productConversions: {
                        select: {
                            units: {
                                select: { name: true },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!sale) {
        throw new ValidationError("Sales data not found", 404, "sale");
    }

    if (!sale.storeId) {
        throw new ValidationError(
            "Store transaksi tidak ditemukan",
            400,
            "store",
        );
    }

    return sale;
};

const getSalePendingForSplit = async (prisma: any, salePendingId: string) => {
    const salePending = await prisma.salePending.findUnique({
        where: { id: salePendingId },
        select: {
            id: true,
            storeId: true,
            invoice: true,
            subTotal: true,
            discount: true,
            total: true,
            status: true,
            saleSplitBills: {
                where: { deletedAt: null },
                select: {
                    id: true,
                    mode: true,
                    items: {
                        where: { deletedAt: null },
                        select: {
                            productId: true,
                            productConversionId: true,
                            quantity: true,
                        },
                    },
                },
            },
            salePendingDetails: {
                where: { deletedAt: null },
                select: {
                    id: true,
                    productId: true,
                    productConversionId: true,
                    quantity: true,
                    price: true,
                    total: true,
                    products: {
                        select: { name: true },
                    },
                    productConversions: {
                        select: {
                            units: {
                                select: { name: true },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!salePending) {
        throw new ValidationError(
            "Sale pending data not found",
            404,
            "salePending",
        );
    }

    if (!salePending.storeId) {
        throw new ValidationError(
            "Store transaksi tidak ditemukan",
            400,
            "store",
        );
    }

    return salePending;
};

const buildSplitBillDrafts = (
    body: any,
    grandTotal: number,
): Array<{ name?: string; total: number; mode: string }> => {
    const mode = `${body.mode ?? ""}`.toUpperCase();
    const bills: Array<{ name?: string; total: number; mode: string }> = [];

    if (mode === "EQUAL") {
        const count = parseInt(`${body.count ?? 0}`, 10);
        if (!Number.isFinite(count) || count < 2) {
            throw new ValidationError("Jumlah split minimal 2", 400, "count");
        }

        const baseAmount = Math.floor(grandTotal / count);
        let remaining = grandTotal;
        for (let index = 0; index < count; index++) {
            const amount = index === count - 1 ? remaining : baseAmount;
            remaining -= amount;
            bills.push({ name: `Bill ${index + 1}`, total: amount, mode });
        }
    } else if (mode === "MANUAL") {
        if (!Array.isArray(body.bills) || body.bills.length < 2) {
            throw new ValidationError(
                "Minimal 2 bill untuk split manual",
                400,
                "bills",
            );
        }

        for (const bill of body.bills) {
            const amount = toNumber(bill.total);
            if (amount <= 0) {
                throw new ValidationError(
                    "Nominal setiap bill harus lebih dari 0",
                    400,
                    "bills",
                );
            }
            bills.push({ name: bill.name, total: amount, mode });
        }

        const totalSplit = bills.reduce((sum, bill) => sum + bill.total, 0);
        if (totalSplit !== grandTotal) {
            throw new ValidationError(
                "Total split bill harus sama dengan total transaksi",
                400,
                "bills",
            );
        }
    } else {
        throw new ValidationError(
            "Mode split bill belum didukung",
            400,
            "mode",
        );
    }

    return bills;
};

type SplitBillDraft = {
    id: string;
    name?: string;
    mode: string;
    subTotal: number;
    discount: number;
    total: number;
    items?: Array<{
        id: string;
        productId: string;
        productConversionId?: string | null;
        quantity: number;
        price: number;
        total: number;
    }>;
};

const detailKey = (productId: string, productConversionId?: string | null) =>
    `${productId}::${productConversionId ?? ""}`;

const buildItemSplitBillDrafts = (
    body: any,
    sourceDetails: any[],
    transactionSubTotal: number,
    discount: number,
    existingSplitBills: any[] = [],
): SplitBillDraft[] => {
    if (!Array.isArray(body.bills) || body.bills.length < 1) {
        throw new ValidationError(
            "Minimal 1 bill untuk split item",
            400,
            "bills",
        );
    }

    const detailMap = new Map<string, any>();
    const requiredQty = new Map<string, number>();
    const allocatedQty = new Map<string, number>();

    for (const detail of sourceDetails) {
        const key = detailKey(detail.productId, detail.productConversionId);
        detailMap.set(key, detail);
        requiredQty.set(key, toNumber(detail.quantity));
        allocatedQty.set(key, 0);
    }

    for (const splitBill of existingSplitBills) {
        for (const item of splitBill.items ?? []) {
            const key = detailKey(item.productId, item.productConversionId);
            allocatedQty.set(
                key,
                (allocatedQty.get(key) ?? 0) + toNumber(item.quantity),
            );
        }
    }

    const drafts: SplitBillDraft[] = [];
    let rawSubTotal = 0;

    const selectedBills = body.bills.filter(
        (bill: any) => Array.isArray(bill.items) && bill.items.length > 0,
    );
    if (selectedBills.length === 0) {
        throw new ValidationError(
            "Pilih minimal 1 item untuk split bill",
            400,
            "bills",
        );
    }

    for (const [billIndex, bill] of selectedBills.entries()) {
        const selectedItems = bill.items.filter(
            (item: any) => toNumber(item.quantity) > 0,
        );
        if (selectedItems.length === 0) {
            continue;
        }

        const items: SplitBillDraft["items"] = [];
        let billSubTotal = 0;

        for (const item of selectedItems) {
            const productId = item.productId;
            const productConversionId =
                item.productConversionId ?? item.unitId ?? null;
            const key = detailKey(productId, productConversionId);
            const detail = detailMap.get(key);
            const quantity = toNumber(item.quantity);

            if (!detail) {
                throw new ValidationError(
                    "Item split tidak ditemukan di transaksi",
                    400,
                    "items",
                );
            }

            if (quantity <= 0) {
                throw new ValidationError(
                    "Quantity split item harus lebih dari 0",
                    400,
                    "items",
                );
            }

            const nextAllocated = (allocatedQty.get(key) ?? 0) + quantity;
            if (nextAllocated > (requiredQty.get(key) ?? 0)) {
                throw new ValidationError(
                    "Quantity split item melebihi quantity pesanan",
                    400,
                    "items",
                );
            }

            const price =
                toNumber(detail.price) ||
                toNumber(detail.total) / Math.max(toNumber(detail.quantity), 1);
            const total = price * quantity;
            allocatedQty.set(key, nextAllocated);
            billSubTotal += total;
            items.push({
                id: uuidv4(),
                productId,
                productConversionId,
                quantity,
                price,
                total,
            });
        }

        rawSubTotal += billSubTotal;
        drafts.push({
            id: uuidv4(),
            name: bill.name || `Bill ${billIndex + 1}`,
            mode: "ITEM",
            subTotal: billSubTotal,
            discount: 0,
            total: billSubTotal,
            items,
        });
    }

    if (drafts.length === 0 || rawSubTotal <= 0) {
        throw new ValidationError(
            "Pilih minimal 1 item untuk split bill",
            400,
            "items",
        );
    }

    const discountRate =
        transactionSubTotal > 0 && discount > 0
            ? discount / transactionSubTotal
            : 0;
    const effectiveDiscount = Math.floor(rawSubTotal * discountRate);
    let remainingDiscount = effectiveDiscount;

    return drafts.map((draft, index) => {
        const isLast = index === drafts.length - 1;
        const proportionalDiscount =
            rawSubTotal > 0
                ? Math.floor((draft.subTotal / rawSubTotal) * effectiveDiscount)
                : 0;
        const billDiscount = isLast ? remainingDiscount : proportionalDiscount;
        const billTotal = Math.max(draft.subTotal - billDiscount, 0);
        remainingDiscount -= billDiscount;

        return {
            ...draft,
            discount: billDiscount,
            total: billTotal,
        };
    });
};

const createSplitBills = async (req: Request, res: Response) => {
    try {
        const saleId = req.params.id;
        const body = req.body;

        const result = await Model.$transaction(async (prisma) => {
            const sale = await getSaleForSplit(prisma, saleId);
            await assertStoreCanTransact(prisma, sale.storeId);

            const mode = `${body.mode ?? ""}`.toUpperCase();
            const hasNonItemSplit = sale.saleSplitBills.some(
                (splitBill: any) => splitBill.mode !== "ITEM",
            );
            if (
                sale.saleSplitBills.length > 0 &&
                (mode !== "ITEM" || hasNonItemSplit)
            ) {
                throw new ValidationError(
                    "Split bill sudah dibuat untuk transaksi ini",
                    400,
                    "splitBill",
                );
            }

            if (mode === "ITEM") {
                const bills = buildItemSplitBillDrafts(
                    body,
                    sale.saleDetails ?? [],
                    toNumber(sale.subTotal),
                    toNumber(sale.discount),
                    sale.saleSplitBills ?? [],
                );

                for (const bill of bills) {
                    await prisma.saleSplitBills.create({
                        data: {
                            id: bill.id,
                            saleId,
                            storeId: sale.storeId,
                            name: bill.name,
                            mode: bill.mode,
                            subTotal: new Decimal(bill.subTotal),
                            discount: new Decimal(bill.discount),
                            total: new Decimal(bill.total),
                            paidAmount: new Decimal(0),
                            changeAmount: new Decimal(0),
                            status: "OPEN",
                            userCreate: res.locals.userId,
                            items: {
                                create: (bill.items ?? []).map((item) => ({
                                    id: item.id,
                                    productId: item.productId,
                                    productConversionId:
                                        item.productConversionId,
                                    quantity: new Decimal(item.quantity),
                                    price: new Decimal(item.price),
                                    total: new Decimal(item.total),
                                })),
                            },
                        },
                    });
                }
            } else {
                const bills = buildSplitBillDrafts(body, toNumber(sale.total));

                await prisma.saleSplitBills.createMany({
                    data: bills.map((bill, index) => ({
                        id: uuidv4(),
                        saleId,
                        storeId: sale.storeId,
                        name: bill.name || `Bill ${index + 1}`,
                        mode: bill.mode,
                        subTotal: new Decimal(bill.total),
                        discount: new Decimal(0),
                        total: new Decimal(bill.total),
                        paidAmount: new Decimal(0),
                        changeAmount: new Decimal(0),
                        status: "OPEN",
                        userCreate: res.locals.userId,
                    })),
                });
            }

            return prisma.saleSplitBills.findMany({
                where: { saleId, deletedAt: null },
                orderBy: { createdAt: "asc" },
            });
        });

        res.status(200).json({
            status: true,
            message: "Successfully created split bills",
            data: { splitBills: result },
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getSplitBills = async (req: Request, res: Response) => {
    try {
        const saleId = req.params.id;
        const splitBills = await Model.saleSplitBills.findMany({
            where: { saleId, deletedAt: null },
            include: {
                payments: {
                    where: { deletedAt: null },
                    include: { account: true },
                },
                items: {
                    where: { deletedAt: null },
                    include: {
                        products: { select: { name: true } },
                        productConversions: {
                            select: { units: { select: { name: true } } },
                        },
                    },
                },
            },
            orderBy: { createdAt: "asc" },
        });

        res.status(200).json({
            status: true,
            message: "Successfully get split bills",
            data: { splitBills },
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const updateSplitBill = async (req: Request, res: Response) => {
    try {
        const { id: saleId, splitBillId } = req.params;
        const body = req.body;

        const splitBill = await Model.saleSplitBills.findFirst({
            where: {
                id: splitBillId,
                saleId,
                deletedAt: null,
            },
        });

        if (!splitBill) {
            throw new ValidationError(
                "Split bill tidak ditemukan",
                404,
                "splitBill",
            );
        }

        await assertStoreCanTransact(Model, splitBill.storeId);

        if (splitBill.status === "PAID") {
            throw new ValidationError(
                "Split bill yang sudah lunas tidak dapat diubah",
                400,
                "splitBill",
            );
        }

        const updated = await Model.saleSplitBills.update({
            where: { id: splitBillId },
            data: {
                name: body.name ?? splitBill.name,
                total:
                    body.total !== undefined
                        ? new Decimal(toNumber(body.total))
                        : splitBill.total,
                subTotal:
                    body.total !== undefined
                        ? new Decimal(toNumber(body.total))
                        : splitBill.subTotal,
                updatedAt: new Date(),
            },
        });

        res.status(200).json({
            status: true,
            message: "Successfully updated split bill",
            data: { splitBill: updated },
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const deleteSplitBill = async (req: Request, res: Response) => {
    try {
        const { id: saleId, splitBillId } = req.params;

        await Model.$transaction(async (prisma) => {
            const splitBill = await prisma.saleSplitBills.findFirst({
                where: {
                    id: splitBillId,
                    saleId,
                    deletedAt: null,
                },
            });

            if (!splitBill) {
                throw new ValidationError(
                    "Split bill tidak ditemukan",
                    404,
                    "splitBill",
                );
            }

            await assertStoreCanTransact(prisma, splitBill.storeId);

            if (splitBill.status === "PAID") {
                throw new ValidationError(
                    "Split bill yang sudah lunas tidak dapat dihapus",
                    400,
                    "splitBill",
                );
            }

            await prisma.salePayments.deleteMany({
                where: { splitBillId },
            });
            await prisma.saleSplitBills.update({
                where: { id: splitBillId },
                data: { deletedAt: new Date(), status: "VOID" },
            });
        });

        res.status(200).json({
            status: true,
            message: "Successfully deleted split bill",
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const paySplitBill = async (req: Request, res: Response) => {
    try {
        const { id: saleId, splitBillId } = req.params;
        const body = req.body;

        const result = await Model.$transaction(async (prisma) => {
            const splitBill = await prisma.saleSplitBills.findFirst({
                where: {
                    id: splitBillId,
                    saleId,
                    deletedAt: null,
                },
                include: {
                    sale: {
                        select: {
                            id: true,
                            storeId: true,
                            invoice: true,
                        },
                    },
                },
            });

            if (!splitBill) {
                throw new ValidationError(
                    "Split bill tidak ditemukan",
                    404,
                    "splitBill",
                );
            }

            await assertStoreCanTransact(prisma, splitBill.storeId);

            if (splitBill.status === "PAID") {
                throw new ValidationError(
                    "Split bill sudah lunas",
                    400,
                    "splitBill",
                );
            }

            const paidAmount = toNumber(splitBill.paidAmount);
            const total = toNumber(splitBill.total);
            const remaining = Math.max(total - paidAmount, 0);
            const normalizedPayments = await normalizeSalePayments(prisma, {
                storeId: splitBill.storeId,
                payments: body.payments,
                accountId: body.accountId,
                pay: body.pay,
                grandTotal: remaining,
                allowPartial: true,
            });

            await createSalePaymentsAndCashflows(prisma, {
                saleId,
                splitBillId,
                storeId: splitBill.storeId,
                invoice: splitBill.sale?.invoice,
                payments: normalizedPayments.payments,
                userCreate: res.locals.userId,
                transactionDate: new Date(),
                descriptionPrefix: `Pembayaran ${splitBill.name ?? "Split Bill"}`,
            });

            const nextPaidAmount = paidAmount + normalizedPayments.totalPaid;
            const nextChangeAmount =
                toNumber(splitBill.changeAmount) +
                normalizedPayments.totalChange;
            const paidNetAmount = nextPaidAmount - nextChangeAmount;
            const nextStatus =
                paidNetAmount >= total
                    ? "PAID"
                    : nextPaidAmount > 0
                      ? "PARTIAL"
                      : "OPEN";

            const updatedSplit = await prisma.saleSplitBills.update({
                where: { id: splitBillId },
                data: {
                    paidAmount: new Decimal(nextPaidAmount),
                    changeAmount: new Decimal(nextChangeAmount),
                    status: nextStatus,
                    updatedAt: new Date(),
                },
            });

            const remainingOpenSplits = await prisma.saleSplitBills.count({
                where: {
                    saleId,
                    deletedAt: null,
                    status: { not: "PAID" },
                },
            });

            if (remainingOpenSplits === 0) {
                await prisma.sales.update({
                    where: { id: saleId },
                    data: { status: "finish" },
                });
            }

            return updatedSplit;
        });

        res.status(200).json({
            status: true,
            message: "Successfully paid split bill",
            data: { splitBill: result },
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const createPendingSplitBills = async (req: Request, res: Response) => {
    try {
        const salePendingId = req.params.id;
        const body = req.body;

        const result = await Model.$transaction(async (prisma) => {
            const salePending = await getSalePendingForSplit(
                prisma,
                salePendingId,
            );
            await assertStoreCanTransact(prisma, salePending.storeId);

            const mode = `${body.mode ?? ""}`.toUpperCase();
            const hasNonItemSplit = salePending.saleSplitBills.some(
                (splitBill: any) => splitBill.mode !== "ITEM",
            );
            if (
                salePending.saleSplitBills.length > 0 &&
                (mode !== "ITEM" || hasNonItemSplit)
            ) {
                throw new ValidationError(
                    "Split bill sudah dibuat untuk pesanan ini",
                    400,
                    "splitBill",
                );
            }

            if (mode === "ITEM") {
                const bills = buildItemSplitBillDrafts(
                    body,
                    salePending.salePendingDetails ?? [],
                    toNumber(salePending.subTotal),
                    toNumber(salePending.discount),
                    salePending.saleSplitBills ?? [],
                );

                for (const bill of bills) {
                    await prisma.saleSplitBills.create({
                        data: {
                            id: bill.id,
                            salePendingId,
                            storeId: salePending.storeId,
                            name: bill.name,
                            mode: bill.mode,
                            subTotal: new Decimal(bill.subTotal),
                            discount: new Decimal(bill.discount),
                            total: new Decimal(bill.total),
                            paidAmount: new Decimal(0),
                            changeAmount: new Decimal(0),
                            status: "OPEN",
                            userCreate: res.locals.userId,
                            items: {
                                create: (bill.items ?? []).map((item) => ({
                                    id: item.id,
                                    productId: item.productId,
                                    productConversionId:
                                        item.productConversionId,
                                    quantity: new Decimal(item.quantity),
                                    price: new Decimal(item.price),
                                    total: new Decimal(item.total),
                                })),
                            },
                        },
                    });
                }
            } else {
                const bills = buildSplitBillDrafts(
                    body,
                    toNumber(salePending.total),
                );

                await prisma.saleSplitBills.createMany({
                    data: bills.map((bill, index) => ({
                        id: uuidv4(),
                        salePendingId,
                        storeId: salePending.storeId,
                        name: bill.name || `Bill ${index + 1}`,
                        mode: bill.mode,
                        subTotal: new Decimal(bill.total),
                        discount: new Decimal(0),
                        total: new Decimal(bill.total),
                        paidAmount: new Decimal(0),
                        changeAmount: new Decimal(0),
                        status: "OPEN",
                        userCreate: res.locals.userId,
                    })),
                });
            }

            return prisma.saleSplitBills.findMany({
                where: { salePendingId, deletedAt: null },
                orderBy: { createdAt: "asc" },
            });
        });

        res.status(200).json({
            status: true,
            message: "Successfully created pending split bills",
            data: { splitBills: result },
        });
    } catch (error) {
        console.log(error);

        handleErrorMessage(res, error);
    }
};

const getPendingSplitBills = async (req: Request, res: Response) => {
    try {
        const salePendingId = req.params.id;
        const splitBills = await Model.saleSplitBills.findMany({
            where: { salePendingId, deletedAt: null },
            include: {
                payments: {
                    where: { deletedAt: null },
                    include: { account: true },
                },
                items: {
                    where: { deletedAt: null },
                    include: {
                        products: { select: { name: true } },
                        productConversions: {
                            select: { units: { select: { name: true } } },
                        },
                    },
                },
            },
            orderBy: { createdAt: "asc" },
        });

        res.status(200).json({
            status: true,
            message: "Successfully get pending split bills",
            data: { splitBills },
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const deletePendingSplitBill = async (req: Request, res: Response) => {
    try {
        const { id: salePendingId, splitBillId } = req.params;

        await Model.$transaction(async (prisma) => {
            const splitBill = await prisma.saleSplitBills.findFirst({
                where: { id: splitBillId, salePendingId, deletedAt: null },
            });

            if (!splitBill) {
                throw new ValidationError(
                    "Split bill tidak ditemukan",
                    404,
                    "splitBill",
                );
            }

            await assertStoreCanTransact(prisma, splitBill.storeId);

            if (splitBill.status === "PAID") {
                throw new ValidationError(
                    "Split bill yang sudah lunas tidak dapat dihapus",
                    400,
                    "splitBill",
                );
            }

            await prisma.salePayments.deleteMany({ where: { splitBillId } });
            await prisma.saleSplitBills.update({
                where: { id: splitBillId },
                data: { deletedAt: new Date(), status: "VOID" },
            });
        });

        res.status(200).json({
            status: true,
            message: "Successfully deleted pending split bill",
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const payPendingSplitBill = async (req: Request, res: Response) => {
    try {
        const { id: salePendingId, splitBillId } = req.params;
        const body = req.body;

        const result = await Model.$transaction(async (prisma) => {
            const splitBill = await prisma.saleSplitBills.findFirst({
                where: { id: splitBillId, salePendingId, deletedAt: null },
                include: {
                    salePending: {
                        select: {
                            id: true,
                            storeId: true,
                            invoice: true,
                        },
                    },
                },
            });

            if (!splitBill) {
                throw new ValidationError(
                    "Split bill tidak ditemukan",
                    404,
                    "splitBill",
                );
            }

            await assertStoreCanTransact(prisma, splitBill.storeId);

            if (splitBill.status === "PAID") {
                throw new ValidationError(
                    "Split bill sudah lunas",
                    400,
                    "splitBill",
                );
            }

            const paidAmount = toNumber(splitBill.paidAmount);
            const total = toNumber(splitBill.total);
            const remaining = Math.max(total - paidAmount, 0);
            const normalizedPayments = await normalizeSalePayments(prisma, {
                storeId: splitBill.storeId,
                payments: body.payments,
                accountId: body.accountId,
                pay: body.pay,
                grandTotal: remaining,
                allowPartial: true,
            });

            await createSalePaymentsAndCashflows(prisma, {
                salePendingId,
                splitBillId,
                storeId: splitBill.storeId,
                invoice: splitBill.salePending?.invoice,
                payments: normalizedPayments.payments,
                userCreate: res.locals.userId,
                transactionDate: new Date(),
                descriptionPrefix: `Pembayaran ${
                    splitBill.name ?? "Split Bill"
                }`,
                referenceId: salePendingId,
                referenceType: "SALE_PENDING",
            });

            const nextPaidAmount = paidAmount + normalizedPayments.totalPaid;
            const nextChangeAmount =
                toNumber(splitBill.changeAmount) +
                normalizedPayments.totalChange;
            const paidNetAmount = nextPaidAmount - nextChangeAmount;
            const nextStatus =
                paidNetAmount >= total
                    ? "PAID"
                    : nextPaidAmount > 0
                      ? "PARTIAL"
                      : "OPEN";

            return prisma.saleSplitBills.update({
                where: { id: splitBillId },
                data: {
                    paidAmount: new Decimal(nextPaidAmount),
                    changeAmount: new Decimal(nextChangeAmount),
                    status: nextStatus,
                    updatedAt: new Date(),
                },
            });
        });

        res.status(200).json({
            status: true,
            message: "Successfully paid pending split bill",
            data: { splitBill: result },
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
    getSplitBillFacture,
    getDataUpdate,
    createSplitBills,
    getSplitBills,
    updateSplitBill,
    deleteSplitBill,
    paySplitBill,
    createPendingSplitBills,
    getPendingSplitBills,
    deletePendingSplitBill,
    payPendingSplitBill,
};
