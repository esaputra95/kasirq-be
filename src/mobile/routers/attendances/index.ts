import express from "express";
import {
    getTodayStatus,
    checkIn,
    checkOut,
    getHistory,
    getData,
} from "../../controllers/attendances/AttendanceController";

const router = express.Router();

router.get("/", getData);
router.get("/status", getTodayStatus);
router.post("/check-in", checkIn);
router.post("/check-out", checkOut);
router.get("/history", getHistory);

export { router as AttendanceRoute };
