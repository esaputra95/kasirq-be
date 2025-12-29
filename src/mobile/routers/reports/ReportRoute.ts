import express from "express";
import { getData as getDataPurchase } from "#root/mobile/controllers/reports/PurchaseReportController";
import { getData as getDataSale } from "#root/mobile/controllers/reports/SaleReportController";
import { getData as getDataMarginSale } from "#root/mobile/controllers/reports/MarginSaleReportController";
import { getData as getDataBestSeller } from "#root/mobile/controllers/reports/BestSellerReportController";
import { getData as getDataStockOpname } from "#root/mobile/controllers/reports/StockOpnameReportController";
import * as AccountancyReportController from "#root/mobile/controllers/reports/AccountancyReportController";
import { getData as getDataAttendance } from "#root/mobile/controllers/reports/AttendanceReportController";
const Route = express.Router();

Route.get("/purchase-reports", getDataPurchase);
Route.get("/sale-reports", getDataSale);
Route.get("/margin-sale-reports", getDataMarginSale);
Route.get("/best-seller-reports", getDataBestSeller);
Route.get("/stock-opname-reports", getDataStockOpname);
Route.get(
    "/accountancy-reports",
    AccountancyReportController.getAccountancyReport
);
Route.get("/account-balances", AccountancyReportController.getAccountBalances);
Route.get("/transfer-reports", AccountancyReportController.getTransferReport);
Route.get("/cash-in-reports", AccountancyReportController.getCashInReport);
Route.get("/cash-out-reports", AccountancyReportController.getCashOutReport);
Route.get("/expense-reports", AccountancyReportController.getExpenseReport);
Route.get("/attendance-reports", getDataAttendance);

export default Route;
