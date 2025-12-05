import { UserQueryInterface } from "#root/interfaces/UserInterface";
import { Request, Response } from "express";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import * as UserService from "#root/mobile/services/masters/UserService";

const getData = async (
    req: Request<{}, {}, {}, UserQueryInterface>,
    res: Response
) => {
    try {
        const result = await UserService.getUsers(
            req.query,
            res.locals.userId,
            res.locals.userType
        );
        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const postData = async (req: Request, res: Response) => {
    try {
        const result = await UserService.createUser(
            req.body,
            res.locals.userId,
            res.locals.userType
        );
        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const updateData = async (req: Request, res: Response) => {
    try {
        const result = await UserService.updateUser(req.params.id, req.body);
        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const changePassword = async (req: Request, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const result = await UserService.changePassword(
            res.locals.userId,
            currentPassword,
            newPassword
        );
        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const deleteData = async (req: Request, res: Response) => {
    try {
        const result = await UserService.deleteUser(req.params.id);
        res.status(200).json({
            status: false,
            ...result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getDataById = async (req: Request, res: Response) => {
    try {
        const result = await UserService.getUserById(req.params.id);
        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getDataCashiers = async (
    req: Request<{}, {}, {}, UserQueryInterface>,
    res: Response
) => {
    try {
        const result = await UserService.getUserCashiers(req.query);
        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const postDeviceToken = async (req: Request, res: Response) => {
    try {
        const result = await UserService.postDeviceToken(
            req.body.userId,
            req.body.token,
            req.body.platform || "android" // Default to android if not specified
        );
        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

// Delete atau non active device token
const deleteDeviceToken = async (req: Request, res: Response) => {
    try {
        const result = await UserService.deleteDeviceToken(req.params.id);
        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export {
    getData,
    postData,
    updateData,
    deleteData,
    getDataById,
    changePassword,
    getDataCashiers,
    postDeviceToken,
    deleteDeviceToken,
};
