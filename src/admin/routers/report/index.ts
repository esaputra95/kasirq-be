import express from "express";
import {
    getData,
    xlsxData,
    download
} from "#root/admin/controllers/reports/ReportSalesController"
import {
    getData as getDataPurchase,
    xlsxData as xlsxDataPurchase,
    download as downloadPurchase
} from "#root/admin/controllers/reports/ReportPurchasesController"
import {
    getData as getDataMargin,
    xlsxData as xlsxDataMargin,
    download as downloadMargin
} from "#root/admin/controllers/reports/ReportMarginsController"

const ReportSalesRoute = express.Router()

ReportSalesRoute.get('/sales-report', getData);
ReportSalesRoute.get('/sales-report/excel', xlsxData);
ReportSalesRoute.get('/sales-report/download', download);
ReportSalesRoute.get('/purchases-report', getDataPurchase);
ReportSalesRoute.get('/purchases-report/excel', xlsxDataPurchase);
ReportSalesRoute.get('/purchases-report/download', downloadPurchase);
ReportSalesRoute.get('/margins-report', getDataMargin);
ReportSalesRoute.get('/margins-report/excel', xlsxDataMargin);
ReportSalesRoute.get('/margins-report/download', downloadMargin);

export default ReportSalesRoute