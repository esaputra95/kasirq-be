import express from "express";
import {
    getSalesYear,
    getMarginYear
} from "#root/admin/controllers/dashboards/DashboardController"

const DashboardsRoute = express.Router()

DashboardsRoute.get('/sales-year', getSalesYear);
DashboardsRoute.get('/margins-year', getMarginYear);

export default DashboardsRoute