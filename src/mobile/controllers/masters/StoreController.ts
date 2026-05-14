import { Request, Response } from "express";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import * as StoreService from "#root/mobile/services/masters/StoreService";

const getSelect = async (_req: Request, res: Response) => {
    try {
        const result = await StoreService.getStoresForSelect(
            res.locals.userId,
            res.locals.level,
        );
        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getSelectSubscription = async (_req: Request, res: Response) => {
    try {
        const result = await StoreService.getStoresForSelectSubscription(
            res.locals.userId,
            res.locals.level,
        );
        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
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

        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const uploadReceiptLogo = async (req: Request, res: Response) => {
    try {
        res.status(200).json({
            code: 1,
            status: 200,
            message: "Successfully uploaded receipt logo",
            data: req?.file?.filename ?? "",
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            errors: `${error}`,
        });
    }
};

export { getSelect, updateData, getDataById, getSelectSubscription, uploadReceiptLogo };
