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
        handleErrorMessage(res, error);
    }
};

export { getSelect };
