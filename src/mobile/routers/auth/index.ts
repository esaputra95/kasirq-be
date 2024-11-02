import express from "express";
import {
    RequestCode,
    Login,
    RegisterOwner,
    Verification,
    VerificationCode,
    ForgotPassword
} from "#root/mobile/controllers/auth/AuthController"
const login = express.Router()

login.post('/login', Login);
login.post('/register', RegisterOwner);
login.post('/request-code', RequestCode);
login.post('/verification-code', VerificationCode);
login.post('/forgot-password', ForgotPassword);
login.get('/verification', Verification);

export default login