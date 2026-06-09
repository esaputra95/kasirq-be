import { Request, Response } from "express";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import * as ActivityLogService from "#root/services/ActivityLogService";

const getData = async (
    req: Request<{}, {}, {}, ActivityLogService.ActivityLogQuery>,
    res: Response,
) => {
    try {
        const result = await ActivityLogService.getActivityLogs(req.query, {
            userId: res.locals.userId,
            level: res.locals.level,
        });

        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export { getData };
