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
            message: "Success get sales report",
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
    res.download("Laporan Penjualan.xlsx");
};

const xlsxData = async (req: Request, res: Response) => {
    try {
        const response = await modelData(req, res);
        const dataExcel: any = [];

        for (let index = 0; index < response.length; index++) {
            const row = response[index];
            dataExcel.push({
                no: row[0],
                invoice: row[1],
                date: row[2],
                user: row[3],
                subTotal: row[4],
                discount: row[5],
                total: row[6],
            });
        }
        let settings = {
            fileName: "Laporan Penjualan",
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
                            label: "Invoice",
                            value: "invoice",
                        },
                        {
                            label: "Tanggal",
                            value: "date",
                        },
                        {
                            label: "User",
                            value: "user",
                        },
                        {
                            label: "Sub Total",
                            value: "subTotal",
                        },
                        {
                            label: "Discount",
                            value: "discount",
                        },
                        {
                            label: "Total",
                            value: "total",
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
                "attachment; filename=Laporan Penjualan.xlsx",
        });
        res.end(buffer);
    } catch (error) {}
};

const modelData = async (req: Request, res: Response) => {
    try {
        const body = req.query;
        const ownerId = res.locals.userId;

        let filter: any = {};
        body?.user
            ? (filter = {
                  ...filter,
                  userId: body.user,
              })
            : null;

        // If storeId is not provided, get all stores for this owner
        if (!body?.storeId) {
            const ownerStores = await Model.stores.findMany({
                where: { ownerId: ownerId },
                select: { id: true },
            });
            const storeIds = ownerStores.map((store) => store.id);

            if (storeIds.length > 0) {
                filter = {
                    ...filter,
                    storeId: { in: storeIds },
                };
            }
        } else {
            filter = {
                ...filter,
                storeId: body.storeId,
            };
        }

        body.accountCashId
            ? (filter = {
                  ...filter,
                  accountCashId: body.accountCashId,
              })
            : null;

        const start = moment(req.query?.startDate as string, "YYYY-MM-DD")
            .startOf("day")
            .toDate();
        const end = moment(req.query?.endDate as string, "YYYY-MM-DD")
            .endOf("day")
            .toDate();

        const data = await Model.sales.findMany({
            where: {
                createdAt: {
                    gte: start,
                    lte: end,
                },
                ...filter,
            },
            select: {
                id: true,
                invoice: true,
                createdAt: true,
                subTotal: true,
                discount: true,
                total: true,
                users: {
                    select: {
                        name: true,
                    },
                },
                saleDetails: {
                    select: {
                        quantity: true,
                        price: true,
                        products: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: [
                {
                    date: "desc",
                },
                {
                    transactionNumber: "desc",
                },
            ],
        });

        const newResponse: any = [];
        let total = 0;
        for (let index = 0; index < data.length; index++) {
            const sale = data[index];
            total += Number(sale.total);

            newResponse.push([
                index + 1,
                sale.invoice,
                moment(sale.createdAt).format("DD/MM/YYYY"),
                sale?.users?.name ?? "",
                formatter.format(parseInt(sale.subTotal + "")),
                formatter.format(parseInt(sale.discount + "")),
                formatter.format(parseInt(sale.total + "")),
            ]);

            const salesDetail = sale.saleDetails ?? [];
            if (salesDetail.length > 0) {
                newResponse.push([
                    "",
                    "",
                    "",
                    "Nama",
                    "Jumlah",
                    "Harga",
                    "Total",
                ]);

                for (let iDetail = 0; iDetail < salesDetail.length; iDetail++) {
                    const detail = salesDetail[iDetail];
                    newResponse.push([
                        "",
                        "",
                        "",
                        detail.products?.name ?? "",
                        detail.quantity,
                        formatter.format(Number(detail.price)),
                        formatter.format(
                            parseInt((detail.quantity ?? 0) + "") *
                                parseInt((detail.price ?? 0) + "")
                        ),
                    ]);
                }
            }
        }

        newResponse.push([
            "Total",
            "",
            "",
            "",
            "",
            "",
            formatter.format(total),
        ]);
        return newResponse;
    } catch (error) {
        console.error("Error in modelData:", error);
        return [];
    }
};

export { getData, xlsxData, download };
