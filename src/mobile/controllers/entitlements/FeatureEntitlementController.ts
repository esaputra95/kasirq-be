import { Request, Response } from "express";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import * as FeatureEntitlementService from "#root/mobile/services/entitlements/FeatureEntitlementService";

const getStoreEntitlements = async (req: Request, res: Response) => {
    try {
        const result =
            await FeatureEntitlementService.getStoreEntitlementForUser(
                req.params.storeId,
                res.locals.userId,
                res.locals.level,
            );

        res.status(200).json({
            status: true,
            message: "successfully get store entitlements",
            data: result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export { getStoreEntitlements };
