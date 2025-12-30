import { Request, Response } from "express";
import xlsx from "json-as-xlsx";
import * as AccountancyReportService from "#root/mobile/services/reports/AccountancyReportService";
import moment from "moment";
import formatter from "#root/helpers/formatCurrency";
import Model from "#root/services/PrismaService";
import getOwnerId from "#root/helpers/GetOwnerId";

const getFinalStoreId = async (storeId: any, res: Response) => {
    const userId = res.locals.userId;
    const userLevel = res.locals.level;
    const ownerIdRes = await getOwnerId(userId, userLevel);
    const ownerId = (ownerIdRes as any).id;

    if (!storeId) {
        const ownerStores = await Model.stores.findMany({
            where: { ownerId: ownerId },
            select: { id: true },
        });
        const storeIds = ownerStores.map((store) => store.id);
        if (storeIds.length > 0) {
            return { in: storeIds };
        }
    }
    return storeId;
};

const getAccountancyReport = async (req: Request, res: Response) => {
    try {
        const { start, finish, startDate, endDate, storeId, accountId } =
            req.query as any;
        const finalStoreId = await getFinalStoreId(storeId, res);
        const result = await AccountancyReportService.getAccountancyReport({
            start: (start ||
                startDate ||
                moment().format("YYYY-MM-DD")) as string,
            finish: (finish ||
                endDate ||
                moment().format("YYYY-MM-DD")) as string,
            storeId: finalStoreId as any,
            accountId,
        });

        // Convert to array of arrays format
        const arrayData: any[][] = [];
        const transactions = result.data?.recentTransactions || [];

        for (let index = 0; index < transactions.length; index++) {
            const row = transactions[index];
            arrayData.push([
                index + 1,
                moment(row.createdAt).format("DD/MM/YYYY"),
                row.description || "-",
                row.type === "IN" ? formatter.format(Number(row.amount)) : "-",
                row.type === "OUT" || row.type === "TRANSFER"
                    ? formatter.format(Number(row.amount))
                    : "-",
            ]);
        }

        res.status(200).json({ status: true, data: arrayData });
    } catch (error) {
        res.status(500).json({ status: false, message: String(error) });
    }
};

const xlsxAccountancyReport = async (req: Request, res: Response) => {
    try {
        const { start, finish, startDate, endDate, storeId, accountId } =
            req.query as any;
        const finalStoreId = await getFinalStoreId(storeId, res);
        const result = await AccountancyReportService.getAccountancyReport({
            start: (start ||
                startDate ||
                moment().format("YYYY-MM-DD")) as string,
            finish: (finish ||
                endDate ||
                moment().format("YYYY-MM-DD")) as string,
            storeId: finalStoreId as any,
            accountId,
        });

        const transactions = result.data?.recentTransactions || [];

        const dataExcel = transactions.map((row: any, index: number) => ({
            no: index + 1,
            date: moment(row.createdAt).format("DD/MM/YYYY"),
            description: row.description || "-",
            debit:
                row.type === "IN" ? formatter.format(Number(row.amount)) : "-",
            credit:
                row.type === "OUT" || row.type === "TRANSFER"
                    ? formatter.format(Number(row.amount))
                    : "-",
            balance: formatter.format(Number(row.balance || 0)),
        }));

        const buffer = xlsx(
            [
                {
                    columns: [
                        { label: "No", value: "no" },
                        { label: "Tanggal", value: "date" },
                        { label: "Keterangan", value: "description" },
                        { label: "Debit", value: "debit" },
                        { label: "Kredit", value: "credit" },
                    ],
                    content: dataExcel,
                },
            ],
            { fileName: "Laporan Akuntansi" }
        );

        res.writeHead(200, {
            "Content-Type": "application/octet-stream",
            "Content-disposition":
                "attachment; filename=Laporan Akuntansi.xlsx",
        });
        res.end(buffer);
    } catch (error) {
        res.status(500).json({ status: false, message: String(error) });
    }
};

const getAccountBalances = async (req: Request, res: Response) => {
    try {
        const { storeId } = req.query as any;
        const finalStoreId = await getFinalStoreId(storeId, res);
        const result = await AccountancyReportService.getAccountBalances(
            finalStoreId as any
        );

        // Convert to array of arrays
        const arrayData: any[][] = [];
        const accounts = result.data || [];

        for (let index = 0; index < accounts.length; index++) {
            const row = accounts[index];
            arrayData.push([
                index + 1,
                row.name,
                formatter.format(Number(row.currentBalance)),
            ]);
        }

        res.status(200).json({ status: true, data: arrayData });
    } catch (error) {
        res.status(500).json({ status: false, message: String(error) });
    }
};

const xlsxAccountBalances = async (req: Request, res: Response) => {
    try {
        const { storeId } = req.query as any;
        const finalStoreId = await getFinalStoreId(storeId, res);
        const result = await AccountancyReportService.getAccountBalances(
            finalStoreId as any
        );

        const dataExcel = (result.data || []).map(
            (row: any, index: number) => ({
                no: index + 1,
                accountName: row.name,
                balance: formatter.format(Number(row.currentBalance)),
            })
        );

        const buffer = xlsx(
            [
                {
                    columns: [
                        { label: "No", value: "no" },
                        { label: "Nama Akun", value: "accountName" },
                        { label: "Saldo", value: "balance" },
                    ],
                    content: dataExcel,
                },
            ],
            { fileName: "Saldo Akun" }
        );

        res.writeHead(200, {
            "Content-Type": "application/octet-stream",
            "Content-disposition": "attachment; filename=Saldo Akun.xlsx",
        });
        res.end(buffer);
    } catch (error) {
        res.status(500).json({ status: false, message: String(error) });
    }
};

const getTransferReport = async (req: Request, res: Response) => {
    try {
        const { start, finish, startDate, endDate, storeId, accountId } =
            req.query as any;
        const finalStoreId = await getFinalStoreId(storeId, res);
        const result = await AccountancyReportService.getTransferReport({
            start: (start ||
                startDate ||
                moment().format("YYYY-MM-DD")) as string,
            finish: (finish ||
                endDate ||
                moment().format("YYYY-MM-DD")) as string,
            storeId: finalStoreId as any,
            accountId,
        });

        // Convert to array of arrays
        const arrayData: any[][] = [];
        const transfers = result.data || [];

        for (let index = 0; index < transfers.length; index++) {
            const row = transfers[index];
            arrayData.push([
                index + 1,
                moment(row.createdAt).format("DD/MM/YYYY"),
                row.account?.name || "-",
                row.toAccount?.name || "-",
                formatter.format(Number(row.amount)),
                row.description,
            ]);
        }

        res.status(200).json({ status: true, data: arrayData });
    } catch (error) {
        res.status(500).json({ status: false, message: String(error) });
    }
};

const xlsxTransferReport = async (req: Request, res: Response) => {
    try {
        const { start, finish, startDate, endDate, storeId, accountId } =
            req.query as any;
        const finalStoreId = await getFinalStoreId(storeId, res);
        const result = await AccountancyReportService.getTransferReport({
            start: (start ||
                startDate ||
                moment().format("YYYY-MM-DD")) as string,
            finish: (finish ||
                endDate ||
                moment().format("YYYY-MM-DD")) as string,
            storeId: finalStoreId as any,
            accountId,
        });

        const dataExcel = (result.data || []).map(
            (row: any, index: number) => ({
                no: index + 1,
                date: moment(row.createdAt).format("DD/MM/YYYY"),
                fromAccount: row.account?.name || "-",
                toAccount: row.toAccount?.name || "-",
                amount: formatter.format(Number(row.amount)),
                description: row.description,
            })
        );

        const buffer = xlsx(
            [
                {
                    columns: [
                        { label: "No", value: "no" },
                        { label: "Tanggal", value: "date" },
                        { label: "Dari Akun", value: "fromAccount" },
                        { label: "Ke Akun", value: "toAccount" },
                        { label: "Jumlah", value: "amount" },
                        { label: "Keterangan", value: "description" },
                    ],
                    content: dataExcel,
                },
            ],
            { fileName: "Laporan Transfer" }
        );

        res.writeHead(200, {
            "Content-Type": "application/octet-stream",
            "Content-disposition": "attachment; filename=Laporan Transfer.xlsx",
        });
        res.end(buffer);
    } catch (error) {
        res.status(500).json({ status: false, message: String(error) });
    }
};

const getCashInReport = async (req: Request, res: Response) => {
    try {
        const { start, finish, startDate, endDate, storeId, accountId } =
            req.query as any;
        const finalStoreId = await getFinalStoreId(storeId, res);
        const result = await AccountancyReportService.getCashInReport({
            start: start || startDate || moment().format("YYYY-MM-DD"),
            finish: finish || endDate || moment().format("YYYY-MM-DD"),
            storeId: finalStoreId as any,
            accountId,
        });

        // Convert to array of arrays
        const arrayData: any[][] = [];
        const cashIns = result.data || [];

        for (let index = 0; index < cashIns.length; index++) {
            const row = cashIns[index];
            arrayData.push([
                index + 1,
                moment(row.createdAt).format("DD/MM/YYYY"),
                row.account?.name || "-",
                formatter.format(Number(row.amount)),
                row.description || "-",
            ]);
        }

        res.status(200).json({ status: true, data: arrayData });
    } catch (error) {
        res.status(500).json({ status: false, message: String(error) });
    }
};

const getCashOutReport = async (req: Request, res: Response) => {
    try {
        const { start, finish, startDate, endDate, storeId, accountId } =
            req.query as any;
        const finalStoreId = await getFinalStoreId(storeId, res);
        const result = await AccountancyReportService.getCashOutReport({
            start: start || startDate || moment().format("YYYY-MM-DD"),
            finish: finish || endDate || moment().format("YYYY-MM-DD"),
            storeId: finalStoreId as any,
            accountId,
        });

        // Convert to array of arrays
        const arrayData: any[][] = [];
        const cashOuts = result.data || [];

        for (let index = 0; index < cashOuts.length; index++) {
            const row = cashOuts[index];
            arrayData.push([
                index + 1,
                moment(row.createdAt).format("DD/MM/YYYY"),
                row.account?.name || "-",
                formatter.format(Number(row.amount)),
                row.description || "-",
            ]);
        }

        res.status(200).json({ status: true, data: arrayData });
    } catch (error) {
        res.status(500).json({ status: false, message: String(error) });
    }
};

const getExpenseReport = async (req: Request, res: Response) => {
    try {
        const { start, finish, startDate, endDate, storeId, accountId } =
            req.query as any;
        const finalStoreId = await getFinalStoreId(storeId, res);
        const result = await AccountancyReportService.getExpenseReport({
            start: start || startDate || moment().format("YYYY-MM-DD"),
            finish: finish || endDate || moment().format("YYYY-MM-DD"),
            storeId: finalStoreId as any,
            accountId,
        });

        // Convert to array of arrays
        const arrayData: any[][] = [];
        const expenses = result.data || [];

        for (let index = 0; index < expenses.length; index++) {
            const row = expenses[index];
            arrayData.push([
                index + 1,
                moment(row.expenseDate).format("DD/MM/YYYY"),
                row.account?.name || "-",
                row.category?.name || "-",
                formatter.format(Number(row.amount)),
                row.description || "-",
            ]);
        }

        res.status(200).json({ status: true, data: arrayData });
    } catch (error) {
        res.status(500).json({ status: false, message: String(error) });
    }
};

export {
    getAccountancyReport,
    xlsxAccountancyReport,
    getAccountBalances,
    xlsxAccountBalances,
    getTransferReport,
    xlsxTransferReport,
    getCashInReport,
    getCashOutReport,
    getExpenseReport,
};
