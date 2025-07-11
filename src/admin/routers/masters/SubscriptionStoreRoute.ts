import express from "express";
import {
    getData,
    postData,
    deleteData,
    getDataById,
    updateData,
} from "#root/admin/controllers/masters/SubscriptionStoreController";
import validationMessage from "#root/validations/Validate";
import {SubscriptionStoreValidation, SubscriptionStoreUpdateValidation} from "#root/validations/masters/SubscriptionStoreValidation";

const SubscriptionStoreRoute = express.Router()

SubscriptionStoreRoute.get('/', getData);
SubscriptionStoreRoute.post('/', validationMessage(SubscriptionStoreValidation), postData);
SubscriptionStoreRoute.delete('/:id', validationMessage(SubscriptionStoreUpdateValidation), deleteData);
SubscriptionStoreRoute.put('/:id', updateData);
SubscriptionStoreRoute.get('/:id', getDataById);

export default SubscriptionStoreRoute