import { Request, Response } from "express";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import * as StockOpnameService from "#root/mobile/services/supplies/StockOpnameService";

const getData = async (req: Request, res: Response) => {
    try {
        const result = await StockOpnameService.getStockOpnames(
            req.query,
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
        const result = await StockOpnameService.getStockOpnameById(
            req.params.id
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const postData = async (req: Request, res: Response) => {
    try {
        const result = await StockOpnameService.createStockOpname(
            req.body,
            res.locals.userId,
            res.locals.level
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        console.log({ error });

        handleErrorMessage(res, error);
    }
};

const updateData = async (req: Request, res: Response) => {
    try {
        const result = await StockOpnameService.updateStockOpname(
            req.params.id,
            req.body,
            res.locals.userId,
            res.locals.level
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        console.log({ error });

        handleErrorMessage(res, error);
    }
};

const deleteData = async (req: Request, res: Response) => {
    try {
        const result = await StockOpnameService.deleteStockOpname(
            req.params.id,
            res.locals.userId,
            res.locals.level
        );
        res.status(200).json({ status: false, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export { getData, getDataById, postData, updateData, deleteData };
