import { Router } from "express";
import * as TransferController from "#root/mobile/controllers/accountancy/TransferController";
import validationMessage from "#root/validations/Validate";
import CashflowValidation from "#root/validations/accountancy/CashflowValidation";

const router = Router();

router.get("/", TransferController.getData);
router.post(
    "/",
    validationMessage(CashflowValidation),
    TransferController.postData
);
router.get("/:id", TransferController.getDataById);
router.put(
    "/:id",
    validationMessage(CashflowValidation),
    TransferController.updateData
);
router.delete("/:id", TransferController.deleteData);

export default router;
