import express from "express";
import {
    getSelect,
    getData,
    postData,
    deleteData,
    getDataById,
    updateData,
} from "#root/admin/controllers/masters/MemberController";

const AuthSalesRoute = express.Router()

AuthSalesRoute.get('/', getData);
AuthSalesRoute.post('/', postData);
AuthSalesRoute.delete('/:id', deleteData);
AuthSalesRoute.put('/:id', updateData);
AuthSalesRoute.get('/select', getSelect);
AuthSalesRoute.get('/:id', getDataById);

export default AuthSalesRoute