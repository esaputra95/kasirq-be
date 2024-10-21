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
} from "#root/mobile/controllers/purchases/PurchaseController"
const Purchase = express.Router()

Purchase.get('/', getData);
Purchase.post('/', postData);
Purchase.put('/:id', updateData);
Purchase.delete('/:id', deleteData);
Purchase.get('/select', getSelect);
Purchase.get('/facture', getFacture);
Purchase.get('/get-update/:id', getDataUpdate);
Purchase.get('/:id', getDataById);

export default Purchase