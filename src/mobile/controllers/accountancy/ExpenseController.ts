import { Request, Response } from "express";
import { ExpenseQueryInterface } from "#root/interfaces/accountancy/ExpenseInterface";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import * as ExpenseService from "#root/mobile/services/accountancy/ExpenseService";

const getData = async (
    req: Request<{}, {}, {}, ExpenseQueryInterface>,
    res: Response
) => {
    try {
        const result = await ExpenseService.getExpenses(
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
        const result = await ExpenseService.createExpense(
            req.body,
            res.locals.userId,
            res.locals.level
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        console.log({ error });

        handleErrorMessage(res, error);
    }
};

const updateData = async (req: Request, res: Response) => {
    try {
        const result = await ExpenseService.updateExpense(
            req.params.id,
            req.body,
            res.locals.userId,
            res.locals.level
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const deleteData = async (req: Request, res: Response) => {
    try {
        const result = await ExpenseService.deleteExpense(
            req.params.id,
            res.locals.userId,
            res.locals.level
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getDataById = async (req: Request, res: Response) => {
    try {
        const result = await ExpenseService.getExpenseById(
            req.params.id,
            res.locals.userId,
            res.locals.level
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export { getData, postData, updateData, deleteData, getDataById };
