import Model from "#root/services/PrismaService";
import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { handleValidationError } from "#root/helpers/handleValidationError";
import { errorType } from "#root/helpers/errorType";
import { v4 as uuidv4 } from 'uuid';
import { BrandQueryInterface } from "#root/interfaces/masters/BrandInterface";
import getOwnerId from "#root/helpers/GetOwnerId";

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
        const data = await Model.brands.findMany({
            where: {
                ...filter
            },
            skip: skip,
            take: take
        });
        const total = await Model.brands.count({
            where: {
                ...filter
            }
        })
        res.status(200).json({
            status: true,
            message: "successful in getting Brand data",
            data: {
                Brand: data,
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
        await Model.brands.create({data: data});
        res.status(200).json({
            status: true,
            message: 'successful in created Brand data'
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

        const data = { ...req.body};
        await Model.brands.update({
            where: {
                id: req.params.id
            },
            data: data
        });
        res.status(200).json({
            status: true,
            message: 'successful in updated Brand data'
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
        await Model.brands.delete({
            where: {
                id: req.params.id
            }
        })
        res.status(200).json({
            status: false,
            message: 'successfully in deleted Brand data'
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
        console.log({dataOption});
        
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

export {
    getData,
    postData,
    updateData,
    deleteData,
    getDataById,
    getSelect
}