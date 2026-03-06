import express from "express";
import {
    getData,
    postData,
    deleteData,
    getDataById,
    updateData,
    RegisterAffiliate,
} from "#root/admin/controllers/masters/UserManagementController";

const ProductRoute = express.Router();

ProductRoute.get("/", getData);
ProductRoute.post("/", postData);
ProductRoute.delete("/:id", deleteData);
ProductRoute.put("/:id", updateData);
ProductRoute.get("/:id", getDataById);
ProductRoute.post("/register-affiliate", RegisterAffiliate);

export default ProductRoute;
