import { Request, Response } from "express";
import { CategoryQueryInterface } from "#root/interfaces/masters/CategoryInterface";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import * as CategoryService from "#root/mobile/services/masters/CategoryService";

const getData = async (req: Request<{}, {}, {}, CategoryQueryInterface>, res: Response) => {
    try {
        const result = await CategoryService.getCategories(req.query, res.locals.userId, res.locals.level);
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const postData = async (req: Request, res: Response) => {
    try {
        const result = await CategoryService.createCategory(req.body, res.locals.userId, res.locals.level);
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const updateData = async (req: Request, res: Response) => {
    try {
        const result = await CategoryService.updateCategory(req.params.id, req.body);
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const deleteData = async (req: Request, res: Response) => {
    try {
        const result = await CategoryService.deleteCategory(req.params.id);
        res.status(200).json({ status: false, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getDataById = async (req: Request, res: Response) => {
    try {
        const result = await CategoryService.getCategoryById(req.params.id);
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getSelect = async (req: Request, res: Response) => {
    try {
        const result = await CategoryService.getCategoriesForSelect(req.query.name as string | undefined, res.locals.userId, res.locals.level);
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export { getData, postData, updateData, deleteData, getDataById, getSelect };
