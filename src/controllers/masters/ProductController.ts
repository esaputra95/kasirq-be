import bcrypt from "bcryptjs";
import Model from "#root/services/PrismaService";
import { Request, Response } from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import { handleValidationError } from "#root/helpers/handleValidationError";
import { errorType } from "#root/helpers/errorType";
import { ProductQueryInterface } from "#root/interfaces/masters/ProductInterface";
import { v4 as uuidv4 } from 'uuid';
import getOwnerId from "#root/helpers/GetOwnerId";

const getData = async (req:Request<{}, {}, {}, ProductQueryInterface>, res:Response) => {
    try {
        const query = req.query;
        // PAGING
        const take:number = parseInt(query.limit ?? 20 )
        const page:number = parseInt(query.page ?? 1 );
        const skip:number = (page-1)*take
        // FILTER
        let filter:any= []
        query.name ? filter = [...filter, {name: { contains: query.name }}] : null
        query.code ? filter = [...filter, {code: { contains: query.code }}] : null
        // query.categoryId ? filter = [...filter, {categoriId: { contains: query.categoryId }}] : null;

        
        if(filter.length > 0){
            filter = {
                OR: [
                    ...filter
                ]
            }
        }

        const data = await Model.products.findMany({
            where: {
                ...filter,
                categoryId: { contains: query.categoryId }
            },
            select: {
                categories: {
                    select: {
                        id: true,
                        name: true
                    },
                },
                stocks: {
                    select: {
                        id: true,
                        productId: true,
                        quantity: true,
                        storeId: true,
                    }
                },
                productConversions: {
                    select: {
                        id: true,
                        quantity: true,
                        unitId: true,
                        status:  true,
                        units: {
                            select: {
                                id: true,
                                name: true,
                                ownerId: true,
                            }
                        },
                        productPurchasePrices: {
                            select: {
                                id: true,
                                price: true, 
                                storeId: true,
                                conversionId: true,
                            }
                        },
                        productSellPrices: {
                            select: {
                                id: true,
                                price: true,
                                storeId: true,
                                conversionId: true,
                            },
                        }
                    },
                    orderBy: {
                        quantity: 'asc'
                    }
                },
                categoryId: true,
                id: true,
                name: true,
                barcode: true,
                code: true,
                image: true, 
                ownerId: true, 
                sku: true,
            },
            skip: skip,
            take: take
        });
        const total = await Model.products.count({
            where: {
                ...filter
            }
        });
        res.status(200).json({
            status: true,
            message: "successful in getting product data",
            data: {
                product: data,
                info:{
                    page: page,
                    limit: take,
                    total: total
                }
            }
        })
    } catch (error) {
        let message = errorType
        message.message.msg = `${error}`
        res.status(500).json({
            status: message.status,
            errors: [
                message.message
            ]
        })
    }
}

const getProductSell = async (req:Request<{}, {}, {}, ProductQueryInterface>, res:Response) => {
    try {
        const query = req.query;
        // PAGING
        const take:number = parseInt(query.limit ?? 20 )
        const page:number = parseInt(query.page ?? 1 );
        const skip:number = (page-1)*take
        // FILTER
        let filter:any= []
        query.name ? filter = [...filter, {name: { contains: query.name }}] : null
        query.code ? filter = [...filter, {code: { contains: query.code }}] : null
        if(filter.length > 0){
            filter = {
                OR: [
                    ...filter
                ]
            }
        }
        const data = await Model.products.findMany({
            where: {
                ...filter,
                categoryId: { contains: query.categoryId }
            },
            select: {
                categories: {
                    select: {
                        id: true,
                        name: true
                    },
                },
                stocks: {
                    select: {
                        id: true,
                        productId: true,
                        quantity: true,
                        storeId: true,
                    }
                },
                productConversions: {
                    select: {
                        id: true,
                        quantity: true,
                        unitId: true,
                        status:  true,
                        units: {
                            select: {
                                id: true,
                                name: true,
                                ownerId: true,
                            }
                        },
                        productSellPrices: {
                            select: {
                                id: true,
                                price: true,
                                storeId: true,
                                conversionId: true,
                            }
                        }
                    },
                    orderBy: {
                        quantity: 'asc'
                    }
                },
                categoryId: true,
                id: true,
                name: true,
                barcode: true,
                code: true,
                image: true, 
                ownerId: true, 
                sku: true,
            },
            skip: skip,
            take: take
        });
        const total = await Model.products.count({
            where: {
                ...filter
            }
        })
        res.status(200).json({
            status: true,
            message: "successful in getting product data",
            data: {
                product: data,
                info:{
                    page: page,
                    limit: take,
                    total: total
                }
            }
        })
    } catch (error) {
        console.log({error});
        
        let message = errorType
        message.message.msg = `${error}`
        res.status(500).json({
            status: message.status,
            errors: [
                message.message
            ]
        })
    }
}

const postData = async (req:Request, res:Response) => {
    try {
        console.log('sampai');
        
        const ownerId:any = await getOwnerId(res.locals.userId, res.locals.userType)
        if(!ownerId.status) throw new Error('Owner not found')
        const data = { ...req.body, ownerId: ownerId.id};
        let dataProduct = {...data};
        console.log({dataProduct});
        
        delete dataProduct.price;
        delete dataProduct.storeId;
        // delete dataProduct.isStock;
        const conversion = data.price;
        const productId = uuidv4();
        const transaction = async () => {
            // Mulai transaksi
            await Model.$transaction(async (prisma) => {
                const createProduct = await prisma.products.create({
                    data: {
                        ...dataProduct,
                        id: productId,
                        isStock: dataProduct.isStock ? 1 : 0
                    },
                });
                let createProductConversion:any
                for (const value of conversion) {
                    const conversionId = uuidv4()
                    createProductConversion = await prisma.productConversions.create({
                        data: {
                            productId: productId,
                            unitId: value.unitId,
                            quantity: value.quantity,
                            id: conversionId,
                            status: value.type === "default" ? 1 : 0
                        }
                    });
                    await prisma.productPurchasePrices.create({
                        data: {
                            id: uuidv4(),
                            conversionId: conversionId,
                            price: value.capital,
                            storeId: data.storeId
                        }
                    })
                    await prisma.productSellPrices.create({
                        data: {
                            id: uuidv4(),
                            conversionId: conversionId,
                            price: value.sell,
                            storeId: data.storeId,
                            level: value.level ?? 1
                        }
                    })

                }
                return { createProduct, createProductConversion };
            });
        }
        
        transaction()
            .catch((e) => {
                console.error(e);
                process.exit(1);
            })
            .finally(async () => {
                await Model.$disconnect();
            });
        // await Model.products.create({data: data});
        res.status(200).json({
            status: true,
            message: 'successful in created user data'
        })
    } catch (error) {
        console.log({error});
        
        let message = errorType
        message.message.msg = `${error}`
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            message =  await handleValidationError(error)
        }
        res.status(500).json({
            status: message.status,
            errors: [
                message.message
            ]
        })
    }
}

const updateData = async (req:Request, res:Response) => {
    try {
        const salt = await bcrypt.genSalt();
        const data = { ...req.body};
        if(!req.body.password){
            delete data.password
        }else{
            data.password = await bcrypt.hash(req.body.password, salt);
        }
        await Model.users.update({
            where: {
                id: req.params.id
            },
            data: data
        });
        res.status(200).json({
            status: true,
            message: 'successful in updated user data'
        })
    } catch (error) {
        let message = errorType
        message.message.msg = `${error}`
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            message =  await handleValidationError(error)
        }
        res.status(500).json({
            status: message.status,
            errors: [
                message.message
            ]
        })
    }
}

const deleteData = async (req:Request, res:Response)=> {
    try {
        await Model.products.delete({
            where: {
                id: req.params.id
            }
        })
        res.status(200).json({
            status: false,
            message: 'successfully in deleted Product data'
        })
    } catch (error) {
        console.log({error});
        
        let message = {
            status:500,
            message: { msg: `${error}` }
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            message =  await handleValidationError(error)
        }
        res.status(500).json({
            status: message.status,
            errors: [
                message.message
            ]
        })
    }
}

const getDataById = async (req:Request, res:Response) => {
    try {
        const model = await Model.products.findUnique({
            where: {
                id: req.params.id
            },
            include: {
                categories: true,
                stocks: true,
                brands: true,
                productConversions: {
                    include: {
                        units: true,
                        productPurchasePrices: true,
                        productSellPrices: true
                    }
                }
            },
        })
        if(!model) throw new Error('data not found')
        res.status(200).json({
            status: true,
            message: 'successfully in get Product data',
            data: {
                product: model
            }
        })
    } catch (error) {
        let message = {
            status:500,
            message: { msg: `${error}` }
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            message =  await handleValidationError(error)
        }
        res.status(500).json({
            status: message.status,
            errors: [
                message.message
            ]
        })
    }
}

const uploadImage = async (req:Request, res:Response) => {
    try {
        // console.log(req ?? '');
        
        res.status(200).json({
            code:1,
            status:200,
            message: "Successfully upload",
            data: req?.file?.filename??''
        })
    } catch (error) {
        console.log({error});
        
        res.status(500).json({
            status: false,
            errors: `${error}`
        })
    }
}

export {
    getData,
    getProductSell,
    postData,
    updateData,
    deleteData,
    getDataById,
    uploadImage
}