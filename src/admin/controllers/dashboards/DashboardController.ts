import getOwnerId from "#root/helpers/GetOwnerId";
import Model from "#root/services/PrismaService";
import { Request, Response } from "express";
import moment from "moment";

type StoreScope = string | { in: string[] };

const toNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    const numericValue = Number(value);
    return Number.isNaN(numericValue) ? 0 : numericValue;
};

const getOwnerStoreIds = async (res: Response): Promise<string[]> => {
    if (res.locals.level === "superadmin") {
        const stores = await Model.stores.findMany({
            where: { deletedAt: null },
            select: { id: true },
        });
        return stores.map((store) => store.id);
    }

    const owner = await getOwnerId(res.locals.userId, res.locals.level);
    const stores = await Model.stores.findMany({
        where: {
            ownerId: (owner as any).id,
            deletedAt: null,
        },
        select: { id: true },
    });

    return stores.map((store) => store.id);
};

const getScopedStoreIds = async (req: Request, res: Response): Promise<string[]> => {
    const storeId = req.query.storeId as string | undefined;
    const storeIds = await getOwnerStoreIds(res);

    if (!storeId) return storeIds;
    return storeIds.includes(storeId) ? [storeId] : [];
};

const getStoreScope = async (req: Request, res: Response): Promise<StoreScope> => {
    const storeIds = await getScopedStoreIds(req, res);
    return storeIds.length === 1 ? storeIds[0] : { in: storeIds };
};

const getSaleWhere = async (req: Request, res: Response, startDate?: Date, endDate?: Date) => {
    const storeScope = await getStoreScope(req, res);
    const where: any = {
        storeId: storeScope,
        deletedAt: null,
    };

    if (startDate && endDate) {
        where.date = {
            gte: startDate,
            lte: endDate,
        };
    }

    return where;
};

const monthDummy = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const color = {
    0: "#ce7d28",
    1: "#df505b",
    2: "#24c565",
    3: "#14b7a8",
    4: "#24d1ee",
    5: "#3c84f7",
    6: "#4f50e6",
};


const getOwnerSummary = async (req: Request, res: Response) => {
    try {
        const startOfDay = moment().startOf("day").toDate();
        const endOfDay = moment().endOf("day").toDate();
        const startOfMonth = moment().startOf("month").toDate();
        const endOfMonth = moment().endOf("month").toDate();
        const startOfYear = moment().startOf("year").toDate();
        const endOfYear = moment().endOf("year").toDate();

        const [todaySales, monthSales, yearSales, transactionCount, grossProfit] = await Promise.all([
            Model.sales.aggregate({
                _sum: { total: true },
                where: await getSaleWhere(req, res, startOfDay, endOfDay),
            }),
            Model.sales.aggregate({
                _sum: { total: true },
                where: await getSaleWhere(req, res, startOfMonth, endOfMonth),
            }),
            Model.sales.aggregate({
                _sum: { total: true },
                where: await getSaleWhere(req, res, startOfYear, endOfYear),
            }),
            Model.sales.count({
                where: await getSaleWhere(req, res, startOfMonth, endOfMonth),
            }),
            getGrossProfit(req, res, startOfMonth, endOfMonth),
        ]);

        const monthRevenue = toNumber(monthSales._sum.total);
        const grossProfitValue = toNumber(grossProfit);

        res.status(200).json({
            status: true,
            message: "Success get owner dashboard summary",
            data: {
                todayRevenue: toNumber(todaySales._sum.total),
                monthRevenue,
                yearRevenue: toNumber(yearSales._sum.total),
                grossProfit: grossProfitValue,
                margin: monthRevenue > 0 ? Number(((grossProfitValue / monthRevenue) * 100).toFixed(1)) : 0,
                transactionCount,
            },
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: `${error}`,
        });
    }
};

const getTopProducts = async (req: Request, res: Response) => {
    try {
        const limit = parseInt((req.query.limit as string) ?? "5");
        const startDate = moment().startOf("month").toDate();
        const endDate = moment().endOf("month").toDate();
        const storeScope = await getStoreScope(req, res);
        const storeIds = typeof storeScope === "string" ? [storeScope] : storeScope.in;

        const saleDetails = await Model.saleDetails.findMany({
            where: {
                deletedAt: null,
                sales: {
                    storeId: { in: storeIds },
                    date: {
                        gte: startDate,
                        lte: endDate,
                    },
                    deletedAt: null,
                },
            },
            select: {
                productId: true,
                quantity: true,
                price: true,
                netTotal: true,
                products: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        const productMap = new Map<string, { id: string; name: string; quantity: number; revenue: number }>();
        saleDetails.forEach((detail) => {
            const current = productMap.get(detail.productId) ?? {
                id: detail.productId,
                name: detail.products?.name ?? "-",
                quantity: 0,
                revenue: 0,
            };

            current.quantity += toNumber(detail.quantity);
            current.revenue += toNumber(detail.netTotal) || toNumber(detail.quantity) * toNumber(detail.price);
            productMap.set(detail.productId, current);
        });

        const data = Array.from(productMap.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, limit)
            .map((item) => ({
                ...item,
                productName: item.name,
                totalSales: item.revenue,
            }));

        res.status(200).json({
            status: true,
            message: "Success get top products",
            data,
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: `${error}`,
        });
    }
};

const getActiveStores = async (req: Request, res: Response) => {
    try {
        const limit = parseInt((req.query.limit as string) ?? "5");
        const startDate = moment().startOf("month").toDate();
        const endDate = moment().endOf("month").toDate();
        const finalStoreIds = await getScopedStoreIds(req, res);

        const stores = await Model.stores.findMany({
            where: {
                id: { in: finalStoreIds },
                deletedAt: null,
            },
            select: {
                id: true,
                name: true,
                sales: {
                    where: {
                        date: {
                            gte: startDate,
                            lte: endDate,
                        },
                        deletedAt: null,
                    },
                    select: {
                        total: true,
                    },
                },
            },
        });

        const data = stores
            .map((store) => {
                const totalTransactions = store.sales.length;
                const totalSales = store.sales.reduce((total, sale) => total + toNumber(sale.total), 0);

                return {
                    id: store.id,
                    name: store.name,
                    storeName: store.name,
                    totalTransactions,
                    transactionCount: totalTransactions,
                    totalSales,
                    revenue: totalSales,
                };
            })
            .sort((a, b) => b.totalTransactions - a.totalTransactions || b.totalSales - a.totalSales)
            .slice(0, limit);

        res.status(200).json({
            status: true,
            message: "Success get active stores",
            data,
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: `${error}`,
        });
    }
};

const getExpiringStores = async (req: Request, res: Response) => {
    try {
        const limit = parseInt((req.query.limit as string) ?? "5");
        const days = parseInt((req.query.days as string) ?? "30");
        const startDate = moment().startOf("day").toDate();
        const endDate = moment().add(days, "days").endOf("day").toDate();
        const finalStoreIds = await getScopedStoreIds(req, res);

        const stores = await Model.stores.findMany({
            where: {
                id: { in: finalStoreIds },
                deletedAt: null,
                expiredDate: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: {
                id: true,
                name: true,
                expiredDate: true,
                users: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: {
                expiredDate: "asc",
            },
            take: limit,
        });

        res.status(200).json({
            status: true,
            message: "Success get expiring stores",
            data: stores.map((store) => {
                const daysLeft = store.expiredDate ? moment(store.expiredDate).diff(moment().startOf("day"), "days") : 0;

                return {
                    id: store.id,
                    name: store.name,
                    storeName: store.name,
                    ownerName: store.users?.name ?? "-",
                    expiredDate: store.expiredDate,
                    endDate: store.expiredDate,
                    daysLeft,
                    days: daysLeft,
                };
            }),
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: `${error}`,
        });
    }
};

const getStorePerformance = async (req: Request, res: Response) => {
    try {
        const limit = parseInt((req.query.limit as string) ?? "10");
        const startDate = moment().startOf("month").toDate();
        const endDate = moment().endOf("month").toDate();
        const finalStoreIds = await getScopedStoreIds(req, res);

        const stores = await Model.stores.findMany({
            where: {
                id: { in: finalStoreIds },
                deletedAt: null,
            },
            select: {
                id: true,
                name: true,
            },
        });

        const data = await Promise.all(
            stores.map(async (store) => {
                const [salesAggregate, grossProfit] = await Promise.all([
                    Model.sales.aggregate({
                        _sum: { total: true },
                        _count: { id: true },
                        where: {
                            storeId: store.id,
                            date: {
                                gte: startDate,
                                lte: endDate,
                            },
                            deletedAt: null,
                        },
                    }),
                    getGrossProfit(req, res, startDate, endDate, [store.id]),
                ]);

                const totalSales = toNumber(salesAggregate._sum.total);
                const grossProfitValue = toNumber(grossProfit);

                return {
                    id: store.id,
                    name: store.name,
                    storeName: store.name,
                    totalSales,
                    revenue: totalSales,
                    grossProfit: grossProfitValue,
                    margin: grossProfitValue,
                    totalTransactions: salesAggregate._count.id,
                    transactionCount: salesAggregate._count.id,
                };
            }),
        );

        res.status(200).json({
            status: true,
            message: "Success get store performance",
            data: data
                .sort((a, b) => b.totalSales - a.totalSales)
                .slice(0, limit),
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: `${error}`,
        });
    }
};

const getTotalSales = async (req: Request, res: Response) => {
    try {
        const query = req.query;
        const startOfMonth = moment().startOf("month").toDate();
        const endOfMonth = moment().endOf("month").toDate();
        const data = await Model.sales.aggregate({
            _sum: {
                total: true,
            },
            where: {
                storeId: query.storeId as string,
                date: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
            },
        });
        res.status(200).json({
            status: true,
            message: "Success get Total Sales",
            data: data._sum.total ?? 0,
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: `${error}`,
        });
    }
};


const getGrossProfit = async (req: Request, res: Response, startDate: Date, endDate: Date, scopedStoreIds?: string[]) => {
    const storeScope = await getStoreScope(req, res);
    const storeIds = scopedStoreIds ?? (typeof storeScope === "string" ? [storeScope] : storeScope.in);
    if (!storeIds.length) return 0;

    const results = await Model.saleDetails.findMany({
        where: {
            deletedAt: null,
            sales: {
                storeId: { in: storeIds },
                date: {
                    gte: startDate,
                    lte: endDate,
                },
                deletedAt: null,
            },
        },
        select: {
            quantity: true,
            price: true,
            netTotal: true,
            cogs: {
                select: {
                    price: true,
                    quantity: true,
                },
            },
        },
    });

    return results.reduce((total, detail) => {
        const detailTotal = toNumber(detail.netTotal) || toNumber(detail.quantity) * toNumber(detail.price);
        const totalCogs = detail.cogs.reduce((cogsTotal, cogs) => {
            return cogsTotal + toNumber(cogs.price) * toNumber(cogs.quantity);
        }, 0);

        return total + (detailTotal - totalCogs);
    }, 0);
};

const getMarginYear = async (req: Request, res: Response) => {
    try {
        let tpmData: any = [];
        for (let index = 0; index < monthDummy.length; index++) {
            const { firstDate, lastDate } = getFirstAndLastDateOfMonth(
                parseInt(moment().format("YYYY")),
                monthDummy[index]
            );

            tpmData = [
                ...tpmData,
                await getGrossProfit(req, res, firstDate, lastDate),
            ];
        }
        res.status(200).json({
            status: true,
            data: tpmData,
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: `${error}`,
        });
    }
};
const getTotalPurchase = async (req: Request, res: Response) => {
    try {
        const ownerId: any = await getOwnerId(
            res.locals.userId,
            res.locals.level
        );
        const data = await Model.products.count({
            where: {
                ownerId: ownerId.id,
            },
        });
        res.status(200).json({
            status: true,
            message: "Success get Total Product",
            data: data ?? 0,
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: `${error}`,
        });
    }
};

const getSalesYear = async (req: Request, res: Response) => {
    try {
        let data: any = [];
        for (let index = 0; index < monthDummy.length; index++) {
            const { firstDate, lastDate } = getFirstAndLastDateOfMonth(
                parseInt(moment().format("YYYY")),
                monthDummy[index]
            );

            const total = await Model.sales.aggregate({
                _sum: {
                    total: true,
                },
                where: await getSaleWhere(req, res, firstDate, lastDate),
            });
            data = [...data, parseInt((total._sum?.total ?? 0) + "")];
        }
        res.status(200).json({
            status: true,
            data: data,
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: `${error}`,
        });
    }
};

const getStoreExpired = async (req: Request, res: Response) => {
    try {
        const data = await Model.stores.findUnique({
            where: {
                id: req.query.storeId as string,
            },
        });
        res.status(200).json({
            status: true,
            data: data?.expiredDate,
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: `${error}`,
        });
    }
};

const getDatesOfCurrentWeek = async () => {
    const today = new Date();
    // Tentukan hari ini (0 = Minggu, 1 = Senin, ..., 6 = Sabtu)
    const dayOfWeek = today.getDay();
    // Temukan hari Senin dari minggu ini
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7)); // Geser ke hari Senin
    // Buat array berisi tanggal dari Senin hingga Minggu
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        // Format tanggal menjadi YYYY-M-D
        const formattedDate = `${date.getFullYear()}-${
            date.getMonth() + 1
        }-${date.getDate()}`;
        weekDates.push(formattedDate);
    }
    return weekDates;
};

function getFirstAndLastDateOfMonth(year: number, month: number) {
    // Month is 0-indexed in Moment.js when creating dates, so January is 0.
    const firstDate = moment([year, month]).startOf("month").toDate();
    const lastDate = moment([year, month]).endOf("month").toDate();

    return { firstDate, lastDate };
}

export {
    getTotalSales,
    getTotalPurchase,
    getSalesYear,
    getMarginYear,
    getStoreExpired,
    getOwnerSummary,
    getTopProducts,
    getActiveStores,
    getExpiringStores,
    getStorePerformance,
};
