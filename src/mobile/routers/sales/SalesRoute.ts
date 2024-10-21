import express from "express";
import {
    deleteData,
    getData,
    getDataById,
    postData,
    updateData,
    getSelect,
    getFacture,
    getDataUpdate
} from "#root/mobile/controllers/sales/SalesController"

const Route = express.Router()

Route.get('/', getData);
Route.post('/', postData);
Route.put('/:id', updateData);
Route.delete('/:id', deleteData);
Route.get('/select', getSelect);
Route.get('/facture', getFacture);
Route.get('/get-update/:id', getDataUpdate);
Route.get('/:id', getDataById);

export default Route;
