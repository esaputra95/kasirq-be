import { Request, Response } from "express";
import { MemberQueryInterface } from "#root/interfaces/masters/MemberInterface";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import * as MemberService from "#root/mobile/services/masters/MemberService";

const getData = async (
    req: Request<{}, {}, {}, MemberQueryInterface>,
    res: Response
) => {
    try {
        const result = await MemberService.getMembers(
            req.query,
            res.locals.userId,
            res.locals.level
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const postData = async (req: Request, res: Response) => {
    try {
        const result = await MemberService.createMember(
            req.body,
            res.locals.userId,
            res.locals.level
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const updateData = async (req: Request, res: Response) => {
    try {
        const result = await MemberService.updateMember(
            req.params.id,
            req.body
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const deleteData = async (req: Request, res: Response) => {
    try {
        const result = await MemberService.deleteMember(req.params.id);
        res.status(200).json({ status: false, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getDataById = async (req: Request, res: Response) => {
    try {
        const result = await MemberService.getMemberById(req.params.id);
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getSelect = async (req: Request, res: Response) => {
    try {
        const result = await MemberService.getMembersForSelect(
            req.query.name as string | undefined,
            res.locals.userId,
            res.locals.level
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export { getData, postData, updateData, deleteData, getDataById, getSelect };
