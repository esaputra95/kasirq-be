import { Router } from "express";
import * as CashOutController from "#root/mobile/controllers/accountancy/CashOutController";
import validationMessage from "#root/validations/Validate";
import CashflowValidation from "#root/validations/accountancy/CashflowValidation";

const router = Router();

router.get("/", CashOutController.getData);
router.post(
    "/",
    validationMessage(CashflowValidation),
    CashOutController.postData
);
router.get("/:id", CashOutController.getDataById);
router.put(
    "/:id",
    validationMessage(CashflowValidation),
    CashOutController.updateData
);
router.delete("/:id", CashOutController.deleteData);

export default router;
