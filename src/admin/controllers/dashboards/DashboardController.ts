import getOwnerId from "#root/helpers/GetOwnerId";
import Model from "#root/services/PrismaService";
import { Request, Response } from "express";
import moment from "moment";

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

const getTotalSales = async (req: Request, res: Response) => {
    try {
        const query = req.query;
        const data = await Model.sales.aggregate({
            _sum: {
                total: true,
            },
            where: {
                storeId: query.storeId as string,
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

const getMarginYear = async (req: Request, res: Response) => {
    try {
        const query = req.query;
        let tpmData: any = [];
        for (let index = 0; index < monthDummy.length; index++) {
            const { firstDate, lastDate } = getFirstAndLastDateOfMonth(
                parseInt(moment().format("YYYY")),
                monthDummy[index]
            );
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
                    sales.date BETWEEN ${firstDate} AND ${lastDate}
                AND sales.storeId = ${query.storeId}
                GROUP BY saleDetails.id
                `;
            const loop = results as [];
            tpmData = [
                ...tpmData,
                loop?.reduce((total: number, data: any) => {
                    const totals = parseFloat(data?.totals ?? "0");
                    const totalCogs = data?.total_cogs ?? 0;
                    return total + (totals - totalCogs);
                }, 0),
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
        const query = req.query;
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
                where: {
                    date: {
                        gte: firstDate,
                        lte: lastDate,
                    },
                    storeId: query.storeId as string,
                },
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
};
