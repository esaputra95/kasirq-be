import express from "express";
import {
    getSelect,
    getData,
    getDataById,
    postData,
    deleteData,
    updateData
} from "#root/admin/controllers/masters/StoreController";

const StoreRoute = express.Router()

StoreRoute.get('/', getData);
StoreRoute.post('/', postData);
StoreRoute.put('/:id', updateData);
StoreRoute.delete('/:id', deleteData);
StoreRoute.get('/select', getSelect);
StoreRoute.get('/:id', getDataById);

export default StoreRoute