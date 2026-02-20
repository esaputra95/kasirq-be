import express from "express";
import {
    getSelect,
    updateData,
    getDataById,
    getSelectSubscription,
    getStoreBySlug,
} from "#root/stores/controllers/masters/StoreController";
const router = express.Router();

router.get("/select", getSelect);
router.get("/select-subscription", getSelectSubscription);
router.get("/details/:slug", getStoreBySlug);
router.get("/:id", getDataById);
router.put("/:id", updateData);

export default router;
