import Model from "#root/services/PrismaService";
import e, { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { handleValidationError } from "#root/helpers/handleValidationError";
import { errorType } from "#root/helpers/errorType";
import { v4 as uuidv4 } from 'uuid';
import { BrandQueryInterface } from "#root/interfaces/masters/BrandInterface";
import getOwnerId from "#root/helpers/GetOwnerId";
import moment from "moment";
import { DecrementStock, IncrementStock } from "#root/helpers/stock";

const getData = async (req:Request<{}, {}, {}, BrandQueryInterface>, res:Response) => {
    try {
        const query = req.query;
        // PAGING
        const take:number = parseInt(query.limit ?? 20 )
        const page:number = parseInt(query.page ?? 1 );
        const skip:number = (page-1)*take
        // FILTER
        let filter:any= []
        query.name ? filter = [...filter, {name: { contains: query.name }}] : null
        if(filter.length > 0){
            filter = {
                OR: [
                    ...filter
                ]
            }
        }
        const data = await Model.purchases.findMany({
            where: {
                ...filter
            },
            include: {
                suppliers: true,
            },
            skip: skip,
            take: take
        });
        const total = await Model.purchases.count({
            where: {
                ...filter
            }
        })
        
        res.status(200).json({
            status: true,
            message: "successful in getting Purchase data",
            data: {
                purchase: data,
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

const postData = async (req: Request, res: Response) => {
    const purchaseId = uuidv4();
    
    const transaction = async () => {
        const ownerId: any = await getOwnerId(res.locals.userId, res.locals.userType);
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
                total: data.total ?? 0
            };
            const createPurchase = await prisma.purchases.create({
                data: purchaseData,
            });

            for (const key in dataDetail) {
                const idDetail = uuidv4();
                await prisma.purchaseDetails.create({
                    data: {
                        id: idDetail,
                        purchaseId: purchaseData.id,
                        productId: key,
                        productConversionId: dataDetail[key].unitId,
                        quantity: dataDetail[key].quantity ?? 1,
                        price: dataDetail[key].price ?? 0,
                    }
                });

                const conversion = await prisma.productConversions.findFirst({
                    where: {
                        id: dataDetail[key].unitId
                    }
                });

                const increment = await IncrementStock(
                    prisma, 
                    key,
                    conversion?.quantity ?? 1,
                    data.storeId,
                    dataDetail[key].quantity
                );

                if (!increment.status) {
                    throw increment.message;
                }
            };

            return { createPurchase };
        });
    };

    try {
        const result = await transaction();
        res.status(200).json({
            status: true,
            message: 'Successful in created Purchase data',
            data: purchaseId
        });
    } catch (error) {
        // let message = { status: false, message: { msg: `${error}` } };
        // if (error instanceof Prisma.PrismaClientKnownRequestError) {
        //     message = await handleValidationError(error);
        // }
        res.status(500).json({
            status: 500,
            errors: error
        });
    } finally {
        await Model.$disconnect();
    }
};

const updateData = async (req:Request, res:Response) => {
    try {

        const data = { ...req.body};
        const dataDetail = data.detailItem
        const purchaseId = req.params.id
        const transaction = async () => {
            // Mulai transaksi
            await Model.$transaction(async (prisma) => {
                const purchaseData = {
                    supplierId: data.supplierId,
                    discount: data.discount,
                    payCash: data.pay ?? 0,
                    total: data.total ?? 0
                }
                const createPurchase = await prisma.purchases.update({
                    data: purchaseData,
                    where: {
                        id: purchaseId
                    }
                });

                let createPurchaseDetails:any;
                
                for (const key in dataDetail) {
                    let idDetail = dataDetail[key].purchaseDetailId;
                    if(idDetail){
                        if(dataDetail[key].quantity===0){
                            await prisma.purchaseDetails.delete({
                                where: {
                                    id: idDetail
                                }
                            });
                        }else{
                            createPurchaseDetails = await prisma.purchaseDetails.update({
                                data: {
                                    quantity: dataDetail[key].quantity,
                                    productConversionId: dataDetail[key].unitId,
                                    price: dataDetail[key].price ?? 0,
                                },
                                where: {
                                    id: idDetail
                                }
                            });
                        }
                    } else {
                        idDetail = uuidv4();
                        createPurchaseDetails = await prisma.purchaseDetails.create({data: {
                            id: idDetail,
                            purchaseId: purchaseId,
                            productId: key,
                            productConversionId: dataDetail[key].unitId,
                            quantity: dataDetail[key].quantity ?? 1,
                            price: dataDetail[key].price ?? 0,
                        }});
                    }
                    
                    const conversion = await prisma.productConversions.findFirst({
                        where: {
                            id: dataDetail[key].unitId
                        }
                    });

                    const increment = await IncrementStock(
                        prisma, 
                        key,
                        conversion?.quantity ?? 1,
                        data.storeId,
                        dataDetail[key].quantity
                    )
                    if(!increment.status){
                        console.log('kambing');
                        
                        throw increment.message;
                    };
                    console.log('ayam');
                    

                    await prisma.hppHistory.create({
                        data: {
                            id: uuidv4(),
                            // productConversionId: 
                        }
                    })
                };
                
                return { createPurchase, createPurchaseDetails };
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

        res.status(200).json({
            status: true,
            message: 'successful in updated Brand data'
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

const deleteData = async (req:Request, res:Response)=> {
    try {
        const model = await Model.purchases.findUnique({
            where: {
                id: req.params.id
            },
            include: {
                purchaseDetails: true,
            }
        });
        const detail = model?.purchaseDetails ?? [];
        
        for (const value of detail) {
            const conversion = await Model.productConversions.findFirst({
                where: {
                    id: value.productConversionId ?? ''
                }
            });

            await DecrementStock(
                Model,
                value.productId,
                conversion?.quantity ?? 1 ,
                model?.storeId ?? '',
                parseInt(value.quantity+'')
            );
        }
        await Model.purchases.delete({
            where: {
                id: req.params.id
            }
        });

        res.status(200).json({
            status: false,
            message: 'successfully in deleted Brand data'
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
        const model = await Model.brands.findUnique({
            where: {
                id: req.params.id
            }
        })
        
        if(!model) throw new Error('data not found')
        res.status(200).json({
            status: true,
            message: 'successfully in get Brand data',
            data: {
                Brand: model
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

const getSelect = async (req:Request, res:Response) => {
    try {
        let filter:any={};
        req.query.name ? filter={...filter, name: { contains: req.query?.name as string}} : null
        let dataOption:any=[];
        const data = await Model.brands.findMany({
            where: {
                ...filter
            },
            take:10
        });
        for (const value of data) {
            dataOption= [
                ...dataOption, {
                    id: value.id,
                    title: value.name
                }
            ]
        }
        res.status(200).json({
            status: true,
            message: 'successfully in get Brand data',
            data: {
                brand: dataOption
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

const getFacture = async (req:Request, res:Response) => {
    try {
        const id = req.query.id as string;
        const data = await Model.purchases.findUnique({
            where: {
                id: id??'',
            },
            select: {
                suppliers: {
                    select: {
                        name: true,
                        id: true
                    },
                },
                id:true,
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
                                    }
                                }
                            }
                        },
                        products: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        });

        let newData:any=[];
        const purchaseDetails = data?.purchaseDetails ?? []
        for (let index = 0; index < purchaseDetails.length; index++) {
            newData=[
                ...newData,
                {
                    product: purchaseDetails[index].products.name,
                    quantity: purchaseDetails[index].quantity,
                    price: purchaseDetails[index].price,
                    unit: purchaseDetails[index].productConversions?.units.name,
                }
            ]
        }
        res.status(200).json({
            status: true,
            message: 'successfully in get Brand data',
            data: {
                purchase: {
                    payCash: data?.payCash,
                    date: data?.date,
                    total: data?.total,
                    id: data?.id,
                    purchaseDetails: newData
                }
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

const getDataUpdate = async (req:Request, res:Response) => {
    try {
        const data = await Model.purchases.findUnique({
            where: {
                id: req.params.id
            },
            include: {
                purchaseDetails: {
                    include: {
                        products: true
                    }
                }
            }
        });
        let newData:any={};
        const dataDetail = data?.purchaseDetails ?? []
        for (const value of dataDetail) {
            newData= {
                ...newData,
                [value.productId] : {
                    quantity: value.quantity,
                    unit: value.productConversionId,
                    price: value.price,
                    product: value.products,
                    purchaseId: value.purchaseId,
                    purchaseDetailId: value.id
                }
            }
        }

        res.status(200).json({
            status: true,
            message: "Success get data purchase",
            data: {
                purchase: newData,
                id: req.params.id
            }
        })
    } catch (error) {
        console.log({error});
        
        res.status(500)
    }
}

export {
    getData,
    postData,
    updateData,
    deleteData,
    getDataById,
    getSelect,
    getFacture,
    getDataUpdate
}