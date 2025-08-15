import Model from "#root/services/PrismaService";
import { Request, Response } from "express";
import { Prisma, products } from "@prisma/client";
import { handleValidationError } from "#root/helpers/handleValidationError";
import { errorType } from "#root/helpers/errorType";
import { ProductQueryInterface } from "#root/interfaces/masters/ProductInterface";
import { v4 as uuidv4 } from "uuid";
import getOwnerId from "#root/helpers/GetOwnerId";
import { handleErrorMessage } from "#root/helpers/handleErrors";

const getData = async (
    req: Request<{}, {}, {}, ProductQueryInterface>,
    res: Response
) => {
    try {
        const query = req.query;
        const owner: any = await getOwnerId(
            res.locals.userId,
            res.locals.userType
        );

        // PAGING
        const take: number = parseInt(query.limit ?? 20);
        const page: number = parseInt(query.page ?? 1);
        const skip: number = (page - 1) * take;
        // FILTER
        let filter: any = [];
        query.code
            ? (filter = [...filter, { name: { contains: query.code } }])
            : null;
        query.code
            ? (filter = [...filter, { code: { contains: query.code } }])
            : null;
        // query.categoryId ? filter = [...filter, {categoriId: { contains: query.categoryId }}] : null;

        if (filter.length > 0) {
            filter = {
                OR: [...filter],
            };
        }

        const data = await Model.products.findMany({
            where: {
                ...filter,
                categoryId: { contains: query.categoryId },
                ownerId: owner.id,
            },
            select: {
                categories: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                stocks: {
                    select: {
                        id: true,
                        productId: true,
                        quantity: true,
                        storeId: true,
                    },
                    where: {
                        storeId: query.storeId ?? "",
                    },
                },
                productConversions: {
                    select: {
                        id: true,
                        quantity: true,
                        unitId: true,
                        status: true,
                        units: {
                            select: {
                                id: true,
                                name: true,
                                ownerId: true,
                            },
                        },
                        productPurchasePrices: {
                            select: {
                                id: true,
                                price: true,
                                storeId: true,
                                conversionId: true,
                            },
                            // where: {
                            //     storeId: query.storeId
                            // }
                        },
                        productSellPrices: {
                            select: {
                                id: true,
                                price: true,
                                storeId: true,
                                conversionId: true,
                            },
                            // where: {
                            //     storeId: query.storeId
                            // }
                        },
                    },
                    orderBy: {
                        quantity: "asc",
                    },
                },
                categoryId: true,
                id: true,
                name: true,
                barcode: true,
                code: true,
                image: true,
                ownerId: true,
                sku: true,
                isStock: true,
            },
            orderBy: {
                name: "asc",
            },
            skip: skip,
            take: take,
        });
        const total = await Model.products.count({
            where: {
                ...filter,
            },
        });
        res.status(200).json({
            status: true,
            message: "successful in getting product data",
            data: {
                product: data.sort((a, b) => a.name.localeCompare(b.name)),
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

const getProductSell = async (
    req: Request<{}, {}, {}, ProductQueryInterface>,
    res: Response
) => {
    try {
        const query = req.query;
        const owner: any = await getOwnerId(
            res.locals.userId,
            res.locals.userType
        );
        // PAGING
        const take: number = parseInt(query.limit ?? 20);
        const page: number = parseInt(query.page ?? 1);
        const skip: number = (page - 1) * take;
        // FILTER
        let filter: any = [];
        query.code
            ? (filter = [...filter, { name: { contains: query.code } }])
            : null;
        query.code
            ? (filter = [...filter, { code: { contains: query.code } }])
            : null;
        if (filter.length > 0) {
            filter = {
                OR: [...filter],
            };
        }
        const data = await Model.products.findMany({
            where: {
                ...filter,
                categoryId: { contains: query.categoryId },
                ownerId: owner.id,
            },
            select: {
                categories: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                stocks: {
                    select: {
                        id: true,
                        productId: true,
                        quantity: true,
                        storeId: true,
                    },
                    where: {
                        storeId: query.storeId ?? "",
                    },
                },
                productConversions: {
                    select: {
                        id: true,
                        quantity: true,
                        unitId: true,
                        status: true,
                        units: {
                            select: {
                                id: true,
                                name: true,
                                ownerId: true,
                            },
                        },
                        productSellPrices: {
                            select: {
                                id: true,
                                price: true,
                                storeId: true,
                                conversionId: true,
                            },
                            // where: {
                            //     storeId: query.storeId
                            // },
                            orderBy: {
                                level: "asc",
                            },
                        },
                    },
                    orderBy: {
                        quantity: "asc",
                    },
                },
                categoryId: true,
                id: true,
                name: true,
                barcode: true,
                code: true,
                image: true,
                ownerId: true,
                sku: true,
                isStock: true,
            },
            orderBy: {
                name: "asc",
            },
            skip: skip,
            take: take,
        });

        const total = await Model.products.count({
            where: {
                ...filter,
            },
        });
        res.status(200).json({
            status: true,
            message: "successful in getting product data",
            data: {
                product: data,
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

const postData = async (req: Request, res: Response) => {
    try {
        const ownerId: any = await getOwnerId(
            res.locals.userId,
            res.locals.userType
        );
        if (!ownerId.status) throw new Error("Owner not found");
        const data = { ...req.body, ownerId: ownerId.id };
        let dataProduct: products & {
            price?: number;
            storeId?: string;
            isStock?: any;
        } = { ...data };
        // delete dataProduct.isStock;
        const conversion = data.price;
        const productId = uuidv4();
        await Model.$transaction(async (prisma) => {
            const createProduct = await prisma.products.create({
                data: {
                    name: dataProduct?.name,
                    id: productId,
                    isStock: dataProduct.isStock ? 1 : 0,
                    categoryId: dataProduct?.categoryId,
                    barcode: dataProduct?.barcode,
                    code: dataProduct?.code,
                    brandId: dataProduct?.brandId,
                    description: dataProduct?.description,
                    image: dataProduct?.image,
                    ownerId: ownerId?.id,
                    sku: dataProduct?.sku,
                },
            });
            let createProductConversion: any;
            let unitId = "";
            for (const value of conversion) {
                let conversionId = uuidv4();
                if (unitId !== value.unitId) {
                    createProductConversion =
                        await prisma.productConversions.create({
                            data: {
                                productId: productId,
                                unitId: value.unitId,
                                quantity: value.quantity,
                                id: conversionId,
                                status: value.type === "default" ? 1 : 0,
                            },
                        });
                    await prisma.productPurchasePrices.create({
                        data: {
                            id: uuidv4(),
                            conversionId: conversionId,
                            price: value.capital,
                            storeId: data.storeId,
                        },
                    });
                    unitId = value.unitId;
                }
                await prisma.productSellPrices.create({
                    data: {
                        id: uuidv4(),
                        conversionId: conversionId,
                        price: value.sell,
                        storeId: data.storeId,
                        level: value.level ?? 1,
                    },
                });
                unitId = value.unitId;
            }
            return { createProduct, createProductConversion };
        });
        res.status(200).json({
            status: true,
            message: "successful in created user data",
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const updateData = async (req: Request, res: Response) => {
    try {
        const data = { ...req.body };
        let dataProduct = { ...data };
        delete dataProduct.price;
        delete dataProduct.storeId;
        delete dataProduct.idDelete;
        const conversion = data.price;

        // Mulai transaksi
        await Model.$transaction(async (prisma) => {
            const createProduct = await prisma.products.update({
                data: {
                    ...dataProduct,
                    isStock: dataProduct.isStock ? 1 : 0,
                },
                where: {
                    id: dataProduct.id,
                },
            });

            for (const value of conversion) {
                if (value.id) {
                    // Update existing conversion and prices
                    await prisma.productConversions.update({
                        data: {
                            unitId: value.unitId,
                            quantity: value.quantity,
                            status: value.type === "default" ? 1 : 0,
                        },
                        where: {
                            id: value.id,
                        },
                    });

                    await prisma.productPurchasePrices.updateMany({
                        data: {
                            price: value.capital,
                            storeId: data.storeId,
                        },
                        where: {
                            conversionId: value.id,
                        },
                    });

                    await prisma.productSellPrices.updateMany({
                        data: {
                            price: value.sell,
                            storeId: data.storeId,
                            level: value.level ?? 1,
                        },
                        where: {
                            conversionId: value.id,
                        },
                    });
                } else {
                    // Create new conversion and prices
                    const conversionId = uuidv4();
                    await prisma.productConversions.create({
                        data: {
                            productId: dataProduct.id,
                            unitId: value.unitId,
                            quantity: value.quantity,
                            id: conversionId,
                            status: value.type === "default" ? 1 : 0,
                        },
                    });

                    await prisma.productPurchasePrices.create({
                        data: {
                            id: uuidv4(),
                            conversionId: conversionId,
                            price: value.capital,
                            storeId: data.storeId,
                        },
                    });

                    await prisma.productSellPrices.create({
                        data: {
                            id: uuidv4(),
                            conversionId: conversionId,
                            price: value.sell,
                            storeId: data.storeId,
                            level: value.level ?? 1,
                        },
                    });
                }
            }
            for (const value of data.idDelete) {
                await prisma.productConversions.delete({
                    where: {
                        id: value,
                    },
                });
            }
        });
        // Berhasil
        res.status(200).json({
            status: true,
            message: "Berhasil memperbarui data produk",
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const deleteData = async (req: Request, res: Response) => {
    try {
        await Model.products.delete({
            where: {
                id: req.params.id,
            },
        });
        res.status(200).json({
            status: false,
            message: "successfully in deleted Product data",
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
        const model = await Model.products.findUnique({
            where: {
                id: req.params.id,
            },
            include: {
                categories: true,
                stocks: true,
                brands: true,
                productConversions: {
                    include: {
                        units: true,
                        productPurchasePrices: true,
                        productSellPrices: true,
                    },
                    orderBy: {
                        quantity: "asc",
                    },
                },
            },
        });
        if (!model) throw new Error("data not found");
        res.status(200).json({
            status: true,
            message: "successfully in get Product data",
            data: {
                product: model,
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

const uploadImage = async (req: Request, res: Response) => {
    try {
        res.status(200).json({
            code: 1,
            status: 200,
            message: "Successfully upload",
            data: req?.file?.filename ?? "",
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            errors: `${error}`,
        });
    }
};

const getPriceMember = async (req: Request, res: Response) => {
    try {
        type GetPriceMemberType = {
            productId: string;
            memberId: string;
            storeId?: string;
            conversionId: string;
            price?: number;
        };

        const query: GetPriceMemberType[] = req.body ?? [];
        let tmpData: GetPriceMemberType[] = [];
        for (const value of query) {
            const member = await Model.members.findUnique({
                where: {
                    id: value.memberId as string,
                },
            });
            const data = await Model.productSellPrices.findFirst({
                where: {
                    conversionId: value.conversionId as string,
                    level: parseInt(member?.level + ""),
                },
            });
            tmpData = [
                ...tmpData,
                {
                    productId: value.productId as string,
                    price: data?.price ?? 0,
                    conversionId: data?.conversionId as string,
                    storeId: value.storeId as string,
                    memberId: value.memberId,
                },
            ];
        }
        res.status(200).json({
            status: true,
            message: "succes get data price member",
            data: tmpData,
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            errors: `${error}`,
        });
    }
};

export {
    getData,
    getProductSell,
    postData,
    updateData,
    deleteData,
    getDataById,
    uploadImage,
    getPriceMember,
};
