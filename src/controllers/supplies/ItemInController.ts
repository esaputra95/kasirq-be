import Model from "#root/services/PrismaService";
import e, { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { handleValidationError } from "#root/helpers/handleValidationError";
import { errorType } from "#root/helpers/errorType";
import { v4 as uuidv4 } from 'uuid';
import { ItemInQueryInterface } from "#root/interfaces/supplies/itemInInterface";
import moment from "moment";
import { DecrementStock, IncrementStock } from "#root/helpers/stock";

const getData = async (req:Request<{}, {}, {}, ItemInQueryInterface>, res:Response) => {
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
        const data = await Model.itemIns.findMany({
            where: {
                ...filter
            },
            skip: skip,
            take: take
        });
        const total = await Model.itemIns.count({
            where: {
                ...filter
            }
        })
        
        res.status(200).json({
            status: true,
            message: "successful in getting ItemIn data",
            data: {
                ItemIn: data,
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
    const ItemInId = uuidv4();
    
    const transaction = async () => {
        const data = req.body;
        console.log({data});
        
        const dataDetail = data.detailItem;

        // Start transaction
        return Model.$transaction(async (prisma) => {
            const ItemInData = {
                id: ItemInId,
                date: moment().format(),
                storeId: data.storeId,
                invoice: uuidv4(),
                total: data.total ?? 0,
                description: data.description
            };
            const createItemIn = await prisma.itemIns.create({
                data: ItemInData,
            });

            for (const key in dataDetail) {
                const idDetail = uuidv4();
                await prisma.itemInDetails.create({
                    data: {
                        id: idDetail,
                        itemInId: ItemInData.id,
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

            return { createItemIn };
        });
    };

    try {
        const result = await transaction();
        res.status(200).json({
            status: true,
            message: 'Successful in created ItemIn data',
            data: ItemInId
        });
    } catch (error) {
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
        const ItemInId = req.params.id
        const transaction = async () => {
            // Mulai transaksi
            await Model.$transaction(async (prisma) => {
                const ItemInData = {
                    supplierId: data.supplierId,
                    discount: data.discount,
                    payCash: data.pay ?? 0,
                    total: data.total ?? 0
                }
                const createItemIn = await prisma.itemIns.update({
                    data: ItemInData,
                    where: {
                        id: ItemInId
                    }
                });

                let createItemInDetails:any;
                
                for (const key in dataDetail) {
                    let idDetail = dataDetail[key].ItemInDetailId;
                    if(idDetail){
                        if(dataDetail[key].quantity===0){
                            await prisma.itemInDetails.delete({
                                where: {
                                    id: idDetail
                                }
                            });
                        }else{
                            createItemInDetails = await prisma.itemInDetails.update({
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
                        createItemInDetails = await prisma.itemInDetails.create({data: {
                            id: idDetail,
                            itemInId: ItemInId,
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
                
                return { createItemIn, createItemInDetails };
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
            message: 'successful in updated ItemIn data'
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
        const model = await Model.itemIns.findUnique({
            where: {
                id: req.params.id
            },
            include: {
                itemInDetails: true
            }
        });
        const detail = model?.itemInDetails ?? [];
        
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
        await Model.itemIns.delete({
            where: {
                id: req.params.id
            }
        });

        res.status(200).json({
            status: false,
            message: 'successfully in deleted ItemIn data'
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
        const model = await Model.itemIns.findUnique({
            where: {
                id: req.params.id
            }
        })
        
        if(!model) throw new Error('data not found')
        res.status(200).json({
            status: true,
            message: 'successfully in get ItemIn data',
            data: {
                ItemIn: model
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
        const data = await Model.itemIns.findMany({
            where: {
                ...filter
            },
            take:10
        });
        for (const value of data) {
            dataOption= [
                ...dataOption, {
                    id: value.id,
                    title: value.date
                }
            ]
        }
        res.status(200).json({
            status: true,
            message: 'successfully in get ItemIn data',
            data: {
                ItemIn: dataOption
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
        const data = await Model.itemIns.findUnique({
            where: {
                id: id??'',
            },
            select: {
                id:true,
                date: true,
                total: true,
                itemInDetails: {
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
        const ItemInDetails = data?.itemInDetails ?? []
        for (let index = 0; index < ItemInDetails.length; index++) {
            newData=[
                ...newData,
                {
                    product: ItemInDetails[index].products.name,
                    quantity: ItemInDetails[index].quantity,
                    price: ItemInDetails[index].price,
                    unit: ItemInDetails[index].productConversions?.units.name,
                }
            ]
        }
        res.status(200).json({
            status: true,
            message: 'successfully in get ItemIn data',
            data: {
                ItemIn: {
                    payCash: 0,
                    date: data?.date,
                    total: data?.total,
                    id: data?.id,
                    ItemInDetails: []
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
        const data = await Model.itemIns.findUnique({
            where: {
                id: req.params.id
            },
            include: {
                itemInDetails: {
                    include: {
                        products: true
                    }
                }
            }
        });
        let newData:any={};
        const dataDetail = data?.itemInDetails ?? []
        for (const value of dataDetail) {
            newData= {
                ...newData,
                [value.productId] : {
                    quantity: value.quantity,
                    unit: value.productConversionId,
                    price: value.price,
                    product: value.products,
                    itemInId: value.itemInId,
                    itemInDetailId: value.id
                }
            }
        }

        res.status(200).json({
            status: true,
            message: "Success get data ItemIn",
            data: {
                ItemIn: newData,
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