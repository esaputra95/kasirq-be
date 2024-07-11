import express from "express";
import {
    deleteData,
    getData,
    getDataById,
    postData,
    updateData,
    getSelect
} from "#controllers/masters/MemberController"
import validationMessage from "#root/validations/Validate";
import MemberValidation from "#root/validations/masters/MemberValidation";
const login = express.Router()

login.get('/', getData);
login.post('/',  validationMessage(MemberValidation), postData);
login.put('/:id', updateData);
login.delete('/:id', deleteData);
login.get('/select', getSelect);
login.get('/:id', getDataById);

export default login