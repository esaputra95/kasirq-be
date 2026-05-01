import { Request, Response } from "express";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import {
    assignRole,
    createRole,
    getPermissionsForActor,
    getRoleForLevelWithPermissions,
    getRolesWithPermissions,
    purgeAllRbacData,
    registerDefaultRolesForStores,
    resetRbacRoles,
    runRbacMigration,
    updateRole,
} from "#root/mobile/services/rbac/RbacService";

export const getPermissions = async (req: Request, res: Response) => {
    try {
        const result = await getPermissionsForActor(
            {
                userId: res.locals.userId,
                level: res.locals.level,
            },
            req.query.storeId as string | undefined,
        );
        return res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        return handleErrorMessage(res, error);
    }
};

export const getRoles = async (req: Request, res: Response) => {
    try {
        const result = await getRolesWithPermissions(
            {
                userId: res.locals.userId,
                level: res.locals.level,
            },
            req.query.storeId as string | undefined,
        );
        return res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        console.log(error);

        return handleErrorMessage(res, error);
    }
};

export const getMyRole = async (req: Request, res: Response) => {
    try {
        const result = await getRoleForLevelWithPermissions(
            {
                userId: res.locals.userId,
                level: res.locals.level,
            },
            req.query.storeId as string | undefined,
        );

        return res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        return handleErrorMessage(res, error);
    }
};

export const postRole = async (req: Request, res: Response) => {
    try {
        const result = await createRole(
            {
                userId: res.locals.userId,
                level: res.locals.level,
            },
            {
                name: req.body?.name,
                permissionIds: req.body?.permissionIds || [],
            },
            req.query.storeId as string | undefined,
        );

        return res.status(201).json({
            status: true,
            data: result,
        });
    } catch (error) {
        return handleErrorMessage(res, error);
    }
};

export const putRole = async (req: Request, res: Response) => {
    try {
        const result = await updateRole(
            {
                userId: res.locals.userId,
                level: res.locals.level,
            },
            req.params.id,
            {
                name: req.body?.name,
                permissionIds: req.body?.permissionIds,
            },
            req.query.storeId as string | undefined,
        );

        return res.status(200).json({
            status: true,
            data: result,
        });
    } catch (error) {
        return handleErrorMessage(res, error);
    }
};

export const postAssignRole = async (req: Request, res: Response) => {
    try {
        const result = await assignRole(
            {
                userId: res.locals.userId,
                level: res.locals.level,
            },
            {
                userId: req.body?.userId,
                storeId: req.body?.storeId,
                roleId: req.body?.roleId,
            },
            req.query.storeId as string | undefined,
        );

        return res.status(200).json({
            status: true,
            data: result,
        });
    } catch (error) {
        return handleErrorMessage(res, error);
    }
};

export const postMigrateRbac = async (req: Request, res: Response) => {
    try {
        const result = await runRbacMigration(
            {
                userId: res.locals.userId,
                level: res.locals.level,
            },
            req.query.storeId as string | undefined,
        );

        return res.status(200).json({
            status: true,
            message: "Migrasi RBAC berhasil dijalankan",
            data: result,
        });
    } catch (error) {
        return handleErrorMessage(res, error);
    }
};

export const postResetRbac = async (req: Request, res: Response) => {
    try {
        const result = await resetRbacRoles(
            {
                userId: res.locals.userId,
                level: res.locals.level,
            },
            req.query.storeId as string | undefined,
        );

        return res.status(200).json({
            status: true,
            message: "Reset RBAC berhasil dijalankan",
            data: result,
        });
    } catch (error) {
        return handleErrorMessage(res, error);
    }
};

export const postRegisterRolesAllStores = async (
    req: Request,
    res: Response,
) => {
    try {
        const result = await registerDefaultRolesForStores(
            {
                userId: res.locals.userId,
                level: res.locals.level,
            },
            req.query.storeId as string | undefined,
        );

        return res.status(200).json({
            status: true,
            message: "Register role berhasil dijalankan",
            data: result,
        });
    } catch (error) {
        return handleErrorMessage(res, error);
    }
};

export const postPurgeAllRbac = async (req: Request, res: Response) => {
    try {
        const result = await purgeAllRbacData({
            userId: res.locals.userId,
            level: res.locals.level,
        });

        return res.status(200).json({
            status: true,
            message: "Semua data RBAC berhasil dihapus",
            data: result,
        });
    } catch (error) {
        return handleErrorMessage(res, error);
    }
};
