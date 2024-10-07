import Model from "#root/services/PrismaService";
import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { handleValidationError } from "#root/helpers/handleValidationError";
import { errorType } from "#root/helpers/errorType";
import { v4 as uuidv4 } from 'uuid';
import { CategoryQueryInterface } from "#root/interfaces/masters/CategoryInterface";
import getOwnerId from "#root/helpers/GetOwnerId";

const getData = async (req:Request<{}, {}, {}, CategoryQueryInterface>, res:Response) => {
    try {
        const query = req.query;
        const owner:any = await getOwnerId(res.locals.userId, res.locals.userType);
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
        const data = await Model.categories.findMany({
            where: {
                ...filter,
                ownerId: owner.id
            },
            skip: skip,
            take: take
        });
        const total = await Model.categories.count({
            where: {
                ...filter,
                ownerId: owner.id
            }
        })
        res.status(200).json({
            status: true,
            message: "successful in getting Category data",
            data: {
                category: data,
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
        await Model.categories.create({data: data});
        res.status(200).json({
            status: true,
            message: 'successful in created Category data'
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
        await Model.categories.update({
            where: {
                id: req.params.id
            },
            data: data
        });
        res.status(200).json({
            status: true,
            message: 'successful in updated Category data'
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
        await Model.categories.delete({
            where: {
                id: req.params.id
            }
        })
        res.status(200).json({
            status: false,
            message: 'successfully in deleted Category data'
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
        const model = await Model.categories.findUnique({
            where: {
                id: req.params.id
            }
        })
        
        if(!model) throw new Error('data not found')
        res.status(200).json({
            status: true,
            message: 'successfully in get Category data',
            data: {
                category: model
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
        const owner:any = await getOwnerId(res.locals.userId, res.locals.userType);
        req.query.name ? filter={...filter, name: { contains: req.query?.name as string}} : null
        let dataOption:any=[];
        const data = await Model.categories.findMany({
            where: {
                // ...filter,
                ownerId: owner.id
            },
            take:10
        });

        console.log({data});
        
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
            message: 'successfully in get Category data',
            data: {
                category: dataOption
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
    postData,
    updateData,
    deleteData,
    getDataById,
    getSelect
}