import express from "express";
import {
    getSalesYear,
    getMarginYear,
    getOwnerSummary,
    getTopProducts,
    getActiveStores,
    getExpiringStores,
    getStorePerformance
} from "#root/admin/controllers/dashboards/DashboardController"

const DashboardsRoute = express.Router()

DashboardsRoute.get('/sales-year', getSalesYear);
DashboardsRoute.get('/margins-year', getMarginYear);
DashboardsRoute.get('/owner-summary', getOwnerSummary);
DashboardsRoute.get('/top-products', getTopProducts);
DashboardsRoute.get('/active-stores', getActiveStores);
DashboardsRoute.get('/expiring-stores', getExpiringStores);
DashboardsRoute.get('/store-performance', getStorePerformance);

export default DashboardsRoute