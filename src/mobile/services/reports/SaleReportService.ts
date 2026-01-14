import Model from "#root/services/PrismaService";
import moment from "moment";

export const getSaleReport = async (filters: {
    start: string;
    finish: string;
    accountId?: string;
    storeId?: string;
    memberId?: string;
    salePeopleId?: string;
    categoryId?: string;
}) => {
    let filter: any = {};

    if (filters.accountId) {
        if (filters.accountId === "cash") {
            filter.accountCashId = null;
        } else {
            filter.accountCashId = filters.accountId;
        }
    }
    if (filters.storeId) filter.storeId = filters.storeId;
    if (filters.memberId) filter.memberId = filters.memberId;
    if (filters.salePeopleId) filter.salePeopleId = filters.salePeopleId;
    if (filters.categoryId) {
        filter.saleDetails = {
            some: {
                products: {
                    categoryId: filters.categoryId,
                },
            },
        };
    }

    const start = moment(filters.start, "YYYY-MM-DD").startOf("day").toDate();
    const end = moment(filters.finish, "YYYY-MM-DD").endOf("day").toDate();

    const [data, total] = await Promise.all([
        Model.sales.findMany({
            include: {
                members: true,
                saleDetails: { include: { products: true } },
                salePeoples: true,
            },
            where: {
                createdAt: { gte: start, lte: end },
                ...filter,
            },
            orderBy: [{ date: "desc" }, { transactionNumber: "desc" }],
        }),
        Model.sales.aggregate({
            _sum: { total: true },
            where: {
                createdAt: { gte: start, lte: end },
                ...filter,
            },
        }),
    ]);

    return {
        message: "Success get data sales report",
        data: { sale: data, total },
    };
};
