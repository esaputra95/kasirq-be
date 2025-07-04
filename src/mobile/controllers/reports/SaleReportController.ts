import Model from "#root/services/PrismaService";
import { Request, Response } from "express";
import moment from "moment";

const getData = async (req:Request, res:Response) => {
    try {
        let filter={};
        const query = req.query;
        query?.accountId ? filter = {accountCashId: req?.query?.accountId}:null
        query?.storeId ? filter = {
            ...filter,
            storeId: query.storeId
        } : null;
        const start = moment(req.query?.start as string, 'YYYY-MM-DD').startOf('day').toDate();
        const end = moment(req.query?.finish as string, 'YYYY-MM-DD').endOf('day').toDate();
        
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
                    gte: start,
                    lte: end,
                },
                ...filter
            },
            orderBy: [
                {
                    date: 'desc',
                }, 
                {
                    transactionNumber: 'desc'
                }
            ]
        });

        let totals=0
        for (const element of data) {
            totals+=Number(element.total)
        }
        
        const total = await Model.sales.aggregate({
            _sum: {
                total: true,
            },
            where: {
                date: {
                    gte: start,
                    lte: end,
                },
                ...filter
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
        res.status(500).json({
            status: false,
            message: `${error}`
        })
    }
}

export { getData }