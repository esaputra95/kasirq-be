import Model from "#root/services/PrismaService";
import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { handleValidationError } from "#root/helpers/handleValidationError";
import { errorType } from "#root/helpers/errorType";
import { v4 as uuidv4 } from 'uuid';
import { SalesQueryInterface } from "#root/interfaces/sales/SalesInterface";
import moment from "moment";
import { DecrementStock, GetHpp, IncrementStock } from "#root/helpers/stock";
import formatter from "#root/helpers/formatCurrency";

const getData = async (req:Request<{}, {}, {}, SalesQueryInterface>, res:Response) => {
    try {
        const query = req.query;
        // PAGING
        const take:number = parseInt(query.limit ?? 20 )
        const page:number = parseInt(query.page ?? 1 );
        const skip:number = (page-1)*take
        // FILTER
        let filter:any= []
        query.invoice ? filter = [...filter, {name: { contains: query.invoice }}] : null
        if(filter.length > 0){
            filter = {
                OR: [
                    ...filter
                ]
            }
        }
        const data = await Model.sales.findMany({
            where: {
                ...filter,
                storeId: query.storeId
            },
            skip: skip,
            take: take
        });
        const total = await Model.sales.count({
            where: {
                ...filter
            }
        })
        
        res.status(200).json({
            status: true,
            message: "successful in getting sales data",
            data: {
                sales: data,
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
    const salesId = uuidv4();
    const data = req.body;
    const transaction = async () => {
        const dataDetail = data.detailItem;
        // Start transaction
        return Model.$transaction(async (prisma) => {
            const salesData = {
                id: salesId,
                date: moment().format(),
                storeId: data.storeId,
                accountCashId: data.accountId,
                memberId: data.memberId,
                invoice: uuidv4(),
                subTotal: parseInt(data.subTotal ?? 0),
                total: parseInt(data.subTotal ?? 0)-parseInt(data.discount??0),
                description: data.description,
                userCreate: res.locals.userId,
                discount: parseInt(data.discount??0),
                payCash: parseInt(data.pay??0),
            };
            const createSales = await prisma.sales.create({
                data: salesData,
            });

            for (const key in dataDetail) {
                const idDetail = uuidv4();
                const saleDetail = await prisma.saleDetails.create({
                    data: {
                        id: idDetail,
                        saleId: salesData.id,
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

                const increment = await DecrementStock(
                    prisma, 
                    key,
                    data.storeId,
                    dataDetail[key].quantity * (conversion?.quantity ?? 1)
                );
                
                const hpp = await GetHpp({
                    prisma, 
                    storeId: data.storeId, 
                    quantityNeed: dataDetail[key].quantity, 
                    productId: key
                });

                console.log(JSON.stringify(hpp));
                
                
                for (const value of hpp.hpp) {
                    await prisma.cogs.create({
                        data: {
                            id: uuidv4(),
                            hppHistoryId: value.hppHistoryId,
                            saleDetailId: idDetail,
                            price: value.price,
                            quantity: value.quantity
                        }
                    })
                    await prisma.hppHistory.update({
                        data: { 
                            quantityUsed: {
                                increment: value.quantity
                            }
                        },
                        where: {
                            id: value.hppHistoryId
                        }
                    })
                }

                if (!increment.status) {
                    throw increment.message;
                }
            };

            return { createSales };
        });
    };

    try {
        await transaction();
        res.status(200).json({
            status: true,
            message: 'Successful in created sales data',
            data: salesId,
            remainder: (parseInt(data?.pay ?? 0)-(parseInt(data.subTotal ?? 0)-parseInt(data.discount??0)))
        });
    } catch (error) {
        console.log({error});
        
        res.status(500).json({
            status: 500,
            errors: error
        });
    }
};

const updateData = async (req:Request, res:Response) => {
    try {

        const data = { ...req.body};
        const dataDetail = data.detailItem
        const salesId = req.params.id
        const transaction = async () => {
            // Mulai transaksi
            await Model.$transaction(async (prisma) => {
                const salesData = {
                    supplierId: data.supplierId,
                    discount: data.discount,
                    payCash: data.pay ?? 0,
                    total: data.total ?? 0
                }
                const createsales = await prisma.sales.update({
                    data: salesData,
                    where: {
                        id: salesId
                    }
                });

                let createsalesDetails:any;
                
                for (const key in dataDetail) {
                    let idDetail = dataDetail[key].salesDetailId;
                    if(idDetail){
                        if(dataDetail[key].quantity===0){
                            await prisma.saleDetails.delete({
                                where: {
                                    id: idDetail
                                }
                            });
                        }else{
                            createsalesDetails = await prisma.saleDetails.update({
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
                        createsalesDetails = await prisma.saleDetails.create({data: {
                            id: idDetail,
                            saleId: salesId,
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
                        data.storeId,
                        dataDetail[key].quantity * (conversion?.quantity ?? 1)
                    )
                    if(!increment.status){
                        throw increment.message;
                    };
                    // await prisma.hppHistory.create({
                    //     data: {
                    //         id: uuidv4(),
                    //         // productConversionId: 
                    //     }
                    // })
                };
                
                return { createsales, createsalesDetails };
            });
        }
        
        transaction()
        .catch((e) => {
            throw new Error(e)
        })
        .finally(async () => {
            await Model.$disconnect();
        });

        res.status(200).json({
            status: true,
            message: 'successful in updated sales data'
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
        const model = await Model.sales.findUnique({
            where: {
                id: req.params.id
            },
            include: {
                saleDetails: true
            }
        });
        const detail = model?.saleDetails ?? [];
        
        for (const value of detail) {
            const conversion = await Model.productConversions.findFirst({
                where: {
                    id: value.productConversionId ?? ''
                }
            });

            await DecrementStock(
                Model,
                value.productId,
                model?.storeId ?? '',
                parseInt(value.quantity+'') * (conversion?.quantity ?? 1)
            );
        }
        await Model.sales.delete({
            where: {
                id: req.params.id
            }
        });

        res.status(200).json({
            status: false,
            message: 'successfully in deleted sales data'
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

const getDataById = async (req:Request, res:Response) => {
    try {
        const model = await Model.sales.findUnique({
            where: {
                id: req.params.id
            }
        })
        
        if(!model) throw new Error('data not found')
        res.status(200).json({
            status: true,
            message: 'successfully in get sales data',
            data: {
                sales: model
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
        const data = await Model.sales.findMany({
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
            message: 'successfully in get sales data',
            data: {
                sales: dataOption
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
        const storeId = req.query.storeId as string;
        const data = await Model.sales.findUnique({
            where: {
                id: id??'',
            },
            select: {
                id:true,
                date: true,
                total: true,
                users: {
                    select: {
                        name: true
                    }
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

        const store = await Model.stores.findUnique({
            where: {
                id: storeId
            },
            select: {
                name: true,
                address: true
            }
        })

        let newData:any=[];
        const salesDetails = data?.saleDetails ?? []
        for (let index = 0; index < salesDetails.length; index++) {
            newData=[
                ...newData,
                {
                    product: salesDetails[index].products.name,
                    quantity: formatter.format(parseInt(salesDetails[index].quantity+'') ?? 0),
                    price: formatter.format(parseInt(salesDetails[index].price+'') ?? 0),
                    unit: salesDetails[index].productConversions?.units.name,
                }
            ]
        }
        res.status(200).json({
            status: true,
            message: 'successfully in get sales data',
            data: {
                sales: {
                    payCash: 0,
                    date: data?.date,
                    total: formatter.format(parseInt(data?.total+'') ?? 0),
                    id: data?.id,
                    user: data?.users?.name,
                    salesDetails: newData
                },
                store
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
        const data = await Model.sales.findUnique({
            where: {
                id: req.params.id
            },
            include: {
                saleDetails: {
                    include: {
                        products: true
                    }
                }
            }
        });
        let newData:any={};
        const dataDetail = data?.saleDetails ?? []
        for (const value of dataDetail) {
            newData= {
                ...newData,
                [value.productId] : {
                    quantity: value.quantity,
                    unit: value.productConversionId,
                    price: value.price,
                    product: value.products,
                    salesId: value.saleId,
                    salesDetailId: value.id
                }
            }
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
                id: req.params.id
            }
        })
    } catch (error) {
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