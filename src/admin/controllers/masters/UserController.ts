import bcrypt from "bcryptjs";
import { UserQueryInterface } from "#root/interfaces/UserInterface";
import Model from "#root/services/PrismaService";
import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { handleValidationError } from "#root/helpers/handleValidationError";
import { errorType } from "#root/helpers/errorType";
import getOwnerId from "#root/helpers/GetOwnerId";

const getData = async (req:Request<{}, {}, {}, UserQueryInterface>, res:Response) => {
    try {
        const query = req.query;
        const owner:any = await getOwnerId(res.locals.userId, res.locals.userType)
        // PAGING
        const take:number = parseInt(query.limit ?? 20 )
        const page:number = parseInt(query.page ?? 1 );
        const skip:number = (page-1)*take
        // FILTER
        let filter:any= {}
        query.name ? filter = {...filter, name: { contains: query.name }} : null
        query.username ? filter = {...filter, username: { contains: query.username }} : null
        query.email ? filter = {...filter, email: { contains: query.email }} : null
        query.phone ? filter = {...filter, phone: { contains: query.phone }} : null
        query.storeId ? filter = {...filter, storeId: query.storeId} : null;
        const data = await Model.users.findMany({
            where: {
                ...filter,
                verified: 'active'
            },
            skip: skip,
            take: take
        });
        const total = await Model.users.count({
            where: {
                ...filter,
                verified: 'active'
            }
        })
        res.status(200).json({
            status: true,
            message: "successful in getting user data",
            data: {
                user: data,
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
        const salt = await bcrypt.genSalt();
        const newPass = await bcrypt.hash(req.body.password, salt);
        const data = { ...req.body, password: newPass };
        await Model.users.create({data: {
            email: data.email,
            username: data.email,
            password: newPass,
            storeId: data.storeId,
            name: data.name,
            level: data.level,
            verified: 'active'
        }});
        res.status(200).json({
            status: true,
            message: 'successful in created user data'
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
        await Model.users.delete({
            where: {
                id: req.params.id
            }
        })
        res.status(200).json({
            status: false,
            message: 'successfully in deleted user data'
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
        const model = await Model.users.findUnique({
            where: {
                id: req.params.id
            }
        })
        if(!model) throw new Error('data not found')
        res.status(200).json({
            status: true,
            message: 'successfully in get user data',
            data: {
                user: model
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
    getDataById
}