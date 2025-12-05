import express from "express";
import {
    getData,
    getDataById,
    markAsRead,
} from "#root/mobile/controllers/masters/NotificationController";

const router = express.Router();

router.get("/", getData);
router.get("/:id", getDataById);
router.put("/mark-read/:id", markAsRead);

export default router;
