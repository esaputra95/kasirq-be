import express from "express";
import {
    getSelect,
    getData,
    postData,
    deleteData,
    getDataById,
    updateData,
} from "#root/admin/controllers/masters/ProductController";

const ProductRoute = express.Router()

ProductRoute.get('/', getData);
ProductRoute.post('/', postData);
ProductRoute.delete('/:id', deleteData);
ProductRoute.put('/:id', updateData);
ProductRoute.get('/select', getSelect);
ProductRoute.get('/:id', getDataById);

export default ProductRoute