import express from "express";
import { deleteData, getData, getDataById, postData, updateData, getSelect, uploadImage } from "#root/mobile/controllers/masters/AccountController"
import validationMessage from "#root/validations/Validate";
import AccountValidation from "#root/validations/masters/AccountValidation";
import { ImageUpload } from "#root/helpers/uploadImage";
const Route = express.Router()

Route.get('/', getData);
Route.post('/',  validationMessage(AccountValidation), postData);
Route.post('/image', ImageUpload.single('images'), uploadImage);
Route.put('/:id', updateData);
Route.delete('/:id', deleteData);
Route.get('/select', getSelect);
Route.get('/:id', getDataById);

export default Route