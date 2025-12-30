import { Request, Response } from "express";
import xlsx from "json-as-xlsx";
import * as BestSellerReportService from "#root/mobile/services/reports/BestSellerReportService";
import Model from "#root/services/PrismaService";
import moment from "moment";

const getData = async (req: Request, res: Response) => {
    try {
        const response = await modelData(req, res);
        res.status(200).json({
            status: true,
            message: "Success get best seller report",
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
    res.download("Laporan Produk Terlaris.xlsx");
};

const xlsxData = async (req: Request, res: Response) => {
    try {
        const response = await modelData(req, res);
        const dataExcel: any = [];

        for (let index = 0; index < response.length; index++) {
            const row = response[index];
            dataExcel.push({
                no: row[0],
                productCode: row[1],
                productName: row[2],
                unitName: row[3],
                totalQuantity: row[4],
            });
        }
        let settings = {
            fileName: "Laporan Produk Terlaris",
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
                            label: "Kode Produk",
                            value: "productCode",
                        },
                        {
                            label: "Nama Produk",
                            value: "productName",
                        },
                        {
                            label: "Satuan",
                            value: "unitName",
                        },
                        {
                            label: "Total Terjual",
                            value: "totalQuantity",
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
                "attachment; filename=Laporan Produk Terlaris.xlsx",
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
        const { start, finish, startDate, endDate, storeId, limit } =
            req.query as any;
        const ownerId = res.locals.userId;

        let finalStoreId = storeId;
        if (!storeId) {
            const ownerStores = await Model.stores.findMany({
                where: { ownerId: ownerId },
                select: { id: true },
            });
            const storeIds = ownerStores.map((store) => store.id);

            if (storeIds.length > 0) {
                finalStoreId = { in: storeIds };
            }
        }

        const result = await BestSellerReportService.getBestSellerReport({
            start: start || startDate || moment().format("YYYY-MM-DD"),
            finish: finish || endDate || moment().format("YYYY-MM-DD"),
            storeId: finalStoreId as any,
            limit,
        });

        // Convert from array of objects to array of arrays
        const arrayData: any[][] = [];
        if (result.data && Array.isArray(result.data)) {
            for (let index = 0; index < result.data.length; index++) {
                const row = result.data[index];
                arrayData.push([
                    index + 1,
                    row.productCode,
                    row.productName,
                    row.unitName,
                    row.totalQuantity,
                ]);
            }
        }

        return arrayData;
    } catch (error) {
        console.error("Error in modelData:", error);
        return [];
    }
};

export { getData, xlsxData, download };
