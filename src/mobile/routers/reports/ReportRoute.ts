import express from "express";
import {
    getData as getDataPurchase,
} from "#root/mobile/controllers/reports/PurchaseReportController"
import {
    getData as getDataSale,
} from "#root/mobile/controllers/reports/SaleReportController"
import {
    getData as getDataMarginSale,
} from "#root/mobile/controllers/reports/MarginSaleReportController"
const Route = express.Router()

Route.get('/purchase-reports', getDataPurchase);
Route.get('/sale-reports', getDataSale);
Route.get('/margin-sale-reports', getDataMarginSale);

export default Route;