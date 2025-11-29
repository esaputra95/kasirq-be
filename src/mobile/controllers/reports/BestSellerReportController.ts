import { Request, Response } from "express";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import * as BestSellerReportService from "#root/mobile/services/reports/BestSellerReportService";

const getData = async (req: Request, res: Response) => {
    try {
        const result = await BestSellerReportService.getBestSellerReport({
            start: req.query.start as string,
            finish: req.query.finish as string,
            storeId: req.query.storeId as string | undefined,
            limit: req.query.limit as string | undefined,
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
