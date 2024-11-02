import express from "express";
import { Login } from "#root/admin/controllers/auth/LoginController";

const AuthSalesRoute = express.Router()

AuthSalesRoute.post('/login', Login);

export default AuthSalesRoute