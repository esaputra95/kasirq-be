import express from "express";
import {
    getSelect,
    updateData,
    getDataById,
    getSelectSubscription,
} from "#root/mobile/controllers/masters/StoreController";
const router = express.Router();

router.get("/select", getSelect);
router.get("/select-subscription", getSelectSubscription);
router.get("/:id", getDataById);
router.put("/:id", updateData);

export default router;
