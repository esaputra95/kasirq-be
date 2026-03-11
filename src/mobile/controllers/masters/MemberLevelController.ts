import { Request, Response } from "express";
import { MemberLevelQueryInterface } from "#root/interfaces/masters/MemberLevelInterface";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import * as MemberLevelService from "#root/mobile/services/masters/MemberLevelService";

const getData = async (
    req: Request<{}, {}, {}, MemberLevelQueryInterface>,
    res: Response,
) => {
    try {
        const result = await MemberLevelService.getMemberLevels(
            req.query,
            res.locals.userId,
            res.locals.level,
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const postData = async (req: Request, res: Response) => {
    try {
        const result = await MemberLevelService.createMemberLevel(
            req.body,
            res.locals.userId,
            res.locals.level,
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const updateData = async (req: Request, res: Response) => {
    try {
        const result = await MemberLevelService.updateMemberLevel(
            req.params.id,
            req.body,
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const deleteData = async (req: Request, res: Response) => {
    try {
        const result = await MemberLevelService.deleteMemberLevel(
            req.params.id,
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getDataById = async (req: Request, res: Response) => {
    try {
        const result = await MemberLevelService.getMemberLevelById(
            req.params.id,
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getSelect = async (req: Request, res: Response) => {
    try {
        const result = await MemberLevelService.getMemberLevelsForSelect(
            req.query.name as string | undefined,
            res.locals.userId,
            res.locals.level,
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export { getData, postData, updateData, deleteData, getDataById, getSelect };
