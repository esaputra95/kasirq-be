import { NextFunction, Request, Response } from "express";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import Model from "#root/services/PrismaService";
import { assertStoreCanUseFeature } from "#root/mobile/services/entitlements/FeatureEntitlementService";

type StoreIdResolver = (req: Request) => string | null | undefined;

const defaultStoreIdResolver: StoreIdResolver = (req) =>
    (req.body?.storeId as string | undefined) ??
    (req.query?.storeId as string | undefined);

export const requireStoreFeature = (
    featureKey: string,
    storeIdResolver: StoreIdResolver = defaultStoreIdResolver,
) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await assertStoreCanUseFeature(
                Model,
                storeIdResolver(req),
                featureKey,
                {
                    userId: res.locals.userId,
                    method: req.method,
                    path: req.originalUrl,
                },
            );
            next();
        } catch (error) {
            handleErrorMessage(res, error);
        }
    };
};
