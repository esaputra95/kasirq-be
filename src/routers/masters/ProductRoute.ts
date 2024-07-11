import express from "express";
import {
    deleteData,
    getData,
    getDataById,
    postData,
    updateData
} from "#controllers/masters/ProductController"
import validationMessage from "#root/validations/Validate";
import BrandValidation from "#root/validations/masters/BrandValidation";
const Brand = express.Router()

Brand.get('/', getData);
Brand.post('/',  postData);
Brand.put('/:id', updateData);
Brand.delete('/:id', deleteData);
Brand.get('/:id', getDataById);

export default Brand