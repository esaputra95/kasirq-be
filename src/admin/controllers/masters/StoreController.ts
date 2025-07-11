import { errorType } from "#root/helpers/errorType";
import getOwnerId from "#root/helpers/GetOwnerId";
import { handleValidationError } from "#root/helpers/handleValidationError";
import { StoreQueryInterface } from "#root/interfaces/masters/StoreInterface";
import Model from "#root/services/PrismaService";
import { Prisma } from "@prisma/client";
import { Request, Response } from "express";
import { v4 as uuidv4 } from 'uuid';

const getSelect = async (req:Request, res:Response) => {
    try {
        const owner:any = await getOwnerId(res.locals.userId, res.locals.level);
        let filter:any={};
        req.query.name ? filter={...filter, name: { contains: req.query?.name as string}} : null
        
        if(res.locals.level!=="owner" && res.locals.level!=="superadmin" && res.locals.level!=="admin") return res.status(401).json({status: false, data: []})
        if(res.locals.level==="owner"){
            filter={...filter, ownerId: owner.id}
        }
        let dataOption:any=[];
        const data = await Model.stores.findMany({
            // where: {
            //     // ...filter,
            // }
        });
        for (const value of data) {
            dataOption= [
                ...dataOption, {
                    value: value.id,
                    label: value.name
                }
            ]
        }
        res.status(200).json({
            status: true,
            message: 'successfully in get store select',
            data: {
                store: dataOption
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

const getData = async (req:Request<{}, {}, {}, StoreQueryInterface>, res:Response) => {
    try {
        const query = req.query;
        const owner:any = await getOwnerId(res.locals.userId, res.locals.userType)
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
        const data = await Model.stores.findMany({
            where: {
                ...filter,
                ownerId: owner.id
            },
            skip: skip,
            take: take
        });
        const total = await Model.stores.count({
            where: {
                ...filter,
                ownerId: owner.id
            }
        })
        res.status(200).json({
            status: true,
            message: "successful in getting Stores data",
            data: {
                store: data,
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

const postData = async (req:Request, res:Response) => {
    try {
        const ownerId:any = await getOwnerId(res.locals.userId, res.locals.userType)
        if(!ownerId.status) throw new Error('Owner not found')
        const data = { ...req.body, id: uuidv4(), ownerId: ownerId.id};
        delete data.storeId;
        await Model.stores.create({data: data});
        res.status(200).json({
            status: true,
            message: 'successful in created Member data'
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

const updateData = async (req:Request, res:Response) => {
    try {
        const data = { ...req.body};
        await Model.stores.update({
            where: {
                id: req.params.id
            },
            data: data
        });
        res.status(200).json({
            status: true,
            message: 'successful in updated Stores data'
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
        await Model.stores.delete({
            where: {
                id: req.params.id
            }
        })
        res.status(200).json({
            status: false,
            message: 'successfully in deleted Member data'
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
        const model = await Model.stores.findUnique({
            where: {
                id: req.params.id
            }
        })
        
        if(!model) throw new Error('data not found')
        res.status(200).json({
            status: true,
            message: 'successfully in get Member data',
            data: {
                store: model
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

export {
    getData,
    getDataById,
    postData,
    updateData,
    getSelect,
    deleteData,
}