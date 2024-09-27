import Model from "#root/services/PrismaService"
import { Request, Response } from "express"

const getTotalSales = async (_req:Request, res:Response) => {
    try {
        const data = await Model.sales.aggregate({
            _sum: {
                total: true
            }
        });
        res.status(200).json({
            status: true,
            message: 'Success get Total Sales',
            data : data._sum.total ?? 0
        })
    } catch (error) {
        res.status(500).json({
            status: false,
            message: `${error}`,

        })
    }
}
const getTotalPurchase = async (_req:Request, res:Response) => {
    try {
        const data = await Model.purchases.aggregate({
            _sum: {
                total: true
            }
        });
        res.status(200).json({
            status: true,
            message: 'Success get Total Purchases',
            data : data._sum.total ?? 0
        })
    } catch (error) {
        res.status(500).json({
            status: false,
            message: `${error}`,

        })
    }
}

export {
    getTotalSales,
    getTotalPurchase
}