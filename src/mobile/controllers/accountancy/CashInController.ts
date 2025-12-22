import { Request, Response } from "express";
import * as CashflowService from "#root/mobile/services/accountancy/CashflowService";
import { handleErrorMessage } from "#root/helpers/handleErrors";

export const getData = async (req: Request, res: Response) => {
    try {
        const { locals } = res as any;
        const query = { ...req.query, type: "IN", referenceType: "MANUAL" };
        const result = await CashflowService.getCashflows(
            query as any,
            locals.userId,
            locals.level
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export const postData = async (req: Request, res: Response) => {
    try {
        const { locals } = res as any;
        const data = { ...req.body, type: "IN", referenceType: "MANUAL" };

        const result = await CashflowService.createCashflow(
            data,
            locals.userId,
            locals.level
        );
        res.status(201).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export const updateData = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { locals } = res as any;
        const data = { ...req.body, type: "IN", referenceType: "MANUAL" };
        const result = await CashflowService.updateCashflow(
            id,
            data,
            locals.userId,
            locals.level
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export const deleteData = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { locals } = res as any;
        const result = await CashflowService.deleteCashflow(
            id,
            locals.userId,
            locals.level
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export const getDataById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { locals } = res as any;
        const result = await CashflowService.getCashflowById(
            id,
            locals.userId,
            locals.level
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};
