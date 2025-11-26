import { Request, Response } from "express";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import * as SaleReportService from "#root/mobile/services/reports/SaleReportService";

const getData = async (req: Request, res: Response) => {
    try {
        const result = await SaleReportService.getSaleReport({
            start: req.query.start as string,
            finish: req.query.finish as string,
            accountId: req.query.accountId as string | undefined,
            storeId: req.query.storeId as string | undefined,
            memberId: req.query.memberId as string | undefined,
        });

        console.log(JSON.stringify(result));

        res.status(200).json({
            status: true,
            ...result,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export { getData };
