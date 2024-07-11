import express from "express";
import {
    deleteData,
    getData,
    getDataById,
    postData,
    updateData,
    getSelect
} from "#controllers/masters/BrandController"
import validationMessage from "#root/validations/Validate";
import BrandValidation from "#root/validations/masters/BrandValidation";
const Brand = express.Router()

Brand.get('/', getData);
Brand.post('/',  validationMessage(BrandValidation), postData);
Brand.put('/:id', updateData);
Brand.delete('/:id', deleteData);
Brand.get('/select', getSelect);
Brand.get('/:id', getDataById);

export default Brand