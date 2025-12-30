import { Request, Response } from "express";
import xlsx from "json-as-xlsx";
import * as AttendanceReportService from "#root/mobile/services/reports/AttendanceReportService";
import getOwnerId from "#root/helpers/GetOwnerId";
import moment from "moment";
import Model from "#root/services/PrismaService";

const getData = async (req: Request, res: Response) => {
    try {
        const response = await modelData(req, res);
        res.status(200).json({
            status: true,
            message: "Success get attendance report",
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
    res.download("Laporan Kehadiran.xlsx");
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
                user: row[2],
                store: row[3],
                checkIn: row[4],
                checkOut: row[5],
                status: row[6],
            });
        }
        let settings = {
            fileName: "Laporan Kehadiran",
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
                        { label: "Pegawai", value: "user" },
                        { label: "Toko", value: "store" },
                        { label: "Masuk", value: "checkIn" },
                        { label: "Pulang", value: "checkOut" },
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
                "attachment; filename=Laporan Kehadiran.xlsx",
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
        const userId = res.locals.userId;
        const userLevel = res.locals.level;
        const ownerIdRes = await getOwnerId(userId, userLevel);
        const ownerId = (ownerIdRes as any).id;

        const {
            start,
            finish,
            startDate,
            endDate,
            storeId,
            userId: filterUserId,
        } = req.query as any;

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

        const result = await AttendanceReportService.getAttendanceReport({
            start: (start ||
                startDate ||
                moment().format("YYYY-MM-DD")) as string,
            finish: (finish ||
                endDate ||
                moment().format("YYYY-MM-DD")) as string,
            storeId: finalStoreId as any,
            userId: filterUserId as string,
            ownerId,
        });

        // Convert from nested object to array of arrays
        const arrayData: any[][] = [];
        const attendances = result.data?.attendances || [];

        for (let index = 0; index < attendances.length; index++) {
            const row = attendances[index];
            arrayData.push([
                index + 1,
                moment(row.createdAt).format("DD/MM/YYYY"),
                row.users?.name || "-",
                row.store?.name || "-",
                row.checkInAt ? moment(row.checkInAt).format("HH:mm:ss") : "-",
                row.checkOutAt
                    ? moment(row.checkOutAt).format("HH:mm:ss")
                    : "-",
                row.checkInStatus,
            ]);
        }

        return arrayData;
    } catch (error) {
        console.error("Error in modelData:", error);
        return [];
    }
};

export { getData, xlsxData, download };
