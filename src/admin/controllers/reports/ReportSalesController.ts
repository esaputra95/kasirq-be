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
            message: "SUccess get sales report",
            data: response,
        });
    } catch (error) {
        res.status(500);
    }
};

const download = async (req: Request, res: Response) => {
    res.download("Laporan Penjualan.xlsx");
};

const xlsxData = async (req: Request, res: Response) => {
    try {
        const response = await modelData(req, res);
        let dataExcel: any = [];
        let total = 0;
        for (let index = 0; index < response.length; index++) {
            total += response[index][6];
            dataExcel = [
                ...dataExcel,
                {
                    no: response[index][0],
                    invoice: response[index][1],
                    date: response[index][2],
                    user: response[index][3],
                    subTotal: response[index][4],
                    discount: response[index][5],
                    total: response[index][6],
                },
            ];
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

        let filter = {};
        body?.user
            ? (filter = {
                  ...filter,
                  userId: body.user,
              })
            : null;
        body?.storeId
            ? (filter = {
                  ...filter,
                  storeId: body.storeId,
              })
            : null;
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
            include: {
                members: true,
                saleDetails: {
                    include: {
                        products: true,
                    },
                },
                users: true,
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

        let newResponse: any = [];
        let total = 0;
        for (let index = 0; index < data.length; index++) {
            total += Number(data[index].total);
            newResponse = [
                ...newResponse,
                [
                    index + 1,
                    data[index].invoice,
                    moment(data[index].createdAt).format("DD/MM/YYYY"),
                    data[index]?.users?.name ?? "",
                    formatter.format(parseInt(data[index].subTotal + "")),
                    formatter.format(parseInt(data[index].discount + "")),
                    formatter.format(parseInt(data[index].total + "")),
                ],
            ];
            const salesDetail = data[index].saleDetails ?? [];
            if (salesDetail.length > 0) {
                newResponse = [
                    ...newResponse,
                    ["", "", "", "Nama", "Jumlah", "Harga", "Total"],
                ];
            }

            for (let iDetail = 0; iDetail < salesDetail.length; iDetail++) {
                newResponse = [
                    ...newResponse,
                    [
                        "",
                        "",
                        "",
                        salesDetail[iDetail].products?.name ?? "",
                        salesDetail[iDetail].quantity,
                        formatter.format(Number(salesDetail[iDetail].price)),
                        formatter.format(
                            parseInt(
                                (salesDetail[iDetail].quantity ?? 0) + ""
                            ) * parseInt((salesDetail[iDetail].price ?? 0) + "")
                        ),
                    ],
                ];
            }
        }
        return [
            ...newResponse,
            ["Total", "", "", "", "", "", formatter.format(total)],
        ];
    } catch (error) {
        return [];
    }
};

export { getData, xlsxData, download };
