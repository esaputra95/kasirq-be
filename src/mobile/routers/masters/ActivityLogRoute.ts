import express from "express";
import { getData } from "#root/mobile/controllers/masters/ActivityLogController";

const router = express.Router();

router.get("/", getData);

export default router;
