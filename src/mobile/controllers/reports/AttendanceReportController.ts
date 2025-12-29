import { Request, Response } from "express";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import getOwnerId from "#root/helpers/GetOwnerId";
import * as AttendanceReportService from "#root/mobile/services/reports/AttendanceReportService";

export const getData = async (req: Request, res: Response) => {
    try {
        const userId = res.locals.userId;
        const userLevel = res.locals.level;
        const ownerIdRes = await getOwnerId(userId, userLevel);
        const ownerId = (ownerIdRes as any).id;

        const { start, finish, storeId, userId: filterUserId } = req.query;

        const result = await AttendanceReportService.getAttendanceReport({
            start: start as string,
            finish: finish as string,
            storeId: storeId as string,
            userId: filterUserId as string,
            ownerId,
        });

        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};
