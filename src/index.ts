import express from "express";
import "module-alias/register";
import "dotenv/config";
import bodyParser from "body-parser";
import path from "path";
import cors from "cors";

import login from "./mobile/routers/auth/index";
import {
    AccountRoute,
    BrandRoute,
    CategoryRoute,
    MemberRoute,
    NotificationRoute,
    ProductRoute,
    SalesPeopleRoute,
    StoreRoute,
    SupplierRoute,
    UnitRoute,
    user,
} from "./mobile/routers/masters";
import { AccessToken } from "./mobile/controllers/auth/middlewareController";
import { PurchaseRoute } from "./mobile/routers/purrchases";
import { ItemInRoute, StockOpnameRoute } from "./mobile/routers/supplies";
import { SalePendingRoute, SalesRoute } from "./mobile/routers/sales";
import { ReportRoute } from "./mobile/routers/reports";
import DashboardRoute from "#root/mobile/routers/dashboards/DashboardRoute";
import AdminRoute from "./admin/routers";
import sendEmail from "./helpers/sendEmail";
import {
    CashflowRoute,
    ExpenseCategoryRoute,
    ExpenseRoute,
    TransferRoute,
    CashInRoute,
    CashOutRoute,
} from "./mobile/routers/accountancy";
import { enhanceStore } from "./services/enhanceStore";

const app = express();
app.use(cors());
app.use(bodyParser.json()); // Parse JSON requests
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/auth", login);
app.use("/users", AccessToken, user);
app.use("/units", AccessToken, UnitRoute);
app.use("/stores", AccessToken, StoreRoute);
app.use("/categories", AccessToken, CategoryRoute);
app.use("/brands", AccessToken, BrandRoute);
app.use("/purchases", AccessToken, PurchaseRoute);
app.use("/products", AccessToken, ProductRoute);
app.use("/suppliers", AccessToken, SupplierRoute);
app.use("/members", AccessToken, MemberRoute);
app.use("/payment-methods", AccessToken, AccountRoute);
app.use("/item-ins", AccessToken, ItemInRoute);
app.use("/stock-opnames", AccessToken, StockOpnameRoute);
app.use("/sales", AccessToken, SalesRoute);
app.use("/sale-pending", AccessToken, SalePendingRoute);
app.use("/reports", AccessToken, ReportRoute);
app.use("/dashboards", AccessToken, DashboardRoute);
app.use("/sales-people", AccessToken, SalesPeopleRoute);
app.use("/notifications", AccessToken, NotificationRoute);

// Accountancy Routes
app.use("/cashflows", AccessToken, CashflowRoute);
app.use("/expense-categories", AccessToken, ExpenseCategoryRoute);
app.use("/expenses", AccessToken, ExpenseRoute);
app.use("/transfers", AccessToken, TransferRoute);
app.use("/cash-ins", AccessToken, CashInRoute);
app.use("/cash-outs", AccessToken, CashOutRoute);

app.use("/admin", AdminRoute);

app.use("/images", express.static(path.join(__dirname, "/public")));

app.get("/enhance-store", enhanceStore);

app.listen(3001, () => console.log("server run ip 127.0.0.1:3001"));
