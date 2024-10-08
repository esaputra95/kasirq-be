import express from "express";
import 'module-alias/register';
import 'dotenv/config'
import bodyParser from 'body-parser';
import path from 'path';
import cors from 'cors';

import login from './routers/auth/index'
import {
    AccountRoute,
    BrandRoute,
    CategoryRoute,
    MemberRoute,
    ProductRoute,
    StoreRoute,
    SupplierRoute,
    UnitRoute,
    user
} from "./routers/masters";
import { AccessToken } from "./controllers/auth/middlewareController";
import { PurchaseRoute } from "./routers/purrchases";
import { ItemInRoute } from "./routers/supplies";
import { SalesRoute } from "./routers/sales";
import { ReportPurchaseRoute, ReportSaleRoute } from "./routers/reports";
import DashboardRoute from '#routers/dashboards/DashboardRoute'

const app = express()
app.use(cors());
app.use(bodyParser.json()); // Parse JSON requests
app.use(bodyParser.urlencoded({ extended: true }))

app.use('/auth', login)
app.use('/users', AccessToken, user)
app.use('/units', AccessToken,  UnitRoute)
app.use('/stores', AccessToken, StoreRoute)
app.use('/categories', AccessToken, CategoryRoute)
app.use('/brands', AccessToken, BrandRoute)
app.use('/purchases', AccessToken, PurchaseRoute)
app.use('/products', AccessToken, ProductRoute)
app.use('/suppliers', AccessToken, SupplierRoute)
app.use('/members', AccessToken, MemberRoute)
app.use('/payment-methods', AccessToken, AccountRoute)
app.use('/item-ins', AccessToken, ItemInRoute)
app.use('/sales', AccessToken, SalesRoute)
app.use('/report/purchase-reports', AccessToken, ReportPurchaseRoute)
app.use('/report/sale-reports', AccessToken, ReportSaleRoute)
app.use('/dashboards', AccessToken, DashboardRoute);

app.use('/images', express.static(path.join(__dirname, '/public')))

app.listen(3001, ()=> console.log('server run ip 127.0.0.1:3001'))