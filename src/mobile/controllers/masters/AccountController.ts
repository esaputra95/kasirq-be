import { Request, Response } from "express";
import { AccountQueryInterface } from "#root/interfaces/masters/AccountInterface";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import * as AccountService from "#root/mobile/services/masters/AccountService";

const getData = async (
    req: Request<{}, {}, {}, AccountQueryInterface>,
    res: Response
) => {
    try {
        const result = await AccountService.getAccounts(
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
        const result = await AccountService.createAccount(
            req.body,
            res.locals.userId,
            res.locals.userType
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const updateData = async (req: Request, res: Response) => {
    try {
        const result = await AccountService.updateAccount(
            req.params.id,
            req.body,
            res.locals.userId,
            res.locals.userType
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const deleteData = async (req: Request, res: Response) => {
    try {
        const result = await AccountService.deleteAccount(req.params.id);
        res.status(200).json({ status: false, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getDataById = async (req: Request, res: Response) => {
    try {
        const result = await AccountService.getAccountById(req.params.id);
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getSelect = async (req: Request, res: Response) => {
    try {
        const result = await AccountService.getAccountsForSelect(
            req.query.name as string | undefined,
            res.locals.userId,
            res.locals.userType
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        console.log({ error });

        handleErrorMessage(res, error);
    }
};

const uploadImage = async (req: Request, res: Response) => {
    try {
        res.status(200).json({
            code: 1,
            status: 200,
            message: "Successfully upload",
            data: req?.file?.filename ?? "",
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            errors: `${error}`,
        });
    }
};

export {
    getData,
    postData,
    updateData,
    deleteData,
    getDataById,
    getSelect,
    uploadImage,
};
