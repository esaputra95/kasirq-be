import { Request, Response } from "express";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import * as PurchaseReportService from "#root/mobile/services/reports/PurchaseReportService";

const getData = async (req: Request, res: Response) => {
    try {
        const result = await PurchaseReportService.getPurchaseReport({
            start: req.query.start as string,
            finish: req.query.finish as string,
            storeId: req.query.storeId as string | undefined,
            supplierId: req.query.supplierId as string | undefined
        });
        res.status(200).json({
            status: true,
            ...result
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export { getData };
