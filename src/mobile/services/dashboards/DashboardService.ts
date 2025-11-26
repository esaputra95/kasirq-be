import Model from "#root/services/PrismaService";
import getOwnerId from "#root/helpers/GetOwnerId";
import moment from "moment";

const dayDummy = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const color = {
    0: '#ce7d28',
    1: '#df505b',
    2: '#24c565',
    3: '#14b7a8',
    4: '#24d1ee',
    5: '#3c84f7',
    6: '#4f50e6'
};

/**
 * Get total sales for a store
 */
export const getTotalSales = async (storeId: string) => {
    const data = await Model.sales.aggregate({
        _sum: { total: true },
        where: { storeId }
    });

    return {
        message: 'Success get Total Sales',
        data: data._sum.total ?? 0
    };
};

/**
 * Get margin/profit per week
 */
export const getMarginWeek = async (storeId: string) => {
    const date = await getDatesOfCurrentWeek();
    let tmpData: any = [];

    for (let index = 0; index < date.length; index++) {
        const results = await Model.$queryRaw`
            SELECT 
                saleDetails.quantity * saleDetails.price AS totals,
                SUM(cogs.price * cogs.quantity) AS total_cogs,
                sales.date
            FROM 
                saleDetails
            LEFT JOIN 
                cogs ON cogs.saleDetailId = saleDetails.id
            LEFT JOIN 
                sales ON sales.id = saleDetails.saleId
            WHERE 
                sales.date BETWEEN ${moment(date[index] + ' 00:00:00').format()} AND ${moment(date[index] + ' 23:59:00').format()}
            AND sales.storeId = ${storeId}
            GROUP BY saleDetails.id
        `;

        const loop = results as [];
        tmpData.push({
            value: Math.round(loop?.reduce((total: number, data: any) => {
                const totals = parseFloat(data?.totals ?? '0');
                const totalCogs = data?.total_cogs ?? 0;
                return total + (totals - totalCogs);
            }, 0) / 1000),
            label: dayDummy[index],
            frontColor: color[index as keyof typeof color]
        });
    }

    return { data: tmpData };
};

/**
 * Get total product count
 */
export const getTotalProducts = async (userId: string, userType: string) => {
    const ownerId: any = await getOwnerId(userId, userType);
    const data = await Model.products.count({
        where: { ownerId: ownerId.id }
    });

    return {
        message: 'Success get Total Product',
        data: data ?? 0
    };
};

/**
 * Get sales per week
 */
export const getSalesWeek = async (storeId: string) => {
    const date = await getDatesOfCurrentWeek();
    let data: any = [];

    for (let index = 0; index < date.length; index++) {
        const total = await Model.sales.aggregate({
            _sum: { total: true },
            where: {
                date: {
                    gte: moment(date[index] + ' 00:00:00').format(),
                    lte: moment(date[index] + ' 23:59:00').format()
                },
                storeId
            }
        });

        data.push({
            value: Math.round(parseInt(total._sum?.total?.toString() ?? '0') / 1000),
            label: dayDummy[index],
            frontColor: color[index as keyof typeof color]
        });
    }

    return { data };
};

/**
 * Get store expiration date
 */
export const getStoreExpired = async (storeId: string) => {
    const data = await Model.stores.findUnique({
        where: { id: storeId }
    });

    return { data: data?.expiredDate };
};

/**
 * Get dates of current week (Monday to Sunday)
 */
const getDatesOfCurrentWeek = async () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const formattedDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        weekDates.push(formattedDate);
    }
    return weekDates;
};
