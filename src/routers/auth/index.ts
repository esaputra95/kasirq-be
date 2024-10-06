import express from "express";
import { Login, RegisterOwner, Verification } from "#controllers/auth/AuthController"
const login = express.Router()

login.post('/login', Login);
login.post('/register', RegisterOwner);
login.get('/verification', Verification);

export default login