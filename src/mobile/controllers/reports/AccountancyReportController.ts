import { Request, Response } from "express";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import * as AccountancyReportService from "#root/mobile/services/reports/AccountancyReportService";

export const getAccountancyReport = async (req: Request, res: Response) => {
    try {
        const { start, finish, storeId } = req.query as any;

        if (!start || !finish || !storeId) {
            return res.status(400).json({
                status: false,
                message: "start, finish, and storeId are required",
            });
        }

        const result = await AccountancyReportService.getAccountancyReport({
            start,
            finish,
            storeId,
            accountId: req.query.accountId as string,
        });

        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export const getAccountBalances = async (req: Request, res: Response) => {
    try {
        const { storeId } = req.query as any;

        if (!storeId) {
            return res.status(400).json({
                status: false,
                message: "storeId is required",
            });
        }

        const result =
            await AccountancyReportService.getAccountBalances(storeId);
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export const getTransferReport = async (req: Request, res: Response) => {
    try {
        const { start, finish, storeId } = req.query as any;

        if (!start || !finish || !storeId) {
            return res.status(400).json({
                status: false,
                message: "start, finish, and storeId are required",
            });
        }

        const result = await AccountancyReportService.getTransferReport({
            start,
            finish,
            storeId,
            accountId: req.query.accountId as string,
        });

        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export const getCashInReport = async (req: Request, res: Response) => {
    try {
        const { start, finish, storeId } = req.query as any;

        if (!start || !finish || !storeId) {
            return res.status(400).json({
                status: false,
                message: "start, finish, and storeId are required",
            });
        }

        const result = await AccountancyReportService.getCashInReport({
            start,
            finish,
            storeId,
            accountId: req.query.accountId as string,
        });

        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export const getCashOutReport = async (req: Request, res: Response) => {
    try {
        const { start, finish, storeId } = req.query as any;

        if (!start || !finish || !storeId) {
            return res.status(400).json({
                status: false,
                message: "start, finish, and storeId are required",
            });
        }

        const result = await AccountancyReportService.getCashOutReport({
            start,
            finish,
            storeId,
            accountId: req.query.accountId as string,
        });

        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export const getExpenseReport = async (req: Request, res: Response) => {
    try {
        const { start, finish, storeId } = req.query as any;

        if (!start || !finish || !storeId) {
            return res.status(400).json({
                status: false,
                message: "start, finish, and storeId are required",
            });
        }

        const result = await AccountancyReportService.getExpenseReport({
            start,
            finish,
            storeId,
            accountId: req.query.accountId as string,
        });

        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};
