import express from "express";
import { deleteData, getData, getDataById, postData, updateData, getSelect } from "#controllers/masters/AccountController"
import validationMessage from "#root/validations/Validate";
import AccountValidation from "#root/validations/masters/AccountValidation";
const login = express.Router()

login.get('/', getData);
login.post('/',  validationMessage(AccountValidation), postData);
login.put('/:id', updateData);
login.delete('/:id', deleteData);
login.get('/select', getSelect);
login.get('/:id', getDataById);

export default login