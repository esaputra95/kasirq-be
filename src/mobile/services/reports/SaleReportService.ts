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

    const [data, total]: [any, any] = await Promise.all([
        Model.sales.findMany({
            include: {
                members: true,
                saleDetails: {
                    include: { products: true },
                    where: filters.categoryId
                        ? { products: { categoryId: filters.categoryId } }
                        : undefined,
                },
                salePeoples: true,
            },
            where: {
                createdAt: { gte: start, lte: end },
                ...filter,
            },
            orderBy: [{ date: "desc" }, { transactionNumber: "desc" }],
        }),
        filters.categoryId
            ? Model.saleDetails.aggregate({
                  _sum: { total: true },
                  where: {
                      sales: {
                          createdAt: { gte: start, lte: end },
                          ...filter,
                      },
                      products: { categoryId: filters.categoryId },
                  },
              })
            : Model.sales.aggregate({
                  _sum: {
                      total: true,
                      subTotal: true,
                      discount: true,
                      tax: true,
                      addtionalCost: true,
                      shippingCost: true,
                  },
                  where: {
                      createdAt: { gte: start, lte: end },
                      ...filter,
                  },
              }),
    ]);

    let summary: any = {
        total: total._sum.total || 0,
    };

    if (filters.categoryId) {
        let categorySubTotal = 0;
        data.forEach((sale: any) => {
            sale.total = sale.saleDetails.reduce(
                (acc: number, detail: any) =>
                    acc +
                    Number(detail.price || 0) * Number(detail.quantity || 0),
                0
            );
            sale.subTotal = sale.total - (sale.discount ?? 0);
            categorySubTotal += sale.subTotal;
        });
        summary.subTotal = categorySubTotal;
    } else {
        summary = {
            total: total._sum.total || 0,
            subTotal: total._sum.subTotal || 0,
            discount: total._sum.discount || 0,
            tax: total._sum.tax || 0,
            addtionalCost: total._sum.addtionalCost || 0,
            shippingCost: total._sum.shippingCost || 0,
        };
    }

    return {
        message: "Success get data sales report",
        data: {
            sale: data,
            total: {
                _sum: summary,
            },
        },
    };
};
