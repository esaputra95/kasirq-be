import express from "express";
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
    user as UserRoute,
    StoreMaintenanceRoute,
} from "./masters";
import { SalePendingRoute, SalesRoute } from "./sales";

const StoresRoute = express.Router();

StoresRoute.use("/users", UserRoute);
StoresRoute.use("/units", UnitRoute);
StoresRoute.use("/stores", StoreRoute);
StoresRoute.use("/categories", CategoryRoute);
StoresRoute.use("/brands", BrandRoute);
StoresRoute.use("/products", ProductRoute);
StoresRoute.use("/suppliers", SupplierRoute);
StoresRoute.use("/members", MemberRoute);
StoresRoute.use("/payment-methods", AccountRoute);
StoresRoute.use("/sales", SalesRoute);
StoresRoute.use("/sale-pending", SalePendingRoute);
StoresRoute.use("/sales-people", SalesPeopleRoute);
StoresRoute.use("/notifications", NotificationRoute);
StoresRoute.use("/store-maintenance", StoreMaintenanceRoute);

export default StoresRoute;
