import express from "express";
import {
    deleteData,
    getData,
    getDataById,
    postData,
    updateData,
} from "#root/mobile/controllers/supplies/StockOpnameController";
import validationMessage from "#root/validations/Validate";
import {
    StockOpnameValidation,
    StockOpnameUpdateValidation,
} from "#root/validations/supplies/StockOpnameValidation";

const Route = express.Router();

Route.get("/", getData);
Route.post("/", validationMessage(StockOpnameValidation), postData);
Route.put("/:id", validationMessage(StockOpnameUpdateValidation), updateData);
Route.delete("/:id", deleteData);
Route.get("/:id", getDataById);

export default Route;
