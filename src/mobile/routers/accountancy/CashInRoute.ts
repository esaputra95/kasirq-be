import { Router } from "express";
import * as CashInController from "#root/mobile/controllers/accountancy/CashInController";
import validationMessage from "#root/validations/Validate";
import CashflowValidation from "#root/validations/accountancy/CashflowValidation";

const router = Router();

router.get("/", CashInController.getData);
router.post(
    "/",
    validationMessage(CashflowValidation),
    CashInController.postData
);
router.get("/:id", CashInController.getDataById);
router.put(
    "/:id",
    validationMessage(CashflowValidation),
    CashInController.updateData
);
router.delete("/:id", CashInController.deleteData);

export default router;
