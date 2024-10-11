import Model from "#root/services/PrismaService"
import { Request, Response } from "express"
import moment from "moment";

const dayDummy = [
    'Sen','Sel','Rab','Kam','Jum','Sab', 'Min'
]
const color = {
    0: '#ce7d28',
    1: '#df505b',
    2: '#24c565',
    3: '#14b7a8',
    4: '#24d1ee',
    5: '#3c84f7',
    6: '#4f50e6'
}


const getTotalSales = async (req:Request, res:Response) => {
    try {
        const query = req.query;
        const data = await Model.sales.aggregate({
            _sum: {
                total: true
            },
            where:{
                storeId: query.storeId as string
            }
        });
        res.status(200).json({
            status: true,
            message: 'Success get Total Sales',
            data : data._sum.total ?? 0
        })
    } catch (error) {
        res.status(500).json({
            status: false,
            message: `${error}`,

        })
    }
}

const getMarginWeek = async (req:Request, res:Response) => {
    try {
        const query = req.query;
        const date = await getDatesOfCurrentWeek();
        let tpmData:any=[]
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
                    sales.date BETWEEN ${moment(date[index]+' 00:00:00').format()} AND ${moment(date[index]+' 23:59:00').format()}
                AND sales.storeId = ${query.storeId}
                GROUP BY saleDetails.id
                `;
            const loop = results as [];
            tpmData = [
                ...tpmData,
                {
                    value: Math.round(loop?.reduce((total: number, data: any) => {
                        const totals = parseFloat(data?.totals ?? '0'); // Pastikan totals adalah number
                        const totalCogs = data?.total_cogs ?? 0; // Jika total_cogs null, beri nilai 0
                        return total + (totals - totalCogs);
                    }, 0)/1000), // Nilai awal untuk reduce adalah 0
                    label: dayDummy[index],
                    frontColor: color[index as keyof typeof color],
                }
            ];
        }
        res.status(200).json({
            status: true,
            data: tpmData
        })
    } catch (error) {
        res.status(500).json({
            status: false,
            message: `${error}`,

        })
    }
}
const getTotalPurchase = async (req:Request, res:Response) => {
    try {
        const query = req.query;
        const data = await Model.purchases.aggregate({
            _sum: {
                total: true
            },
            where: {
                storeId: query.storeId as string
            }
        });
        res.status(200).json({
            status: true,
            message: 'Success get Total Purchases',
            data : data._sum.total ?? 0
        })
    } catch (error) {
        res.status(500).json({
            status: false,
            message: `${error}`,

        })
    }
}

const getSalesWeek = async (req:Request, res:Response) => {
    try {
        const query = req.query;
        let data:any = [];
        const date = await getDatesOfCurrentWeek();
        for (let index = 0; index < date.length; index++) {
            const total = await Model.sales.aggregate({
                _sum: {
                    total: true
                },
                where: {
                    date: {
                        gte: moment(date[index]+' 00:00:00').format(),
                        lte: moment(date[index]+' 23:59:00').format(),
                    },
                    storeId: query.storeId as string
                }
            })
            data=[
                ...data,
                {
                    value: Math.round(parseInt(total._sum?.total+'' ?? 0) / 1000),
                    label: dayDummy[index],
                    frontColor: color[index as keyof typeof color],
                }
            ]
        }
        res.status(200).json({
            status: true,
            data: data
        })
    } catch (error) {
        res.status(500).json({
            status: false,
            message: `${error}`,

        })
    }
}

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
        const formattedDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        weekDates.push(formattedDate);
    }
    return weekDates;
}

export {
    getTotalSales,
    getTotalPurchase,
    getSalesWeek,
    getMarginWeek
}