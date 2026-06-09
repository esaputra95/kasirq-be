import express from "express";
import {
    getData,
    postData,
    deleteData,
    getDataById,
    updateData,
    updateFeatures,
} from "#root/admin/controllers/masters/SubscriptionPlanController";
import validationMessage from "#root/validations/Validate";
import {
    SubscriptionPlanFeaturesValidation,
    SubscriptionPlanUpdateValidation,
    SubscriptionPlanValidation,
} from "#root/validations/masters/SubscriptionPlanValidation";

const SubscriptionPlanRoute = express.Router();

SubscriptionPlanRoute.get("/", getData);
SubscriptionPlanRoute.post(
    "/",
    validationMessage(SubscriptionPlanValidation),
    postData,
);
SubscriptionPlanRoute.put(
    "/:id/features",
    validationMessage(SubscriptionPlanFeaturesValidation),
    updateFeatures,
);
SubscriptionPlanRoute.put(
    "/:id",
    validationMessage(SubscriptionPlanUpdateValidation),
    updateData,
);
SubscriptionPlanRoute.delete("/:id", deleteData);
SubscriptionPlanRoute.get("/:id", getDataById);

export default SubscriptionPlanRoute;
