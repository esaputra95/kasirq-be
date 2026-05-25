import express from "express";
import {
    deleteData,
    getData,
    getDataById,
    postData,
    updateData,
    updateNewData,
    getSelect,
    getFacture,
    getDataUpdate,
} from "#root/mobile/controllers/sales/SalePendingController";
import validationMessage from "#root/validations/Validate";
import SalesValidation from "#root/validations/sales/SalesValidation";
import {
    createPendingSplitBills,
    getPendingSplitBills,
    getSplitBillFacture,
    deletePendingSplitBill,
    payPendingSplitBill,
} from "#root/mobile/controllers/sales/SalesController";

const Route = express.Router();

Route.get("/", getData);
Route.post("/", validationMessage(SalesValidation), postData);
Route.put("/:id", updateData);
Route.put("/update-new/:id", updateNewData);
Route.delete("/:id", deleteData);
Route.get("/select", getSelect);
Route.get("/facture", getFacture);
Route.get("/get-update/:id", getDataUpdate);
Route.post("/:id/split-bills", createPendingSplitBills);
Route.get("/:id/split-bills", getPendingSplitBills);
Route.get("/:id/split-bills/:splitBillId/facture", getSplitBillFacture);
Route.delete("/:id/split-bills/:splitBillId", deletePendingSplitBill);
Route.post("/:id/split-bills/:splitBillId/pay", payPendingSplitBill);
Route.get("/:id", getDataById);

export default Route;
