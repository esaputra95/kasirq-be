import express from "express";
import ReportSalesRoute from "#root/admin/routers/report"
import { AuthRoute } from "#root/admin/routers/auth";
import {
    StoreRoute,
    MemberRoute,
    ProductCategoryRoute,
    ProductRoute,
    UserRoute,
    AccountRoute
} from "#root/admin/routers/masters";
import { AccessToken } from "#root/mobile/controllers/auth/middlewareController";
import DashboardsRoute from "./dashboards";
const AdminRoute = express.Router()

AdminRoute.use('/auth', AuthRoute);
AdminRoute.use('/reports', AccessToken, ReportSalesRoute);
AdminRoute.use('/stores', AccessToken, StoreRoute);
AdminRoute.use('/members', AccessToken, MemberRoute);
AdminRoute.use('/products', AccessToken, ProductRoute);
AdminRoute.use('/product-categories', AccessToken, ProductCategoryRoute);
AdminRoute.use('/users', AccessToken, UserRoute);
AdminRoute.use('/bank-accounts', AccessToken, AccountRoute);
AdminRoute.use('/dashboards', AccessToken, DashboardsRoute);

export default AdminRoute;