import { Request, Response } from "express";
import { ExpenseCategoryQueryInterface } from "#root/interfaces/accountancy/ExpenseCategoryInterface";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import * as ExpenseCategoryService from "#root/mobile/services/accountancy/ExpenseCategoryService";

const getData = async (
    req: Request<{}, {}, {}, ExpenseCategoryQueryInterface>,
    res: Response
) => {
    try {
        const result = await ExpenseCategoryService.getExpenseCategories(
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
        const result = await ExpenseCategoryService.createExpenseCategory(
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
        const result = await ExpenseCategoryService.updateExpenseCategory(
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
        const result = await ExpenseCategoryService.deleteExpenseCategory(
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
        const result = await ExpenseCategoryService.getExpenseCategoryById(
            req.params.id,
            res.locals.userId,
            res.locals.level
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getSelect = async (req: Request, res: Response) => {
    try {
        const result =
            await ExpenseCategoryService.getExpenseCategoriesForSelect(
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
