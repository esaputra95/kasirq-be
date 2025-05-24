import express from "express";
import {
    getData,
    postData,
    deleteData,
    getDataById,
    updateData,
} from "#root/admin/controllers/masters/UserManagementController";

const ProductRoute = express.Router()

ProductRoute.get('/', getData);
ProductRoute.post('/', postData);
ProductRoute.delete('/:id', deleteData);
ProductRoute.put('/:id', updateData);
ProductRoute.get('/:id', getDataById);

export default ProductRoute