import { Request, Response } from "express";
import { SalesPeopleQueryInterface } from "#root/interfaces/masters/SalesPeopleInterface";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import * as SalesPeopleService from "#root/mobile/services/masters/SalesPeopleService";

const getData = async (
    req: Request<{}, {}, {}, SalesPeopleQueryInterface>,
    res: Response
) => {
    try {
        const result = await SalesPeopleService.getSalesPeople(
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
        const result = await SalesPeopleService.createSalesPeople(
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
        const result = await SalesPeopleService.updateSalesPeople(
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
        const result = await SalesPeopleService.deleteSalesPeople(
            req.params.id
        );
        res.status(200).json({ status: false, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getDataById = async (req: Request, res: Response) => {
    try {
        const result = await SalesPeopleService.getSalesPeopleById(
            req.params.id
        );
        res.status(200).json({ status: true, ...result });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getSelect = async (req: Request, res: Response) => {
    try {
        const result = await SalesPeopleService.getSalesPeopleForSelect(
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
