import express from "express";
import { deleteData, getData, getDataById, postData, updateData, getSelect } from "#controllers/masters/UnitController"
import validationMessage from "#root/validations/Validate";
import UnitValidation from "#root/validations/masters/UnitValidation";
const login = express.Router()

login.get('/', getData);
login.post('/',  validationMessage(UnitValidation), postData);
login.put('/:id', updateData);
login.delete('/:id', deleteData);
login.get('/select', getSelect);
login.get('/:id', getDataById);

export default login