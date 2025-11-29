import express from "express";
import {
    deleteData,
    getData,
    getDataById,
    postData,
    updateData,
    getSelect,
} from "#root/mobile/controllers/masters/SalesPeopleController";
import validationMessage from "#root/validations/Validate";
import SalesPeopleValidation from "#root/validations/masters/SalesPeopleValidation";
const salesPeople = express.Router();

salesPeople.get("/", getData);
salesPeople.post("/", validationMessage(SalesPeopleValidation), postData);
salesPeople.put("/:id", updateData);
salesPeople.delete("/:id", deleteData);
salesPeople.get("/select", getSelect);
salesPeople.get("/:id", getDataById);

export default salesPeople;
