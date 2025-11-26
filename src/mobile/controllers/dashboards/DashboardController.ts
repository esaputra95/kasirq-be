import { Request, Response } from "express";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import * as DashboardService from "#root/mobile/services/dashboards/DashboardService";

const getTotalSales = async (req: Request, res: Response) => {
    try {
        const { storeId } = req.query;
        const result = await DashboardService.getTotalSales(storeId as string);
        res.status(200).json({
            status: true,
            ...result
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getMarginWeek = async (req: Request, res: Response) => {
    try {
        const { storeId } = req.query;
        const result = await DashboardService.getMarginWeek(storeId as string);
        res.status(200).json({
            status: true,
            ...result
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getTotalPurchase = async (req: Request, res: Response) => {
    try {
        const result = await DashboardService.getTotalProducts(
            res.locals.userId,
            res.locals.userType
        );
        res.status(200).json({
            status: true,
            ...result
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getSalesWeek = async (req: Request, res: Response) => {
    try {
        const { storeId } = req.query;
        const result = await DashboardService.getSalesWeek(storeId as string);
        res.status(200).json({
            status: true,
            ...result
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getStoreExpired = async (req: Request, res: Response) => {
    try {
        const { storeId } = req.query;
        const result = await DashboardService.getStoreExpired(storeId as string);
        res.status(200).json({
           status: true,
            ...result
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export {
    getTotalSales,
    getTotalPurchase,
    getSalesWeek,
    getMarginWeek,
    getStoreExpired
};