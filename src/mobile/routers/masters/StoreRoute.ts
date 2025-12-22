import express from "express";
import {
    getSelect,
    updateData,
    getDataById,
} from "#root/mobile/controllers/masters/StoreController";
const router = express.Router();

router.get("/select", getSelect);
router.get("/:id", getDataById);
router.put("/:id", updateData);

export default router;
