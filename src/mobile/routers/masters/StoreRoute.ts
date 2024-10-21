import express from "express";
import { getSelect } from "#root/mobile/controllers/masters/StoreController"
const login = express.Router()

login.get('/select', getSelect);

export default login