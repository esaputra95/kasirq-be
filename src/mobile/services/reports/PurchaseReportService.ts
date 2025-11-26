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

    const [data, total] = await Promise.all([
        Model.purchases.findMany({
            include: {
                suppliers: true,
                purchaseDetails: { include: { products: true } }
            },
            where: {
                date: {
                    gte: moment(filters.start + " 00:00:00").format(),
                    lte: moment(filters.finish + " 23:59:00").format()
                },
                ...filter
            },
            orderBy: { createdAt: "desc" }
        }),
        Model.purchases.aggregate({
            _sum: { total: true },
            where: {
                date: {
                    gte: new Date(filters.start as unknown as Date),
                    lte: new Date(filters.finish as unknown as Date)
                },
                ...filter
            }
        })
    ]);

    return {
        message: "Success get data purchase report",
        data: { purchase: data, total }
    };
};
