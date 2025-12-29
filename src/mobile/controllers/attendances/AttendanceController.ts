import { Request, Response } from "express";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import getOwnerId from "#root/helpers/GetOwnerId";
import * as AttendanceService from "../../services/attendances/AttendanceService";

const getTodayStatus = async (req: Request, res: Response) => {
    try {
        const userId = res.locals.userId;
        const result = await AttendanceService.getTodayStatus(userId);
        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const checkIn = async (req: Request, res: Response) => {
    try {
        const userId = res.locals.userId;
        const result = await AttendanceService.checkIn(userId, req.body);
        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const checkOut = async (req: Request, res: Response) => {
    try {
        const userId = res.locals.userId;
        const result = await AttendanceService.checkOut(userId, req.body);
        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getHistory = async (req: Request, res: Response) => {
    try {
        const userId = res.locals.userId;
        const result = await AttendanceService.getHistory(userId, req.query);
        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getData = async (req: Request, res: Response) => {
    try {
        const userId = res.locals.userId;
        const userLevel = res.locals.level;
        const ownerIdRes = await getOwnerId(userId, userLevel);
        const ownerId = (ownerIdRes as any).id;

        const result = await AttendanceService.getData(ownerId, req.query);

        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export { getTodayStatus, checkIn, checkOut, getHistory, getData };
