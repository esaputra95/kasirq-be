import Model from "#root/services/PrismaService";
import getOwnerId from "#root/helpers/GetOwnerId";

interface StockOpnameReportQuery {
    storeId?: string;
    startDate?: string;
    endDate?: string;
    productId?: string;
    status?: string;
}

export const getStockOpnameReport = async (
    query: StockOpnameReportQuery,
    userId: string,
    userLevel: string
) => {
    const owner: any = await getOwnerId(userId, userLevel);
    console.log({ query });

    let whereClause: any = {
        stockOpname: {
            stores: { ownerId: owner.id },
        },
    };

    // Filter by store
    if (query.storeId) {
        whereClause.stockOpname.storeId = query.storeId;
    }

    // Filter by date range
    if (query.startDate && query.endDate) {
        whereClause.stockOpname.date = {
            gte: new Date(query.startDate),
            lte: new Date(query.endDate),
        };
    }

    // Filter by status
    if (query.status) {
        whereClause.stockOpname.status = query.status;
    }

    // Filter by product
    if (query.productId) {
        whereClause.productId = query.productId;
    }

    const data = await Model.stockOpnameDetails.findMany({
        where: whereClause,
        include: {
            stockOpname: {
                select: {
                    id: true,
                    invoice: true,
                    date: true,
                    status: true,
                    description: true,
                    stores: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
            products: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                    sku: true,
                },
            },
            productConversions: {
                include: {
                    units: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            stockOpname: {
                date: "desc",
            },
        },
    });

    // Calculate summary
    const summary = {
        totalItems: data.length,
        totalSurplus: 0,
        totalLoss: 0,
        totalDifferenceValue: 0,
    };

    data.forEach((item) => {
        const diff = Number(item.differenceQuantity || 0);
        const value = Number(item.differenceValue || 0);

        if (diff > 0) {
            summary.totalSurplus += diff;
        } else if (diff < 0) {
            summary.totalLoss += Math.abs(diff);
        }

        summary.totalDifferenceValue += diff;
    });

    console.log(JSON.stringify(data, null, 2));

    return {
        message: "successful in getting stock opname report",
        data: {
            stockOpnameDetails: data,
            summary,
        },
    };
};
