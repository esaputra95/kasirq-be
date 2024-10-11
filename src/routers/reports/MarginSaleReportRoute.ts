import express from "express";
import {
    getData,
} from "#controllers/reports/MarginSaleReportController"
const Route = express.Router()

Route.get('/', getData);

export default Route;