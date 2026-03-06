import { Request, Response } from "express";
import moment from "moment";
import xlsx from "json-as-xlsx";
import Model from "#root/services/PrismaService";
import formatter from "#root/helpers/formatCurrency";

const getData = async (req: Request, res: Response) => {
    try {
        const response = await modelData(req, res);
        res.status(200).json({
            status: true,
            message: "Success get affiliate income report",
            data: response,
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: "Internal Server Error",
            error: String(error),
        });
    }
};

const download = async (req: Request, res: Response) => {
    res.download("Laporan Pendapatan Affiliate.xlsx");
};

const xlsxData = async (req: Request, res: Response) => {
    try {
        const response = await modelData(req, res);
        const dataExcel: any = [];

        for (let index = 0; index < response.length; index++) {
            const row = response[index];
            dataExcel.push({
                no: row[0],
                date: row[1],
                affiliate: row[2],
                code: row[3],
                referredUser: row[4],
                amount: row[5],
                status: row[6],
            });
        }
        let settings = {
            fileName: "Laporan Pendapatan Affiliate",
            extraLength: 3,
            writeMode: "writeFile",
            writeOptions: {},
            RTL: false,
        };

        const buffer = xlsx(
            [
                {
                    columns: [
                        { label: "No", value: "no" },
                        { label: "Tanggal", value: "date" },
                        { label: "Affiliator", value: "affiliate" },
                        { label: "Kode", value: "code" },
                        { label: "User Dirujuk", value: "referredUser" },
                        { label: "Pendapatan", value: "amount" },
                        { label: "Status", value: "status" },
                    ],
                    content: dataExcel,
                },
            ],
            settings,
        );
        res.writeHead(200, {
            "Content-Type": "application/octet-stream",
            "Content-disposition":
                "attachment; filename=Laporan Pendapatan Affiliate.xlsx",
        });
        res.end(buffer);
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const modelData = async (req: Request, res: Response) => {
    try {
        const { userId, startDate, endDate } = req.query;

        let filter: any = {};
        if (userId) {
            filter.affiliateCode = {
                userId: userId,
            };
        }

        const start = moment(startDate as string, "YYYY-MM-DD")
            .startOf("day")
            .toDate();
        const end = moment(endDate as string, "YYYY-MM-DD")
            .endOf("day")
            .toDate();

        const data = await Model.affiliate_commissions.findMany({
            where: {
                createdAt: {
                    gte: start,
                    lte: end,
                },
                ...filter,
            },
            include: {
                affiliateCode: {
                    include: {
                        user: {
                            select: { name: true },
                        },
                    },
                },
                subscription: {
                    include: {
                        store: {
                            select: { name: true },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        const newResponse: any = [];
        let total = 0;
        for (let index = 0; index < data.length; index++) {
            const commission = data[index];
            const amount = Number(commission.amount || 0);
            total += amount;

            newResponse.push([
                index + 1,
                moment(commission.createdAt).format("DD/MM/YYYY"),
                commission.affiliateCode.user.name,
                commission.affiliateCode.code,
                commission.subscription.store.name,
                formatter.format(amount),
                "PAID", // Commissions from subscriptions are considered paid
            ]);
        }

        newResponse.push([
            "Total",
            "",
            "",
            "",
            "",
            formatter.format(total),
            "",
        ]);

        return newResponse;
    } catch (error) {
        return [];
    }
};

const handleErrorMessage = (res: Response, error: any) => {
    res.status(500).json({
        status: false,
        message: "Internal Server Error",
        error: String(error),
    });
};

export { getData, xlsxData, download };
