import express from "express";
import {
    ReportSalesRoute,
} from "#root/admin/routers/report"
const AdminRoute = express.Router()

AdminRoute.use('/reports', ReportSalesRoute);

export default AdminRoute;