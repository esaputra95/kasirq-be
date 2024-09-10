import express from "express";
import {
    getData,
} from "#controllers/reports/PurchaseReportController"
const Route = express.Router()

Route.get('/', getData);

export default Route;