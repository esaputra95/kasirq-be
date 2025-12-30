import { Request, Response } from "express";
import xlsx from "json-as-xlsx";
import * as StockOpnameReportService from "#root/mobile/services/reports/StockOpnameReportService";
import moment from "moment";
import Model from "#root/services/PrismaService";

const getData = async (req: Request, res: Response) => {
    try {
        const response = await modelData(req, res);
        res.status(200).json({
            status: true,
            message: "Success get stock opname report",
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
    res.download("Laporan Stock Opname.xlsx");
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
                invoice: row[2],
                store: row[3],
                product: row[4],
                systemStock: row[5],
                physicalStock: row[6],
                differenceQuantity: row[7],
                status: row[9],
            });
        }
        let settings = {
            fileName: "Laporan Stock Opname",
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
                        { label: "Invoice", value: "invoice" },
                        { label: "Toko", value: "store" },
                        { label: "Produk", value: "product" },
                        { label: "Stok Sistem", value: "systemStock" },
                        { label: "Stok Fisik", value: "physicalStock" },
                        {
                            label: "Selisih Jumlah",
                            value: "differenceQuantity",
                        },
                        { label: "Selisih Nilai", value: "differenceValue" },
                        { label: "Status", value: "status" },
                    ],
                    content: dataExcel,
                },
            ],
            settings
        );
        res.writeHead(200, {
            "Content-Type": "application/octet-stream",
            "Content-disposition":
                "attachment; filename=Laporan Stock Opname.xlsx",
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
        const { storeId, startDate, endDate, productId, status } =
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

        const result = await StockOpnameReportService.getStockOpnameReport(
            {
                storeId: finalStoreId as any,
                startDate,
                endDate,
                productId,
                status,
            },
            res.locals.userId,
            res.locals.level
        );

        // Convert from nested object to array of arrays
        const arrayData: any[][] = [];
        const details = result.data?.stockOpnameDetails || [];

        for (let index = 0; index < details.length; index++) {
            const row = details[index];
            arrayData.push([
                index + 1,
                moment(row.stockOpname.date).format("DD/MM/YYYY"),
                row.stockOpname.invoice,
                row.stockOpname.stores?.name || "-",
                row.products?.name || "-",
                row.systemQuantity,
                row.actualQuantity,
                row.differenceQuantity,
                row.stockOpname.status,
            ]);
        }

        return arrayData;
    } catch (error) {
        console.error("Error in modelData:", error);
        return [];
    }
};

export { getData, xlsxData, download };
