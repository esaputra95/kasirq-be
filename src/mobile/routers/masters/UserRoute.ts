import express from "express";
import {
    deleteData,
    getData,
    getDataById,
    postData,
    updateData,
    changePassword,
    getDataCashiers,
} from "#root/mobile/controllers/masters/UserController";
import userDataValidateSchemaBased from "#root/validations/masters/UserValidation";
import validationMessage from "#root/validations/Validate";
const login = express.Router();

login.get("/", getData);
login.get("/cashiers", getDataCashiers);
login.post("/", validationMessage(userDataValidateSchemaBased), postData);
login.put("/change-password", changePassword);
login.put("/:id", updateData);
login.delete("/:id", deleteData);
login.get("/:id", getDataById);

export default login;
