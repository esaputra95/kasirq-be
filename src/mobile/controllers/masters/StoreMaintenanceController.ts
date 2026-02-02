import { Request, Response } from "express";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import * as StoreMaintenanceService from "#root/mobile/services/masters/StoreMaintenanceService";

/**
 * Handle store data reset request
 */
export const resetStoreData = async (req: Request, res: Response) => {
    try {
        const { storeId } = req.body;
        const ownerId = res.locals.userId;

        if (!storeId) {
            return res.status(400).json({
                status: false,
                message: "storeId is required",
            });
        }

        const result = await StoreMaintenanceService.resetStoreData(
            storeId,
            ownerId,
        );

        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

/**
 * Handle stock reset request for specific product in a specific store
 */
export const resetStock = async (req: Request, res: Response) => {
    try {
        const ownerId = res.locals.userId;
        const { productId, storeId } = req.body;

        if (!productId || !storeId) {
            return res.status(400).json({
                status: false,
                message: "productId and storeId are required",
            });
        }

        const result = await StoreMaintenanceService.resetStock(
            productId,
            storeId,
            ownerId,
        );

        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};
