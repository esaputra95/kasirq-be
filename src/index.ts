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
    ProductRoute,
    SalesPeopleRoute,
    StoreRoute,
    SupplierRoute,
    UnitRoute,
    user,
} from "./mobile/routers/masters";
import { AccessToken } from "./mobile/controllers/auth/middlewareController";
import { PurchaseRoute } from "./mobile/routers/purrchases";
import { ItemInRoute } from "./mobile/routers/supplies";
import { SalePendingRoute, SalesRoute } from "./mobile/routers/sales";
import { ReportRoute } from "./mobile/routers/reports";
import DashboardRoute from "#root/mobile/routers/dashboards/DashboardRoute";
import AdminRoute from "./admin/routers";
import sendEmail from "./helpers/sendEmail";

const app = express();
app.use(cors());
app.use(bodyParser.json()); // Parse JSON requests
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/send-email", async (req, res) => {
    try {
        // Test kirim ke email lain untuk verify domain sudah bekerja
        await sendEmail(
            "sahabatngaji.official@gmail.com",
            "123456",
            "register"
        );
        res.send("Email sent successfully to sahabatngaji.official@gmail.com!");
    } catch (error) {
        res.status(500).send("Failed to send email: " + error);
    }
});
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
app.use("/sales", AccessToken, SalesRoute);
app.use("/sale-pending", AccessToken, SalePendingRoute);
app.use("/reports", AccessToken, ReportRoute);
app.use("/dashboards", AccessToken, DashboardRoute);
app.use("/sales-people", AccessToken, SalesPeopleRoute);

app.use("/admin", AdminRoute);

app.use("/images", express.static(path.join(__dirname, "/public")));

app.listen(3001, () => console.log("server run ip 127.0.0.1:3001"));
