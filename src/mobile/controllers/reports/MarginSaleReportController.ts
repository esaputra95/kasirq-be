import { handleErrorMessage } from "#root/helpers/handleErrors";
import Model from "#root/services/PrismaService";
import { Request, Response } from "express";
import moment from "moment";

const getData = async (req: Request, res: Response) => {
    try {
        const query = req.query;

        const results: any[] = await Model.$queryRaw`
            SELECT 
                saleDetails.quantity * saleDetails.price AS sell,
                SUM(COALESCE(cogs.price, 0) * COALESCE(cogs.quantity, 0)) AS capital,
                sales.date,
                sales.invoice,
                saleDetails.id,
                sales.discount,
                products.name
            FROM 
                saleDetails
            LEFT JOIN 
                cogs ON cogs.saleDetailId = saleDetails.id
            LEFT JOIN 
                sales ON sales.id = saleDetails.saleId
            LEFT JOIN 
                products ON products.id = saleDetails.productId
            WHERE 
                sales.date BETWEEN ${moment(
                    query?.start + " 00:00:00"
                ).format()} AND ${moment(query?.finish + " 00:00:00").format()}
            AND sales.storeId = ${query.storeId}
            GROUP BY saleDetails.id
            ORDER BY sales.createdAt DESC
        `;

        const total =
            results?.length > 0
                ? results.reduce(
                      (total, val) =>
                          (total ?? 0) +
                          (parseInt(val?.sell ?? 0) -
                              parseInt(val?.capital ?? 0)),
                      0
                  )
                : 0;
        const discount =
            results?.length > 0
                ? results.reduce(
                      (total, val) => (total ?? 0) + parseInt(val?.discount),
                      0
                  )
                : 0;

        res.status(200).json({
            status: true,
            data: {
                margin: results,
                total: total,
                discount: discount,
            },
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export { getData };
