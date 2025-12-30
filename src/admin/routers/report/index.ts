import express from "express";
import {
    getData,
    xlsxData,
    download,
} from "#root/admin/controllers/reports/ReportSalesController";
import {
    getData as getDataPurchase,
    xlsxData as xlsxDataPurchase,
    download as downloadPurchase,
} from "#root/admin/controllers/reports/ReportPurchasesController";
import {
    getData as getDataMargin,
    xlsxData as xlsxDataMargin,
    download as downloadMargin,
} from "#root/admin/controllers/reports/ReportMarginsController";
import {
    getData as getDataBestSeller,
    xlsxData as xlsxDataBestSeller,
    download as downloadBestSeller,
} from "#root/admin/controllers/reports/ReportBestSellersController";
import {
    getData as getDataStockOpname,
    xlsxData as xlsxDataStockOpname,
    download as downloadStockOpname,
} from "#root/admin/controllers/reports/ReportStockOpnamesController";
import {
    getData as getDataAttendance,
    xlsxData as xlsxDataAttendance,
    download as downloadAttendance,
} from "#root/admin/controllers/reports/ReportAttendancesController";
import * as AccountancyController from "#root/admin/controllers/reports/ReportAccountancyController";

const ReportSalesRoute = express.Router();

ReportSalesRoute.get("/sales-report", getData);
ReportSalesRoute.get("/sales-report/excel", xlsxData);
ReportSalesRoute.get("/sales-report/download", download);

ReportSalesRoute.get("/purchases-report", getDataPurchase);
ReportSalesRoute.get("/purchases-report/excel", xlsxDataPurchase);
ReportSalesRoute.get("/purchases-report/download", downloadPurchase);

ReportSalesRoute.get("/margins-report", getDataMargin);
ReportSalesRoute.get("/margins-report/excel", xlsxDataMargin);
ReportSalesRoute.get("/margins-report/download", downloadMargin);

ReportSalesRoute.get("/best-seller-report", getDataBestSeller);
ReportSalesRoute.get("/best-seller-report/excel", xlsxDataBestSeller);
ReportSalesRoute.get("/best-seller-report/download", downloadBestSeller);

ReportSalesRoute.get("/stock-opname-report", getDataStockOpname);
ReportSalesRoute.get("/stock-opname-report/excel", xlsxDataStockOpname);
ReportSalesRoute.get("/stock-opname-report/download", downloadStockOpname);

ReportSalesRoute.get("/attendance-report", getDataAttendance);
ReportSalesRoute.get("/attendance-report/excel", xlsxDataAttendance);
ReportSalesRoute.get("/attendance-report/download", downloadAttendance);

ReportSalesRoute.get(
    "/accountancy-report",
    AccountancyController.getAccountancyReport
);
ReportSalesRoute.get(
    "/accountancy-report/excel",
    AccountancyController.xlsxAccountancyReport
);

ReportSalesRoute.get(
    "/account-balance-report",
    AccountancyController.getAccountBalances
);
ReportSalesRoute.get(
    "/account-balance-report/excel",
    AccountancyController.xlsxAccountBalances
);

ReportSalesRoute.get(
    "/transfer-report",
    AccountancyController.getTransferReport
);
ReportSalesRoute.get(
    "/transfer-report/excel",
    AccountancyController.xlsxTransferReport
);

ReportSalesRoute.get("/cash-in-report", AccountancyController.getCashInReport);
ReportSalesRoute.get(
    "/cash-out-report",
    AccountancyController.getCashOutReport
);
ReportSalesRoute.get("/expense-report", AccountancyController.getExpenseReport);

export default ReportSalesRoute;
