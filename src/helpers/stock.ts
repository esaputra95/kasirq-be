import Model from "#root/services/PrismaService";
import { hppHistory, Prisma, PrismaClient } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";
import { v4 as uuidv4 } from "uuid";

const IncrementStock = async (
    prisma: Omit<
        PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>,
        | "$connect"
        | "$disconnect"
        | "$on"
        | "$transaction"
        | "$use"
        | "$extends"
    >,
    productId: string,
    storeId: string,
    quantity: number
) => {
    try {
        const checkStock = await prisma.stocks.findUnique({
            where: {
                productId: productId,
            },
        });

        if (!checkStock) {
            await prisma.stocks.create({
                data: {
                    id: uuidv4(),
                    productId: productId,
                    quantity: quantity ?? 0,
                    storeId: storeId,
                },
            });
        } else {
            await prisma.stocks.update({
                data: {
                    productId: productId,
                    quantity: {
                        increment: quantity ?? 0,
                    },
                    storeId: storeId,
                },
                where: {
                    productId: productId,
                },
            });
        }
        // await prisma.hppHistory.create
        return {
            status: true,
        };
    } catch (error) {
        return {
            status: false,
            message: error,
        };
    }
};

const DecrementStock = async (
    prisma: Omit<
        PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>,
        | "$connect"
        | "$disconnect"
        | "$on"
        | "$transaction"
        | "$use"
        | "$extends"
    >,
    productId: string,
    storeId: string,
    quantity: number
) => {
    try {
        const checkStock = await prisma.stocks.findUnique({
            where: {
                productId: productId,
            },
            select: {
                id: true,
                quantity: true,
                products: {
                    select: {
                        isStock: true,
                        id: true,
                    },
                },
            },
        });
        if (!checkStock?.products?.isStock) {
            return {
                status: true,
                message:
                    "Tidak dapat mengurangi stok produk ini karena tidak menggunakan stok",
            };
        }
        if (checkStock?.products?.isStock && checkStock.quantity < quantity) {
            return {
                status: false,
                message: "Stok tidak cukup",
            };
        }
        if (!checkStock) {
            await prisma.stocks.create({
                data: {
                    id: uuidv4(),
                    productId: productId,
                    quantity: quantity,
                    storeId: storeId,
                },
            });
        } else {
            await prisma.stocks.update({
                data: {
                    quantity: {
                        decrement: quantity,
                    },
                    storeId: storeId,
                },
                where: {
                    productId: productId,
                },
            });
        }
        return {
            status: true,
        };
    } catch (error) {
        return {
            status: false,
            message: error,
        };
    }
};

const GetHpp = async ({
    prisma,
    storeId,
    quantityNeed,
    productId,
}: {
    prisma: Omit<
        PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>,
        | "$connect"
        | "$disconnect"
        | "$on"
        | "$transaction"
        | "$use"
        | "$extends"
    >;
    storeId: string;
    quantityNeed: number;
    productId: string;
}) => {
    try {
        const checkProductStatus = await Model.products.findUnique({
            where: {
                id: productId,
            },
            select: {
                id: true,
                isStock: true,
                productConversions: {
                    select: {
                        productPurchasePrices: {
                            select: {
                                price: true,
                            },
                        },
                    },
                    orderBy: {
                        quantity: "asc",
                    },
                },
            },
            // include: {
            //     stocks: true,
            //     productConversions: {
            //         include: {
            //             productPurchasePrices: true,
            //         },
            //         orderBy: {
            //             quantity: "asc",
            //         },
            //     },
            // },
        });

        if (checkProductStatus?.isStock) {
            const hpp: hppHistory[] = await prisma.$queryRaw`
                SELECT * FROM hppHistory WHERE quantity > quantityUsed AND storeId = ${storeId} AND productId = ${productId} ORDER BY date ASC
            `;

            let dataHpp: any = [];
            let getQuantity = quantityNeed;
            for (const value of hpp) {
                let q = 0;
                if (
                    (value.quantity ?? 0) - (value.quantityUsed ?? 0) >=
                    getQuantity
                ) {
                    dataHpp = [
                        ...dataHpp,
                        {
                            hppHistoryId: value.id,
                            quantity: getQuantity,
                            price: value.price,
                        },
                    ];
                    break;
                } else {
                    dataHpp = [
                        ...dataHpp,
                        {
                            hppHistoryId: value.id,
                            quantity:
                                (value.quantity ?? 0) -
                                (value.quantityUsed ?? 0),
                            price: value.price,
                        },
                    ];
                    getQuantity -=
                        (value.quantity ?? 0) - (value.quantityUsed ?? 0);
                }
            }
            return {
                status: true,
                hpp: dataHpp,
            };
        } else {
            return {
                status: true,
                hpp: [
                    {
                        hppHistoryId: null,
                        quantity: quantityNeed,
                        price:
                            checkProductStatus?.productConversions?.[0]
                                ?.productPurchasePrices?.[0].price ?? 0,
                    },
                ],
            };
        }
    } catch (error) {
        return {
            status: false,
            hpp: [],
        };
    }
};

export { IncrementStock, DecrementStock, GetHpp };
