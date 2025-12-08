import Model from "#root/services/PrismaService";
import { v4 as uuidv4 } from "uuid";
import getOwnerId from "#root/helpers/GetOwnerId";
import { ValidationError } from "#root/helpers/handleErrors";
import { DecrementStock, IncrementStock, GetHpp } from "#root/helpers/stock";

interface StockOpnameQuery {
    page?: string;
    limit?: string;
    storeId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
}

export const getStockOpnames = async (
    query: StockOpnameQuery,
    userId: string,
    userLevel: string
) => {
    const owner: any = await getOwnerId(userId, userLevel);
    const take: number = parseInt(query.limit ?? "20");
    const page: number = parseInt(query.page ?? "1");
    const skip: number = (page - 1) * take;

    let whereClause: any = {
        stores: { ownerId: owner.id },
    };

    if (query.storeId) {
        whereClause.storeId = query.storeId;
    }

    if (query.startDate && query.endDate) {
        whereClause.date = {
            gte: new Date(query.startDate),
            lte: new Date(query.endDate),
        };
    }

    if (query.search) {
        whereClause.OR = [
            { invoice: { contains: query.search } },
            { description: { contains: query.search } },
        ];
    }

    const [data, total] = await Promise.all([
        Model.stockOpname.findMany({
            where: whereClause,
            include: {
                stores: { select: { id: true, name: true } },
                users: { select: { id: true, name: true } },
                _count: { select: { stockOpnameDetails: true } },
                stockOpnameDetails: true,
            },
            orderBy: { createdAt: "desc" },
            skip,
            take,
        }),
        Model.stockOpname.count({ where: whereClause }),
    ]);

    return {
        message: "successful in getting stock opname data",
        data: {
            stockOpnames: data,
            info: { page, limit: take, total },
        },
    };
};

export const getStockOpnameById = async (id: string) => {
    const data = await Model.stockOpname.findUnique({
        where: { id },
        include: {
            stores: { select: { id: true, name: true } },
            users: { select: { id: true, name: true } },
            stockOpnameDetails: {
                include: {
                    products: {
                        select: { id: true, name: true, code: true, sku: true },
                    },
                    productConversions: {
                        include: {
                            units: { select: { id: true, name: true } },
                        },
                    },
                },
            },
        },
    });

    if (!data)
        throw new ValidationError("Stock opname not found", 404, "stockOpname");

    return {
        message: "successful in getting stock opname detail",
        data,
    };
};

export const createStockOpname = async (
    data: any,
    userId: string,
    userLevel: string
) => {
    const owner: any = await getOwnerId(userId, userLevel);
    if (!owner.status)
        throw new ValidationError("Owner not found", 404, "owner");

    // Generate Invoice
    const date = new Date();
    const invoice = `SO-${date.getTime()}-${Math.floor(Math.random() * 1000)}`;

    const stockOpnameId = uuidv4();
    const status = data.status ?? "pending";

    await Model.$transaction(async (prisma) => {
        // Create Header
        await prisma.stockOpname.create({
            data: {
                id: stockOpnameId,
                storeId: data.storeId,
                date: new Date(data.date),
                invoice: data.invoice ?? invoice,
                description: data.description,
                status: status,
                userCreate: userId,
            },
        });

        // Loop details
        for (const detail of data.details) {
            console.log({ detail });
            const detailId = uuidv4();
            // Get current stock
            const currentStock = await prisma.stocks.findFirst({
                where: {
                    productId: detail.productId,
                    storeId: data.storeId,
                },
            });

            // Conversion handling (if units involved)
            let conversionQty = 1;
            if (detail.productConversionId) {
                const conversion = await prisma.productConversions.findUnique({
                    where: { id: detail.productConversionId },
                });
                conversionQty = conversion?.quantity ?? 1;
            }

            const systemQuantity = currentStock ? currentStock.quantity : 0;
            // Actual is input (in base unit or converted?)
            // Usually stock opname is "count". If using units, we must convert to base.
            // Assuming detail.actualQuantity is in the Unit specified.
            const actualBaseQty = Number(detail.actualQuantity) * conversionQty;

            // Wait, previous simple impl assumed base. Sales/Purchase handle units.
            // Let's stick to unit logic if productConversionId is present.
            // System stock is always in BASE unit.

            const diffBaseQty = actualBaseQty - Number(systemQuantity);

            // We save the "actualQuantity" record as passed (e.g. 10 Boxes),
            // but differenceQuantity should be in Base or Unit?
            // Schema: differenceQuantity Decimal.
            // Let's save difference in Base Unit to be consistent with Stock.

            // Create Detail
            await prisma.stockOpnameDetails.create({
                data: {
                    id: detailId,
                    stockOpnameId: stockOpnameId,
                    productId: detail.productId,
                    productConversionId: detail.productConversionId,
                    systemQuantity: systemQuantity,
                    actualQuantity: detail.actualQuantity, // Input quantity
                    differenceQuantity: diffBaseQty, // Base quantity difference
                    description: detail.description,
                    userCreate: userId,
                },
            });

            // If Completed, adjust stock/hpp
            if (status === "completed") {
                if (diffBaseQty > 0) {
                    // Surplus -> Increment Stock -> Create HPP History
                    const inc = await IncrementStock(
                        prisma,
                        detail.productId,
                        data.storeId,
                        diffBaseQty
                    );
                    if (!inc.status)
                        throw new ValidationError(
                            inc.message as string,
                            400,
                            "stock"
                        );

                    // Create HPP History
                    // Need price. Try to get price from user or latest purchase price
                    // If user passed a price/value? Not in schema input typically.
                    // Fetch latest purchase price for this product/unit
                    let priceBase = 0;
                    // Try getting from productPurchasePrices via productConversion
                    // Ideally we should have a price in the input for the "found" items.
                    // For now, let's try to find a valid price or 0.
                    const productPrice =
                        await prisma.productPurchasePrices.findFirst({
                            where: {
                                conversionId: detail.productConversionId,
                            },
                            orderBy: { createdAt: "desc" },
                        });
                    // Adjust price to base unit if needed? productPurchasePrices is per unit.
                    // Simplified: Price = 0 if not found.
                    // Warning: 0 price will mess up profit calculation later.

                    await prisma.hppHistory.create({
                        data: {
                            id: uuidv4(),
                            productId: detail.productId,
                            price: productPrice?.price ?? 0, // Fallback
                            quantity: diffBaseQty,
                            quantityUsed: 0,
                            storeId: data.storeId,
                            transactionDetailId: detailId,
                            status: "available",
                        },
                    });
                } else if (diffBaseQty < 0) {
                    // Loss -> Decrement Stock -> Update HPP History Used
                    const absDiff = Math.abs(diffBaseQty);
                    const dec = await DecrementStock(
                        prisma,
                        detail.productId,
                        data.storeId,
                        absDiff
                    );
                    if (!dec.status)
                        throw new ValidationError(
                            dec.message as string,
                            400,
                            "stock"
                        );

                    const hppResult = await GetHpp({
                        prisma,
                        storeId: data.storeId,
                        quantityNeed: absDiff,
                        productId: detail.productId,
                    });

                    // Update usage
                    for (const value of hppResult.hpp) {
                        if (value.hppHistoryId) {
                            await prisma.hppHistory.update({
                                where: { id: value.hppHistoryId },
                                data: {
                                    quantityUsed: { increment: value.quantity },
                                },
                            });
                        }
                    }
                }
            }
        }
    });

    return { message: "Stock opname created successfully" };
};

export const updateStockOpname = async (
    id: string,
    data: any,
    userId: string,
    _userLevel: string
) => {
    // Check existence
    const existing = await Model.stockOpname.findUnique({ where: { id } });
    if (!existing)
        throw new ValidationError("Stock opname not found", 404, "stockOpname");

    // Only allow update if pending
    // if (existing.status !== "pending") {
    //     throw new ValidationError(
    //         "Cannot update already processed stock opname",
    //         400,
    //         "stockOpname"
    //     );
    // }

    await Model.$transaction(async (prisma) => {
        await prisma.stockOpname.update({
            where: { id },
            data: {
                date: data.date ? new Date(data.date) : undefined,
                description: data.description,
                storeId: data.storeId,
                status: data.status ?? "pending",
            },
        });

        if (data.details) {
            // Wipe and recreate details
            await prisma.stockOpnameDetails.deleteMany({
                where: { stockOpnameId: id },
            });

            for (const detail of data.details) {
                const detailId = uuidv4();
                const currentStock = await prisma.stocks.findFirst({
                    where: {
                        productId: detail.productId,
                        storeId: data.storeId || existing.storeId,
                    },
                });

                // Conversion handling
                let conversionQty = 1;
                if (detail.productConversionId) {
                    const conversion =
                        await prisma.productConversions.findUnique({
                            where: { id: detail.productConversionId },
                        });
                    conversionQty = conversion?.quantity ?? 1;
                }

                const systemQuantity = currentStock ? currentStock.quantity : 0;
                const actualBaseQty =
                    Number(detail.actualQuantity) * conversionQty;
                const diffBaseQty = actualBaseQty - Number(systemQuantity);

                await prisma.stockOpnameDetails.create({
                    data: {
                        id: detailId,
                        stockOpnameId: id,
                        productId: detail.productId,
                        productConversionId: detail.productConversionId,
                        systemQuantity: systemQuantity,
                        actualQuantity: detail.actualQuantity,
                        differenceQuantity: diffBaseQty,
                        description: detail.description,
                        userCreate: userId,
                    },
                });

                // If Status Changed to COMPLETED -> Adjust Stocks
                // We only do this if we are "completing" it in this update
                if (data.status === "completed") {
                    if (diffBaseQty > 0) {
                        // Surplus
                        const inc = await IncrementStock(
                            prisma,
                            detail.productId,
                            existing.storeId,
                            diffBaseQty
                        );
                        if (!inc.status)
                            throw new ValidationError(
                                inc.message as string,
                                400,
                                "stock"
                            );

                        const productPrice =
                            await prisma.productPurchasePrices.findFirst({
                                where: {
                                    conversionId: detail.productConversionId,
                                },
                                orderBy: { createdAt: "desc" },
                            });

                        await prisma.hppHistory.create({
                            data: {
                                id: uuidv4(),
                                productId: detail.productId,
                                price: productPrice?.price ?? 0,
                                quantity: diffBaseQty,
                                quantityUsed: 0,
                                storeId: existing.storeId,
                                transactionDetailId: detailId,
                                status: "available",
                            },
                        });
                    } else if (diffBaseQty < 0) {
                        // Loss
                        const absDiff = Math.abs(diffBaseQty);
                        const dec = await DecrementStock(
                            prisma,
                            detail.productId,
                            existing.storeId,
                            absDiff
                        );
                        if (!dec.status)
                            throw new ValidationError(
                                dec.message as string,
                                400,
                                "stock"
                            );

                        const hppResult = await GetHpp({
                            prisma,
                            storeId: existing.storeId,
                            quantityNeed: absDiff,
                            productId: detail.productId,
                        });

                        for (const value of hppResult.hpp) {
                            if (value.hppHistoryId) {
                                await prisma.hppHistory.update({
                                    where: { id: value.hppHistoryId },
                                    data: {
                                        quantityUsed: {
                                            increment: value.quantity,
                                        },
                                    },
                                });
                            }
                        }
                    }
                }
            }
        } else if (data.status === "completed") {
            // Case where we update status but not details?
            // We should fetch existing details and process them.
            const details = await prisma.stockOpnameDetails.findMany({
                where: { stockOpnameId: id },
            });

            for (const detail of details) {
                const diffBaseQty = Number(detail.differenceQuantity);

                if (diffBaseQty > 0) {
                    const inc = await IncrementStock(
                        prisma,
                        detail.productId,
                        existing.storeId,
                        diffBaseQty
                    );
                    if (!inc.status)
                        throw new ValidationError(
                            inc.message as string,
                            400,
                            "stock"
                        );

                    const productPrice =
                        await prisma.productPurchasePrices.findFirst({
                            where: {
                                productConversions: {
                                    productId: detail.productId,
                                },
                            },
                            orderBy: { createdAt: "desc" },
                        });

                    await prisma.hppHistory.create({
                        data: {
                            id: uuidv4(),
                            productId: detail.productId,
                            price: productPrice?.price ?? 0,
                            quantity: diffBaseQty,
                            quantityUsed: 0,
                            storeId: existing.storeId,
                            transactionDetailId: detail.id,
                            status: "available",
                        },
                    });
                } else if (diffBaseQty < 0) {
                    const absDiff = Math.abs(diffBaseQty);
                    const dec = await DecrementStock(
                        prisma,
                        detail.productId,
                        existing.storeId,
                        absDiff
                    );
                    if (!dec.status)
                        throw new ValidationError(
                            dec.message as string,
                            400,
                            "stock"
                        );

                    const hppResult = await GetHpp({
                        prisma,
                        storeId: existing.storeId,
                        quantityNeed: absDiff,
                        productId: detail.productId,
                    });

                    for (const value of hppResult.hpp) {
                        if (value.hppHistoryId) {
                            await prisma.hppHistory.update({
                                where: { id: value.hppHistoryId },
                                data: {
                                    quantityUsed: { increment: value.quantity },
                                },
                            });
                        }
                    }
                }
            }
        }
    });

    return { message: "Stock opname updated successfully" };
};

export const deleteStockOpname = async (
    id: string,
    userId: string,
    userLevel: string
) => {
    const existing = await Model.stockOpname.findUnique({
        where: { id },
        include: {
            stockOpnameDetails: true,
        },
    });

    if (!existing)
        throw new ValidationError("Stock opname not found", 404, "stockOpname");

    await Model.$transaction(async (prisma) => {
        // If completed, we need to reverse the stock adjustments
        if (existing.status === "completed") {
            for (const detail of existing.stockOpnameDetails) {
                const diffBaseQty = Number(detail.differenceQuantity);

                if (diffBaseQty > 0) {
                    // Was Surplus (incremented) -> Now Decrement to reverse
                    const dec = await DecrementStock(
                        prisma,
                        detail.productId,
                        existing.storeId,
                        diffBaseQty
                    );
                    if (!dec.status)
                        throw new ValidationError(
                            dec.message as string,
                            400,
                            "stock"
                        );

                    // Remove or mark HPP history as used
                    const hppResult = await GetHpp({
                        prisma,
                        storeId: existing.storeId,
                        quantityNeed: diffBaseQty,
                        productId: detail.productId,
                    });

                    for (const value of hppResult.hpp) {
                        if (value.hppHistoryId) {
                            await prisma.hppHistory.update({
                                where: { id: value.hppHistoryId },
                                data: {
                                    quantityUsed: { increment: value.quantity },
                                },
                            });
                        }
                    }
                } else if (diffBaseQty < 0) {
                    // Was Loss (decremented) -> Now Increment to reverse
                    const absDiff = Math.abs(diffBaseQty);
                    const inc = await IncrementStock(
                        prisma,
                        detail.productId,
                        existing.storeId,
                        absDiff
                    );
                    if (!inc.status)
                        throw new ValidationError(
                            inc.message as string,
                            400,
                            "stock"
                        );

                    // Find and reverse HPP history usage that was created by this detail
                    // We need to decrement the quantityUsed that was incremented during create/update
                    const hppHistories = await prisma.hppHistory.findMany({
                        where: {
                            productId: detail.productId,
                            storeId: existing.storeId,
                            quantityUsed: { gt: 0 },
                        },
                        orderBy: { date: "asc" },
                    });

                    let remainingToReverse = absDiff;
                    for (const hpp of hppHistories) {
                        if (remainingToReverse <= 0) break;

                        const available = Number(hpp.quantityUsed);
                        const toReverse = Math.min(
                            available,
                            remainingToReverse
                        );

                        await prisma.hppHistory.update({
                            where: { id: hpp.id },
                            data: {
                                quantityUsed: { decrement: toReverse },
                            },
                        });

                        remainingToReverse -= toReverse;
                    }
                }
            }
        }

        // Delete the stock opname (cascade will delete details)
        await prisma.stockOpname.delete({ where: { id } });
    });

    return { message: "Stock opname deleted successfully" };
};
