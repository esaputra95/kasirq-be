import Model from "#root/services/PrismaService";
import { ProductQueryInterface } from "#root/interfaces/masters/ProductInterface";
import { v4 as uuidv4 } from "uuid";
import getOwnerId from "#root/helpers/GetOwnerId";
import { ValidationError } from "#root/helpers/handleErrors";

/**
 * Get products with complex nested relations
 */
export const getProducts = async (
    query: ProductQueryInterface,
    userId: string,
    userLevel: string,
) => {
    const owner: any = await getOwnerId(userId, userLevel);
    const take: number = parseInt(query.limit ?? "20");
    const page: number = parseInt(query.page ?? "1");
    const skip: number = (page - 1) * take;

    let filter: any = [];
    if (query.code) {
        filter.push({ name: { contains: query.code } });
        filter.push({ code: { contains: query.code } });
    }

    const whereClause: any =
        filter.length > 0
            ? {
                  OR: filter,
                  categoryId: { contains: query.categoryId },
                  ownerId: owner.id,
                  status: "active",
              }
            : {
                  categoryId: { contains: query.categoryId },
                  ownerId: owner.id,
                  status: "active",
              };

    const [data, total] = await Promise.all([
        Model.products.findMany({
            where: whereClause,
            select: {
                categories: { select: { id: true, name: true } },
                stocks: {
                    select: {
                        id: true,
                        productId: true,
                        quantity: true,
                        storeId: true,
                    },
                    where: { storeId: query.storeId ?? "" },
                },
                productConversions: {
                    select: {
                        id: true,
                        quantity: true,
                        unitId: true,
                        status: true,
                        units: {
                            select: { id: true, name: true, ownerId: true },
                        },
                        productPurchasePrices: {
                            select: {
                                id: true,
                                price: true,
                                storeId: true,
                                conversionId: true,
                            },
                        },
                        productSellPrices: {
                            select: {
                                id: true,
                                price: true,
                                storeId: true,
                                conversionId: true,
                            },
                        },
                    },
                    orderBy: { quantity: "asc" },
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
                status: true,
            },
            orderBy: { name: "asc" },
            skip,
            take,
        }),
        Model.products.count({ where: whereClause }),
    ]);

    return {
        message: "successful in getting product data",
        data: {
            product: data.sort((a, b) => a.name.localeCompare(b.name)),
            info: { page, limit: take, total },
        },
    };
};

/**
 * Get products for selling (simplified relations)
 */
export const getProductsForSell = async (
    query: ProductQueryInterface,
    userId: string,
    userLevel: string,
) => {
    const owner: any = await getOwnerId(userId, userLevel);
    const take: number = parseInt(query.limit ?? "20");
    const page: number = parseInt(query.page ?? "1");
    const skip: number = (page - 1) * take;

    let filter: any = [];
    if (query.code) {
        filter.push({ name: { contains: query.code } });
        filter.push({ code: { contains: query.code } });
    }

    const whereClause: any =
        filter.length > 0
            ? {
                  OR: filter,
                  categoryId: { contains: query.categoryId },
                  ownerId: owner.id,
                  status: "active",
              }
            : {
                  categoryId: { contains: query.categoryId },
                  ownerId: owner.id,
                  status: "active",
              };

    const [data, total] = await Promise.all([
        Model.products.findMany({
            where: whereClause,
            select: {
                categories: { select: { id: true, name: true } },
                stocks: {
                    select: {
                        id: true,
                        productId: true,
                        quantity: true,
                        storeId: true,
                    },
                    where: { storeId: query.storeId ?? "" },
                },
                productConversions: {
                    select: {
                        id: true,
                        quantity: true,
                        unitId: true,
                        status: true,
                        units: {
                            select: { id: true, name: true, ownerId: true },
                        },
                        productSellPrices: {
                            select: {
                                id: true,
                                price: true,
                                storeId: true,
                                conversionId: true,
                            },
                            orderBy: { level: "asc" },
                        },
                    },
                    orderBy: { quantity: "asc" },
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
                status: true,
            },
            orderBy: { name: "asc" },
            skip,
            take,
        }),
        Model.products.count({ where: whereClause }),
    ]);

    return {
        message: "successful in getting product data",
        data: { product: data, info: { page, limit: take, total } },
    };
};

/**
 * Create product with conversions and prices (transaction)
 */
export const createProduct = async (
    productData: any,
    userId: string,
    userLevel: string,
) => {
    const owner: any = await getOwnerId(userId, userLevel);
    if (!owner.status)
        throw new ValidationError("Owner not found", 404, "owner");

    const data = { ...productData, ownerId: owner.id };
    const conversion = data.price;
    const productId = uuidv4();

    await Model.$transaction(async (prisma) => {
        await prisma.products.create({
            data: {
                name: data.name,
                id: productId,
                isStock: data.isStock ? 1 : 0,
                categoryId: data.categoryId,
                barcode: data.barcode,
                code: data.code,
                brandId: data.brandId,
                description: data.description,
                image: data.image,
                ownerId: owner.id,
                sku: data.sku,
                status: data?.status ?? "active",
            },
        });

        let unitId = "";
        for (const value of conversion) {
            let conversionId = uuidv4();
            if (unitId !== value.unitId) {
                await prisma.productConversions.create({
                    data: {
                        productId,
                        unitId: value.unitId,
                        quantity: value.quantity,
                        id: conversionId,
                        status: value.type === "default" ? 1 : 0,
                    },
                });

                await prisma.productPurchasePrices.create({
                    data: {
                        id: uuidv4(),
                        conversionId,
                        price: value.capital,
                        storeId: data.storeId,
                    },
                });
                unitId = value.unitId;
            }

            await prisma.productSellPrices.create({
                data: {
                    id: uuidv4(),
                    conversionId,
                    price: value.sell,
                    storeId: data.storeId,
                    level: value.level ?? 1,
                },
            });
            unitId = value.unitId;
        }

        // Handle components for package and formula types
        if (
            (data.type === "package" || data.type === "formula") &&
            Array.isArray(data.components)
        ) {
            for (const comp of data.components) {
                // Find smallest conversion for componentId
                const smallestConversion =
                    await prisma.productConversions.findFirst({
                        where: { productId: comp.componentId },
                        orderBy: { quantity: "asc" },
                    });

                await prisma.productComponents.create({
                    data: {
                        id: uuidv4(),
                        productId,
                        componentId: comp.componentId,
                        conversionId: smallestConversion?.id,
                        quantity: parseInt(comp.quantity ?? 0),
                        type: data.type as "package" | "formula",
                        userCreate: userId,
                    },
                });
            }
        }
    });

    return { message: "successful in created user data" };
};

/**
 * Update product with conversions and prices (transaction)
 */
export const updateProduct = async (
    productData: any,
    userId: string,
    userLevel: string,
) => {
    const data = { ...productData };
    let dataProduct = { ...data };
    delete dataProduct.price;
    delete dataProduct.storeId;
    delete dataProduct.idDelete;
    delete dataProduct.components;
    const conversion = data.price;

    // SECURITY: Verify ownership before update
    const existingProduct = await Model.products.findUnique({
        where: { id: dataProduct.id },
    });

    if (!existingProduct) {
        throw new ValidationError("Product not found", 404, "product");
    }

    const owner: any = await getOwnerId(userId, userLevel);
    if (existingProduct.ownerId !== owner.id) {
        throw new ValidationError(
            "Unauthorized to update this product",
            403,
            "product",
        );
    }

    await Model.$transaction(async (prisma) => {
        await prisma.products.update({
            data: {
                // ...dataProduct,
                name: dataProduct.name,
                code: dataProduct.code,
                barcode: dataProduct.barcode,
                categoryId: dataProduct.categoryId,
                brandId: dataProduct.brandId,
                description: dataProduct.description,
                image: dataProduct.image,
                sku: dataProduct.sku,
                type: dataProduct.type,
                isStock: dataProduct.isStock ? 1 : 0,
                status: data?.status ?? "active",
            },
            where: { id: dataProduct.id },
        });

        for (const value of conversion) {
            if (value.id) {
                // Update existing
                await prisma.productConversions.update({
                    data: {
                        unitId: value.unitId,
                        quantity: value.quantity,
                        status: value.type === "default" ? 1 : 0,
                    },
                    where: { id: value.id },
                });

                await prisma.productPurchasePrices.updateMany({
                    data: {
                        price: value.capital,
                        storeId: data.storeId,
                    },
                    where: { conversionId: value.id },
                });

                await prisma.productSellPrices.updateMany({
                    data: {
                        price: value.sell,
                        storeId: data.storeId,
                        level: value.level ?? 1,
                    },
                    where: { conversionId: value.id },
                });
            } else {
                // Create new
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
                        conversionId,
                        price: value.capital,
                        storeId: data.storeId,
                    },
                });

                await prisma.productSellPrices.create({
                    data: {
                        id: uuidv4(),
                        conversionId,
                        price: value.sell,
                        storeId: data.storeId,
                        level: value.level ?? 1,
                    },
                });
            }
        }

        // Delete removed conversions (safe array handling)
        const idsToDelete = Array.isArray(data.idDelete) ? data.idDelete : [];
        for (const value of idsToDelete) {
            if (value) {
                await prisma.productConversions.delete({
                    where: { id: value },
                });
            }
        }

        // Handle components for package and formula types
        if (data.type === "package" || data.type === "formula") {
            // Delete existing components
            await prisma.productComponents.deleteMany({
                where: { productId: dataProduct.id },
            });

            if (Array.isArray(data.components)) {
                for (const comp of data.components) {
                    // Find smallest conversion for componentId
                    const smallestConversion =
                        await prisma.productConversions.findFirst({
                            where: { productId: comp.componentId },
                            orderBy: { quantity: "asc" },
                        });

                    await prisma.productComponents.create({
                        data: {
                            id: uuidv4(),
                            productId: dataProduct.id,
                            componentId: comp.componentId,
                            conversionId: smallestConversion?.id,
                            quantity: parseInt(comp.quantity ?? 0),
                            type: data.type as "package" | "formula",
                            userCreate: userId,
                        },
                    });
                }
            }
        } else {
            // If type changed to something else, remove components
            await prisma.productComponents.deleteMany({
                where: { productId: dataProduct.id },
            });
        }
    });

    return { message: "Berhasil memperbarui data produk" };
};

/**
 * Delete product
 */
export const deleteProduct = async (
    id: string,
    userId: string,
    userLevel: string,
) => {
    // SECURITY: Verify ownership before delete
    const existingProduct = await Model.products.findUnique({
        where: { id },
    });

    if (!existingProduct) {
        throw new ValidationError("Product not found", 404, "product");
    }

    const owner: any = await getOwnerId(userId, userLevel);
    if (existingProduct.ownerId !== owner.id) {
        throw new ValidationError(
            "Unauthorized to delete this product",
            403,
            "product",
        );
    }

    await Model.products.delete({ where: { id } });
    return { message: "successfully in deleted Product data" };
};

/**
 * Get product by ID with all relations
 */
export const getProductById = async (id: string) => {
    const product = await Model.products.findUnique({
        where: { id },
        select: {
            categories: { select: { id: true, name: true } },
            productConversions: {
                select: {
                    id: true,
                    quantity: true,
                    status: true,
                    unitId: true,
                    units: { select: { id: true, name: true, ownerId: true } },
                    productPurchasePrices: {
                        select: {
                            conversionId: true,
                            id: true,
                            price: true,
                            storeId: true,
                        },
                    },
                    productSellPrices: {
                        select: {
                            conversionId: true,
                            id: true,
                            level: true,
                            price: true,
                            storeId: true,
                        },
                        orderBy: { level: "asc" },
                    },
                },
                orderBy: { quantity: "asc" },
            },
            barcode: true,
            categoryId: true,
            id: true,
            image: true,
            isStock: true,
            name: true,
            ownerId: true,
            sku: true,
            code: true,
            description: true,
            brandId: true,
            status: true,
            type: true,
            components: {
                select: {
                    id: true,
                    componentId: true,
                    conversionId: true,
                    quantity: true,
                    type: true,
                    productId: true,
                    status: true,
                    component: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
        },
    });

    if (!product) throw new ValidationError("data not found", 404, "product");

    return {
        message: "successfully in get user data",
        data: { product },
    };
};

/**
 * Get member-specific pricing
 */
export const getPriceMember = async (
    query: Array<{
        productId: string;
        memberId: string;
        storeId?: string;
        conversionId: string;
        price?: number;
    }>,
) => {
    let tmpData: any[] = [];

    for (const value of query) {
        const member = await Model.members.findUnique({
            where: { id: value.memberId },
        });

        const data = await Model.productSellPrices.findFirst({
            where: {
                conversionId: value.conversionId,
                level: parseInt(member?.level + ""),
            },
        });

        tmpData.push({
            productId: value.productId,
            price: data?.price ?? 0,
            conversionId: data?.conversionId ?? "",
            storeId: value.storeId ?? "",
            memberId: value.memberId,
        });
    }

    return {
        message: "succes get data price member",
        data: tmpData,
    };
};
