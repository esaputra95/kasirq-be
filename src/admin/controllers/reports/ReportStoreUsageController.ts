import Model from "#root/services/PrismaService";
import { Request, Response } from "express";
import moment from "moment";

interface StoreUsageQuery {
    page?: string;
    limit?: string;
    storeName?: string;
    days?: string;
}

/**
 * Get stores that have sales transactions in the last N days (default 30).
 * Returns: store name, owner name, transaction count, total sales amount,
 * first & last transaction date.
 * Supports pagination and filter by store name.
 */
const getData = async (
    req: Request<{}, {}, {}, StoreUsageQuery>,
    res: Response,
) => {
    try {
        const query = req.query;

        // Pagination
        const take: number = parseInt(query.limit ?? "20");
        const page: number = parseInt(query.page ?? "1");
        const skip: number = (page - 1) * take;

        // Date range (default 30 days)
        const days: number = parseInt(query.days ?? "30");
        const startDate = moment()
            .subtract(days, "days")
            .startOf("day")
            .toDate();
        const endDate = moment().endOf("day").toDate();

        // Build where filter
        let storeFilter: any = {};
        if (query.storeName) {
            storeFilter.name = { contains: query.storeName };
        }

        // Get stores that have sales in the date range
        const stores = await Model.stores.findMany({
            where: {
                ...storeFilter,
                sales: {
                    some: {
                        createdAt: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                },
            },
            select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                expiredDate: true,
                createdAt: true,
                users: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
                _count: {
                    select: {
                        sales: {
                            where: {
                                createdAt: {
                                    gte: startDate,
                                    lte: endDate,
                                },
                            },
                        },
                    },
                },
            },
            skip: skip,
            take: take,
            orderBy: {
                name: "asc",
            },
        });

        // Get total count for pagination
        const total = await Model.stores.count({
            where: {
                ...storeFilter,
                sales: {
                    some: {
                        createdAt: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                },
            },
        });

        // For each store, get aggregated sales data
        const storeData = await Promise.all(
            stores.map(async (store) => {
                const salesAggregate = await Model.sales.aggregate({
                    where: {
                        storeId: store.id,
                        createdAt: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                    _sum: {
                        total: true,
                    },
                    _min: {
                        createdAt: true,
                    },
                    _max: {
                        createdAt: true,
                    },
                });

                return {
                    storeId: store.id,
                    storeName: store.name,
                    storeAddress: store.address,
                    storePhone: store.phone,
                    storeExpiredDate: store.expiredDate,
                    storeCreatedAt: store.createdAt,
                    ownerName: store.users?.name ?? "-",
                    ownerEmail: store.users?.email ?? "-",
                    ownerPhone: store.users?.phone ?? "-",
                    totalTransactions: store._count.sales,
                    totalSalesAmount: salesAggregate._sum.total ?? 0,
                    firstTransactionDate: salesAggregate._min.createdAt,
                    lastTransactionDate: salesAggregate._max.createdAt,
                };
            }),
        );

        res.status(200).json({
            status: true,
            message: "Success get store usage data",
            data: {
                stores: storeData,
                info: {
                    page: page,
                    limit: take,
                    total: total,
                    totalPages: Math.ceil(total / take),
                    dateRange: {
                        startDate: startDate,
                        endDate: endDate,
                        days: days,
                    },
                },
            },
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({
            status: false,
            message: "Internal Server Error",
            error: String(error),
        });
    }
};

export { getData };
