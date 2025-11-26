import { Request, Response } from "express";
import path from "path";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import * as AuthService from "#root/mobile/services/auth/AuthService";

const Login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const result = await AuthService.loginUser(email, password);
        res.json(result);
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const RegisterOwner = async (req: Request, res: Response) => {
    try {
        const result = await AuthService.registerOwner(req.body);
        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const Verification = async (req: Request, res: Response) => {
    try {
        const { code } = req.query;
        await AuthService.verifyEmail(code as string);
        res.sendFile(
            path.join(__dirname, "/../../public/successActiveRegister.html")
        );
    } catch (error) {
        console.log({ error });
        res.status(400).send("Invalid verification token");
    }
};

const RequestCode = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        const result = await AuthService.requestPasswordResetCode(email);
        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const VerificationCode = async (req: Request, res: Response) => {
    try {
        const { email, code } = req.body;
        const result = await AuthService.verifyPasswordResetCode(email, code);
        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const ForgotPassword = async (req: Request, res: Response) => {
    try {
        const { email, newPassword, confirmNewPassword } = req.body;
        const result = await AuthService.resetPassword(
            email,
            newPassword,
            confirmNewPassword
        );
        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export {
    Login,
    Verification,
    RegisterOwner,
    RequestCode,
    VerificationCode,
    ForgotPassword,
};
