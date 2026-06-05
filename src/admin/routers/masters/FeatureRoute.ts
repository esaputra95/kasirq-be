import express from "express";
import {
    getData,
    postData,
    deleteData,
    getDataById,
    updateData,
} from "#root/admin/controllers/masters/FeatureController";
import validationMessage from "#root/validations/Validate";
import {
    FeatureUpdateValidation,
    FeatureValidation,
} from "#root/validations/masters/FeatureValidation";

const FeatureRoute = express.Router();

FeatureRoute.get("/", getData);
FeatureRoute.post("/", validationMessage(FeatureValidation), postData);
FeatureRoute.put("/:id", validationMessage(FeatureUpdateValidation), updateData);
FeatureRoute.delete("/:id", deleteData);
FeatureRoute.get("/:id", getDataById);

export default FeatureRoute;
