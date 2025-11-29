import Model from "#root/services/PrismaService";
import moment from "moment";

export const getBestSellerReport = async (filters: {
    start: string;
    finish: string;
    storeId?: string;
    limit?: string;
}) => {
    const start = moment(filters.start, "YYYY-MM-DD").startOf("day").toDate();
    const end = moment(filters.finish, "YYYY-MM-DD").endOf("day").toDate();
    const limit = parseInt(filters.limit ?? "10");

    let whereClause: any = {
        sales: {
            createdAt: { gte: start, lte: end },
        },
    };

    if (filters.storeId) {
        whereClause.sales.storeId = filters.storeId;
    }

    // 1. Group by productId and sum quantity
    const groupedData = await Model.saleDetails.groupBy({
        by: ["productId"],
        _sum: {
            quantity: true,
        },
        where: whereClause,
        orderBy: {
            _sum: {
                quantity: "desc",
            },
        },
        take: limit,
    });

    // 2. Get product details for the top selling products
    const productIds = groupedData.map((item) => item.productId);
    const products = await Model.products.findMany({
        where: {
            id: { in: productIds },
        },
        select: {
            id: true,
            name: true,
            code: true,
            image: true,
            productConversions: {
                select: {
                    units: {
                        select: {
                            name: true,
                        },
                    },
                },
            },
        },
    });

    // 3. Merge data
    const result = groupedData.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        const unitName = product?.productConversions?.[0]?.units?.name ?? "-";
        return {
            productId: item.productId,
            productName: product?.name ?? "Unknown Product",
            productCode: product?.code ?? "-",
            productImage: product?.image ?? null,
            unitName: unitName,
            totalQuantity: item._sum.quantity ?? 0,
        };
    });

    return {
        message: "Success get best seller report",
        data: result,
    };
};
