import express from "express";
import {
    getTotalPurchase,
    getTotalSales,
    getSalesWeek,
    getMarginWeek
} from "#controllers/dashboards/DashboardController"

const DashboardRoute = express.Router()

DashboardRoute.get('/total-sales', getTotalSales);
DashboardRoute.get('/total-purchase', getTotalPurchase);
DashboardRoute.get('/sales-week', getSalesWeek);
DashboardRoute.get('/margin-week', getMarginWeek);

export default DashboardRoute