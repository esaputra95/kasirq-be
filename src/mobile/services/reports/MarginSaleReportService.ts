import Model from "#root/services/PrismaService";
import moment from "moment";

export const getMarginSaleReport = async (filters: {
    start: string;
    finish: string;
    storeId: string;
}) => {
    const start = moment(filters.start, "YYYY-MM-DD").startOf("day").toDate();
    const end = moment(filters.finish, "YYYY-MM-DD").endOf("day").toDate();
    const results: any[] = await Model.$queryRaw`
        SELECT 
            saleDetails.quantity * saleDetails.price AS sell,
            SUM(COALESCE(cogs.price, 0) * COALESCE(cogs.quantity, 0)) AS capital,
            sales.date,
            sales.createdAt,
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
            sales.createdAt BETWEEN ${start} 
            AND ${end}
        AND sales.storeId COLLATE utf8mb4_unicode_ci = ${filters.storeId} COLLATE utf8mb4_unicode_ci
        GROUP BY saleDetails.id
        ORDER BY sales.createdAt DESC
    `;

    const totalSale =
        results?.length > 0
            ? results.reduce(
                  (total, val) => (total ?? 0) + parseInt(val?.sell ?? 0),
                  0
              )
            : 0;

    const totalCapital =
        results?.length > 0
            ? results.reduce(
                  (total, val) => (total ?? 0) + parseInt(val?.capital ?? 0),
                  0
              )
            : 0;

    const total =
        results?.length > 0
            ? results.reduce(
                  (total, val) =>
                      (total ?? 0) +
                      (parseInt(val?.sell ?? 0) - parseInt(val?.capital ?? 0)),
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

    return {
        data: {
            totalSale,
            totalCapital,
            margin: results,
            total,
            discount,
        },
    };
};
