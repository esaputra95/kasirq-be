import Model from "#root/services/PrismaService";
import getOwnerId from "#root/helpers/GetOwnerId";
import moment from "moment-timezone";

// Default timezone
moment.tz.setDefault("Asia/Jakarta");

const dayDummy = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const color: Record<number, string> = {
    0: "#ce7d28",
    1: "#df505b",
    2: "#24c565",
    3: "#14b7a8",
    4: "#24d1ee",
    5: "#3c84f7",
    6: "#4f50e6",
};

/**
 * Get total sales for a store
 */
export const getTotalSales = async (storeId: string) => {
    try {
        const data = await Model.sales.aggregate({
            _sum: { total: true },
            where: { storeId },
        });

        return {
            message: "Success get Total Sales",
            data: data._sum.total ?? 0,
        };
    } catch (error) {
        return { message: "Failed", data: 0 };
    }
};

/**
 * Get margin/profit per week
 */
export const getMarginWeek = async (storeId: string) => {
    try {
        const dates = await getDatesOfCurrentWeek();
        const result: any[] = [];

        for (let i = 0; i < dates.length; i++) {
            const start = moment(dates[i], "YYYY-MM-DD")
                .startOf("day")
                .toDate();
            const end = moment(dates[i], "YYYY-MM-DD").endOf("day").toDate();

            const rows = await Model.$queryRaw`
        SELECT 
          saleDetails.quantity * saleDetails.price AS totals,
          SUM(cogs.price * cogs.quantity) AS total_cogs,
          sales.createdAt
        FROM saleDetails
        LEFT JOIN cogs ON cogs.saleDetailId = saleDetails.id
        LEFT JOIN sales ON sales.id = saleDetails.saleId
        WHERE sales.createdAt BETWEEN ${start} AND ${end}
          AND sales.storeId = ${storeId}
        GROUP BY saleDetails.id;
      `;

            const value = (rows as any[])?.reduce((total, row) => {
                const totals = parseFloat(row?.totals ?? "0");
                const totalCogs = row?.total_cogs ?? 0;
                return total + (totals - totalCogs);
            }, 0);

            result.push({
                value: Math.round(value / 1000),
                label: dayDummy[i],
                frontColor: color[i] as any,
            });
        }

        return { data: result };
    } catch (error) {
        return { data: [], error: true };
    }
};

/**
 * Get total product count
 */
export const getTotalProducts = async (userId: string, userType: string) => {
    try {
        const ownerId: any = await getOwnerId(userId, userType);
        const data = await Model.products.count({
            where: { ownerId: ownerId.id },
        });

        return {
            message: "Success get Total Product",
            data: data ?? 0,
        };
    } catch (error) {
        return { data: 0 };
    }
};

/**
 * Get sales per week
 */
export const getSalesWeek = async (storeId: string) => {
    try {
        const dates = await getDatesOfCurrentWeek();
        const result: any[] = [];

        for (let i = 0; i < dates.length; i++) {
            const start = moment(dates[i], "YYYY-MM-DD")
                .startOf("day")
                .toDate();
            const end = moment(dates[i], "YYYY-MM-DD").endOf("day").toDate();

            const total = await Model.sales.aggregate({
                _sum: { total: true },
                where: {
                    createdAt: { gte: start, lte: end },
                    storeId,
                },
            });

            result.push({
                value: Math.round(
                    parseInt(total._sum?.total?.toString() ?? "0") / 1000
                ),
                label: dayDummy[i],
                frontColor: color[i],
            });
        }

        return { data: result };
    } catch (error) {
        return { data: [], error: true };
    }
};

/**
 * Store Expiration Date
 */
export const getStoreExpired = async (storeId: string) => {
    try {
        const data = await Model.stores.findUnique({
            where: { id: storeId },
        });

        return { data: data?.expiredDate };
    } catch (error) {
        return { data: null };
    }
};

/**
 * Get dates of current week
 */
const getDatesOfCurrentWeek = async () => {
    const today = moment();
    const monday = today.clone().startOf("week").add(1, "day"); // Monday start

    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
        weekDates.push(monday.clone().add(i, "day").format("YYYY-MM-DD"));
    }
    return weekDates;
};
