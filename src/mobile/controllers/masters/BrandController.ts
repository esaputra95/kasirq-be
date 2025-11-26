import { Request, Response } from "express";
import { BrandQueryInterface } from "#root/interfaces/masters/BrandInterface";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import * as BrandService from "#root/mobile/services/masters/BrandService";

const getData = async (req: Request<{}, {}, {}, BrandQueryInterface>, res: Response) => {
    try {
        const result = await BrandService.getBrands(
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
        const result = await BrandService.createBrand(
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
        const result = await BrandService.updateBrand(req.params.id, req.body);
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
        const result = await BrandService.deleteBrand(req.params.id);
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
        const result = await BrandService.getBrandById(req.params.id);
        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getSelect = async (req: Request, res: Response) => {
    try {
        const result = await BrandService.getBrandsForSelect(
            req.query.name as string | undefined,
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

export {
    getData,
    postData,
    updateData,
    deleteData,
    getDataById,
    getSelect
};