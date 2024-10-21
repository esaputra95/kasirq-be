import express from "express";
import {
    getData
} from "#root/admin/controllers/reports/ReportSalesController"

const ReportSalesRoute = express.Router()

ReportSalesRoute.get('/sales', getData);

export default ReportSalesRoute