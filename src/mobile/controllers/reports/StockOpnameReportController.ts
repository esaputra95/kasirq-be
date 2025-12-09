import { Request, Response } from "express";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import * as StockOpnameReportService from "#root/mobile/services/reports/StockOpnameReportService";

const getData = async (req: Request, res: Response) => {
    try {
        const result = await StockOpnameReportService.getStockOpnameReport(
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

export { getData };
