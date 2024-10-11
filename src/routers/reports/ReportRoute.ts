import express from "express";
import {
    getData as getDataPurchase,
} from "#controllers/reports/PurchaseReportController"
import {
    getData as getDataSale,
} from "#controllers/reports/SaleReportController"
import {
    getData as getDataMarginSale,
} from "#controllers/reports/MarginSaleReportController"
const Route = express.Router()

Route.get('/purchase-reports', getDataPurchase);
Route.get('/sale-reports', getDataSale);
Route.get('/margin-sale-reports', getDataMarginSale);

export default Route;