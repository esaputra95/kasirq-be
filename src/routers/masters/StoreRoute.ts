import express from "express";
import { getSelect } from "#controllers/masters/StoreController"
const login = express.Router()

login.get('/select', getSelect);

export default login