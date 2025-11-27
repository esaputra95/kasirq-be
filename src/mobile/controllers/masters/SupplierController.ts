import { Request, Response } from "express";
import { SupplierQueryInterface } from "#root/interfaces/masters/SupplierInterface";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import * as SupplierService from "#root/mobile/services/masters/SupplierService";

const getData = async (
    req: Request<{}, {}, {}, SupplierQueryInterface>,
    res: Response
) => {
    try {
        const result = await SupplierService.getSuppliers(
            req.query,
            res.locals.userId,
            res.locals.level
        );
        console.log({ result });

        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const postData = async (req: Request, res: Response) => {
    try {
        const result = await SupplierService.createSupplier(
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
        const result = await SupplierService.updateSupplier(
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
        const result = await SupplierService.deleteSupplier(req.params.id);
        res.status(200).json({ status: false, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getDataById = async (req: Request, res: Response) => {
    try {
        const result = await SupplierService.getSupplierById(req.params.id);
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getSelect = async (req: Request, res: Response) => {
    try {
        console.log("query : ", req.query);

        const result = await SupplierService.getSuppliersForSelect(
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
