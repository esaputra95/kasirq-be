import { Router } from "express";
import * as StoreMaintenanceController from "#root/mobile/controllers/masters/StoreMaintenanceController";

const router = Router();

/**
 * @route POST /reset
 * @desc Reset store transaction data and stocks
 * @access Private
 */
router.post("/reset", StoreMaintenanceController.resetStoreData);
router.post("/reset-stock", StoreMaintenanceController.resetStock);

export default router;
