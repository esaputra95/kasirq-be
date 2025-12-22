import { Request, Response } from "express";
import { CashflowQueryInterface } from "#root/interfaces/accountancy/CashflowInterface";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import * as CashflowService from "#root/mobile/services/accountancy/CashflowService";

const getData = async (
    req: Request<{}, {}, {}, CashflowQueryInterface>,
    res: Response
) => {
    try {
        const result = await CashflowService.getCashflows(
            { ...req.query, referenceType: "MANUAL" },
            res.locals.userId,
            res.locals.level
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const postData = async (req: Request, res: Response) => {
    try {
        const result = await CashflowService.createCashflow(
            { ...req.body, referenceType: "MANUAL" },
            res.locals.userId,
            res.locals.level
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const updateData = async (req: Request, res: Response) => {
    try {
        const result = await CashflowService.updateCashflow(
            req.params.id,
            { ...req.body, referenceType: "MANUAL" },
            res.locals.userId,
            res.locals.level
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const deleteData = async (req: Request, res: Response) => {
    try {
        const result = await CashflowService.deleteCashflow(
            req.params.id,
            res.locals.userId,
            res.locals.level
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getDataById = async (req: Request, res: Response) => {
    try {
        const result = await CashflowService.getCashflowById(
            req.params.id,
            res.locals.userId,
            res.locals.level
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export { getData, postData, updateData, deleteData, getDataById };
