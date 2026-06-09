import Model from "#root/services/PrismaService";
import moment from "moment";

export const getPurchaseReport = async (filters: {
    start: string;
    finish: string;
    storeId?: string;
    supplierId?: string;
}) => {
    let filter: any = {};
    
    if (filters.storeId) filter.storeId = filters.storeId;
    if (filters.supplierId) filter.supplierId = filters.supplierId;
    const start = moment(filters.start, "YYYY-MM-DD").startOf("day").toDate();
    const end = moment(filters.finish, "YYYY-MM-DD").endOf("day").toDate();

    const [data, total] = await Promise.all([
        Model.purchases.findMany({
            include: {
                suppliers: true,
                purchaseDetails: { include: { products: true } }
            },
            where: {
                date: { gte: start, lte: end },
                ...filter
            },
            orderBy: { createdAt: "desc" }
        }),
        Model.purchases.aggregate({
            _sum: {
                total: true,
                subTotal: true,
                discount: true,
                tax: true,
                additionalCost: true,
            },
            where: {
                date: { gte: start, lte: end },
                ...filter
            }
        })
    ]);

    return {
        message: "Success get data purchase report",
        data: { purchase: data, total }
    };
};
