import express from "express";
import { getData } from "#root/mobile/controllers/reports/StockOpnameReportController";

const Route = express.Router();

Route.get("/", getData);

export default Route;
