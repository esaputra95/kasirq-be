import { Request, Response } from "express";
import { ProductQueryInterface } from "#root/interfaces/masters/ProductInterface";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import * as ProductService from "#root/mobile/services/masters/ProductService";

const getData = async (req: Request<{}, {}, {}, ProductQueryInterface>, res: Response) => {
    try {
        const result = await ProductService.getProducts(req.query, res.locals.userId, res.locals.level);
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getProductSell = async (req: Request<{}, {}, {}, ProductQueryInterface>, res: Response) => {
    try {
        const result = await ProductService.getProductsForSell(req.query, res.locals.userId, res.locals.level);
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const postData = async (req: Request, res: Response) => {
    try {
        const result = await ProductService.createProduct(req.body, res.locals.userId, res.locals.level);
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const updateData = async (req: Request, res: Response) => {
    try {
        const result = await ProductService.updateProduct(
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
        const result = await ProductService.deleteProduct(
            req.params.id,
            res.locals.userId,
            res.locals.level
        );
        res.status(200).json({ status: false, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getDataById = async (req: Request, res: Response) => {
    try {
        const result = await ProductService.getProductById(req.params.id);
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const uploadImage = async (req: Request, res: Response) => {
    try {
        res.status(200).json({
            code: 1,
            status: 200,
            message: "Successfully upload",
            data: req?.file?.filename ?? ""
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            errors: `${error}`
        });
    }
};

const getPriceMember = async (req: Request, res: Response) => {
    try {
        const result = await ProductService.getPriceMember(req.body);
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        res.status(500).json({
            status: false,
            errors: `${error}`
        });
    }
};

export {
    getData,
    getProductSell,
    postData,
    updateData,
    deleteData,
    getDataById,
    uploadImage,
    getPriceMember
};
