import express from "express";
import {
    getTotalPurchase,
    getTotalSales,
} from "#controllers/dashboards/DashboardController"

const DashboardRoute = express.Router()

DashboardRoute.get('/total-sales', getTotalSales);
DashboardRoute.get('/total-purchase', getTotalPurchase);

export default DashboardRoute