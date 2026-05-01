import { NextFunction, Request, Response } from "express";
import { checkPermissionAccess } from "#root/mobile/services/rbac/RbacService";

const checkPermission = (moduleName: string, actionName: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = res.locals.userId as string;
            const level = res.locals.level as string;
            const requestedStoreId = req.query.storeId as string | undefined;

            if (!userId) {
                return res.status(401).json({
                    status: false,
                    message: "Unauthorized",
                });
            }

            const result = await checkPermissionAccess(
                { userId, level },
                moduleName,
                actionName,
                requestedStoreId,
            );

            if (!result.allowed) {
                return res.status(403).json({
                    status: false,
                    message: "Akses ditolak: permission tidak tersedia",
                });
            }

            res.locals.storeId = result.storeId;
            return next();
        } catch (error: any) {
            const statusCode = error?.statusCode || 403;
            return res.status(statusCode).json({
                status: false,
                message: error?.message || "Akses ditolak",
            });
        }
    };
};

export default checkPermission;
