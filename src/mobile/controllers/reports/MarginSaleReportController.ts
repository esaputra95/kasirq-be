import { Request, Response } from "express";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import * as MarginSaleReportService from "#root/mobile/services/reports/MarginSaleReportService";

const getData = async (req: Request, res: Response) => {
    try {
        const result = await MarginSaleReportService.getMarginSaleReport({
            start: req.query.start as string,
            finish: req.query.finish as string,
            storeId: req.query.storeId as string,
        });
        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export { getData };
