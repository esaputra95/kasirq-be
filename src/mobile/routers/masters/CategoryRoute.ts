import express from "express";
import {
    deleteData,
    getData,
    getDataById,
    postData,
    updateData,
    getSelect
} from "#root/mobile/controllers/masters/CategoryController"
import validationMessage from "#root/validations/Validate";
import CategoryValidation from "#root/validations/masters/CategoryValidation";
const login = express.Router()

login.get('/', getData);
login.post('/',  validationMessage(CategoryValidation), postData);
login.put('/:id', updateData);
login.delete('/:id', deleteData);
login.get('/select', getSelect);
login.get('/:id', getDataById);

export default login