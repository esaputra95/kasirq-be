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
            message: "Success get subscription report",
            data: response,
        });
    } catch (error) {
        console.error("Error in getData:", error);
        res.status(500).json({
            status: false,
            message: "Internal Server Error",
            error: String(error),
        });
    }
};

const download = async (req: Request, res: Response) => {
    res.download("Laporan Subscription.xlsx");
};

const xlsxData = async (req: Request, res: Response) => {
    try {
        const response = await modelData(req, res);
        const dataExcel: any = [];

        for (let index = 0; index < response.length; index++) {
            const row = response[index];
            dataExcel.push({
                no: row[0],
                storeName: row[1],
                ownerName: row[2],
                type: row[3],
                status: row[4],
                startDate: row[5],
                endDate: row[6],
                durationMonth: row[7],
                price: row[8],
            });
        }
        let settings = {
            fileName: "Laporan Subscription",
            extraLength: 3,
            writeMode: "writeFile",
            writeOptions: {},
            RTL: false,
        };

        const buffer = xlsx(
            [
                {
                    columns: [
                        {
                            label: "No",
                            value: "no",
                        },
                        {
                            label: "Nama Toko",
                            value: "storeName",
                        },
                        {
                            label: "Pemilik",
                            value: "ownerName",
                        },
                        {
                            label: "Tipe",
                            value: "type",
                        },
                        {
                            label: "Status",
                            value: "status",
                        },
                        {
                            label: "Tanggal Mulai",
                            value: "startDate",
                        },
                        {
                            label: "Tanggal Berakhir",
                            value: "endDate",
                        },
                        {
                            label: "Durasi (Bulan)",
                            value: "durationMonth",
                        },
                        {
                            label: "Harga",
                            value: "price",
                        },
                    ],
                    content: dataExcel,
                },
            ],
            settings
        );
        res.writeHead(200, {
            "Content-Type": "application/octet-stream",
            "Content-disposition":
                "attachment; filename=Laporan Subscription.xlsx",
        });
        res.end(buffer);
    } catch (error) {
        console.error("Error in xlsxData:", error);
        res.status(500).json({
            status: false,
            message: "Internal Server Error",
            error: String(error),
        });
    }
};

const modelData = async (req: Request, res: Response) => {
    try {
        const body = req.query;

        let filter: any = {};

        // Filter by status
        if (body?.status) {
            filter = {
                ...filter,
                status: body.status as string,
            };
        }

        // Filter by type
        if (body?.type) {
            filter = {
                ...filter,
                type: body.type as string,
            };
        }

        // // Filter by storeId
        // if (body?.storeId) {
        //     filter = {
        //         ...filter,
        //         storeId: body.storeId as string,
        //     };
        // }

        // Date filter
        if (body?.startDate && body?.endDate) {
            const start = moment(body.startDate as string, "YYYY-MM-DD")
                .startOf("day")
                .toDate();
            const end = moment(body.endDate as string, "YYYY-MM-DD")
                .endOf("day")
                .toDate();

            filter = {
                ...filter,
                createdAt: {
                    gte: start,
                    lte: end,
                },
            };
        }

        const data = await Model.store_subscriptions.findMany({
            where: filter,
            select: {
                id: true,
                storeId: true,
                type: true,
                status: true,
                startDate: true,
                endDate: true,
                durationMonth: true,
                price: true,
                createdAt: true,
                store: {
                    select: {
                        name: true,
                        users: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        const newResponse: any = [];
        let totalPrice = 0;

        for (let index = 0; index < data.length; index++) {
            const subscription = data[index];
            totalPrice += Number(subscription.price);

            newResponse.push([
                index + 1,
                subscription.store?.name ?? "",
                subscription.store?.users?.name ?? "",
                subscription.type,
                subscription.status,
                moment(subscription.startDate).format("DD/MM/YYYY"),
                moment(subscription.endDate).format("DD/MM/YYYY"),
                subscription.durationMonth,
                formatter.format(Number(subscription.price)),
            ]);
        }

        newResponse.push([
            "Total",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            formatter.format(totalPrice),
        ]);

        return newResponse;
    } catch (error) {
        console.error("Error in modelData:", error);
        return [];
    }
};

export { getData, xlsxData, download };
