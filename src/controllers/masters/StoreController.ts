import { handleValidationError } from "#root/helpers/handleValidationError";
import Model from "#root/services/PrismaService";
import { Prisma } from "@prisma/client";
import { Request, Response } from "express";

const getSelect = async (_req:Request, res:Response) => {
    try {
        let dataOption:any=[]
        console.log('dsini', res.locals.userId)
        const data = await Model.stores.findMany({
            where: {
                ownerId: res.locals.userId
            }
        });
        for (const value of data) {
            dataOption= [
                ...dataOption, {
                    key: value.id,
                    value: value.name
                }
            ]
        }
        res.status(200).json({
            status: true,
            message: 'successfully in get user data',
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

export { getSelect }