import Model from "#root/services/PrismaService";
import { Request, Response } from "express";
import moment from "moment";

const getData = async (req:Request, res:Response) => {
    try {
        const query = req.query;
        
        const results:any[] = await Model.$queryRaw`
            SELECT 
                saleDetails.quantity * saleDetails.price AS sell,
                SUM(cogs.price * cogs.quantity) AS capital,
                sales.date,
                sales.invoice,
                saleDetails.id
            FROM 
                saleDetails
            LEFT JOIN 
                cogs ON cogs.saleDetailId = saleDetails.id
            LEFT JOIN 
                sales ON sales.id = saleDetails.saleId
            WHERE 
                sales.date BETWEEN ${moment(query?.start+' 00:00:00').format()} AND ${moment(query?.finish+' 00:00:00').format()}
            GROUP BY saleDetails.id
        `;

        const total = results?.length > 0 ? results.reduce((total, val)=> total + (parseInt(val?.sell)-parseInt(val?.capital)), 0): 0

        res.status(200).json({
            status: true,
            data: {
                margin: results,
                total: total
            }
        })
    } catch (error) {
        res.status(500).json({
            status: false,
            message: `${error}`,

        })
    }
}

export { getData }