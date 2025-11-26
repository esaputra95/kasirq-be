import { Request, Response } from "express";
import { UnitQueryInterface } from "#root/interfaces/masters/UnitInterface";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import * as UnitService from "#root/mobile/services/masters/UnitService";

const getData = async (req: Request<{}, {}, {}, UnitQueryInterface>, res: Response) => {
    try {
        const result = await UnitService.getUnits(
            req.query,
            res.locals.userId,
            res.locals.level
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
        const result = await UnitService.createUnit(
            req.body,
            res.locals.userId,
            res.locals.level
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
        const result = await UnitService.updateUnit(req.params.id, req.body);
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
        const result = await UnitService.deleteUnit(req.params.id);
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
        const result = await UnitService.getUnitById(req.params.id);
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
        const result = await UnitService.getUnitsForSelect(
            req.query.name as string | undefined,
            res.locals.userId,
            res.locals.level
        );
        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export { getData, postData, updateData, deleteData, getDataById, getSelect };
