import Model from "#root/services/PrismaService";
import { Request, Response } from "express";
import moment from "moment";

const getData = async (req:Request, res:Response) => {
    try {
        const data = await Model.sales.findMany({
            include: {
                members: true,
                saleDetails: {
                    include: {
                        products: true
                    }
                }
            },
            where: {
                date: {
                    gte: moment(req.query?.start+' 00:00:00').format(),
                    lte: moment(req.query?.finish+' 23:59:00').format(),
                }
            }
        });
        const total = await Model.sales.aggregate({
            _sum: {
                total: true
            },
            where: {
                date: {
                    gte: new Date(req.query?.start as unknown as Date),
                    lte: new Date(req.query?.finish as unknown as Date),
                }
            }
        })
        res.status(200).json({
            status: true,
            message: 'Success get data sales report',
            data: {
                sale: data,
                total
            }
        })
    } catch (error) {
        console.log({error});
        
        res.status(500).json({
            status: false,
            message: `${error}`
        })
    }
}

export { getData }