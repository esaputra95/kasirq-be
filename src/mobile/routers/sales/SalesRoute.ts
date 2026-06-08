import express from "express";
import {
    deleteData,
    getData,
    getDataById,
    postData,
    updateData,
    getSelect,
    getFacture,
    getSplitBillFacture,
    getDataUpdate,
    createSplitBills,
    getSplitBills,
    updateSplitBill,
    deleteSplitBill,
    paySplitBill,
} from "#root/mobile/controllers/sales/SalesController"
import validationMessage from "#root/validations/Validate";
import SalesValidation from "#root/validations/sales/SalesValidation";

const Route = express.Router()

Route.get('/', getData);
Route.post('/', validationMessage(SalesValidation), postData);
Route.put('/:id', updateData);
Route.delete('/:id', deleteData);
Route.get('/select', getSelect);
Route.get('/facture', getFacture);
Route.get('/get-update/:id', getDataUpdate);
Route.post('/:id/split-bills', createSplitBills);
Route.get('/:id/split-bills', getSplitBills);
Route.get('/:id/split-bills/:splitBillId/facture', getSplitBillFacture);
Route.put('/:id/split-bills/:splitBillId', updateSplitBill);
Route.delete('/:id/split-bills/:splitBillId', deleteSplitBill);
Route.post('/:id/split-bills/:splitBillId/pay', paySplitBill);
Route.get('/:id', getDataById);

export default Route;
