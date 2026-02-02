import express from "express";
import {
    getData,
    postData,
    deleteData,
    getDataById,
    updateData,
    // migrateData,
} from "#root/admin/controllers/masters/StoreSubscriptionController";
import validationMessage from "#root/validations/Validate";
import {
    StoreSubscriptionValidation,
    StoreSubscriptionUpdateValidation,
} from "#root/validations/masters/StoreSubscriptionValidation";

const StoreSubscriptionRoute = express.Router();

StoreSubscriptionRoute.get("/", getData);
// StoreSubscriptionRoute.get("/migrate", migrateData);
StoreSubscriptionRoute.post(
    "/",
    validationMessage(StoreSubscriptionValidation),
    postData,
);
StoreSubscriptionRoute.put(
    "/:id",
    validationMessage(StoreSubscriptionUpdateValidation),
    updateData,
);
StoreSubscriptionRoute.delete("/:id", deleteData);
StoreSubscriptionRoute.get("/:id", getDataById);

export default StoreSubscriptionRoute;
