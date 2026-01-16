import { Request, Response } from "express";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import * as StoreService from "#root/mobile/services/masters/StoreService";

const getSelect = async (_req: Request, res: Response) => {
    try {
        const result = await StoreService.getStoresForSelect(
            res.locals.userId,
            res.locals.level
        );
        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        console.log({ error });

        handleErrorMessage(res, error);
    }
};

const getSelectSubscription = async (_req: Request, res: Response) => {
    try {
        const result = await StoreService.getStoresForSelectSubscription(
            res.locals.userId,
            res.locals.level
        );
        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        console.log({ error });

        handleErrorMessage(res, error);
    }
};

const updateData = async (req: Request, res: Response) => {
    try {
        const result = await StoreService.updateStore(req.params.id, req.body);
        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getDataById = async (req: Request, res: Response) => {
    try {
        const result = await StoreService.getStoreById(req.params.id);
        console.log({ result });

        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        console.log({ error });

        handleErrorMessage(res, error);
    }
};

export { getSelect, updateData, getDataById, getSelectSubscription };
