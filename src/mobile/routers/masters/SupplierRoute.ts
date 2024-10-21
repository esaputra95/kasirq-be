import express from "express";
import {
    deleteData,
    getData,
    getDataById,
    postData,
    updateData,
    getSelect
} from "#root/mobile/controllers/masters/SupplierController"
import validationMessage from "#root/validations/Validate";
import SupplierValidation from "#root/validations/masters/SupplierValidation";
const login = express.Router()

login.get('/', getData);
login.post('/',  validationMessage(SupplierValidation), postData);
login.put('/:id', updateData);
login.delete('/:id', deleteData);
login.get('/select', getSelect);
login.get('/:id', getDataById);

export default login