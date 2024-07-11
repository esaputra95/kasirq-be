import { Prisma, PrismaClient } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";
import { v4 as uuidv4 } from 'uuid';

const IncrementStock = async (
    prisma: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, 
        "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
    productId: string,
    quantityConversion: number,
    storeId: string,
    quantity: number,
) => {
    try {

        const checkStock = await prisma.stocks.findUnique({
            where: {
                productId: productId
            }
        })

        if(!checkStock){
            await prisma.stocks.create({
                data: {
                    id: uuidv4(),
                    productId: productId,
                    quantity: (quantityConversion * quantity ?? 1),
                    storeId: storeId
                }
            });
        }else{
            await prisma.stocks.update({
                data: {
                    productId: productId,
                    quantity: {
                        increment: (quantityConversion * quantity ?? 1)
                    },
                    storeId: storeId,
                },
                where: {
                    productId: productId
                }
            })
        }
        // await prisma.hppHistory.create
        return {
            status: true,
        }
    } catch (error) {
        return {
            status: false,
            message: error
        };
    }
}

const DecrementStock = async (
    prisma: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, 
        "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
    productId: string,
    quantityConversion: number,
    storeId: string,
    quantity: number,
) => {
    try {
        const checkStock = await prisma.stocks.findUnique({
            where: {
                productId: productId
            }
        })

        if(!checkStock){
            await prisma.stocks.create({
                data: {
                    id: uuidv4(),
                    productId: productId,
                    quantity: (quantityConversion * quantity ?? 1),
                    storeId: storeId
                }
            });
        }else{
            await prisma.stocks.update({
                data: {
                    productId: productId,
                    quantity: {
                        decrement: (quantityConversion * quantity ?? 1)
                    },
                    storeId: storeId,
                },
                where: {
                    productId: productId
                }
            })
        }
        // await prisma.hppHistory.create
        return {
            status: true,
        }
    } catch (error) {
        return {
            status: false,
            message: error
        };
    }
}

export { IncrementStock, DecrementStock }