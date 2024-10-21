import express from "express";
import { Login, RegisterOwner, Verification } from "#root/mobile/controllers/auth/AuthController"
const login = express.Router()

login.post('/login', Login);
login.post('/register', RegisterOwner);
login.get('/verification', Verification);

export default login