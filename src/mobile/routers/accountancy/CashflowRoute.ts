import express from "express";
import {
    deleteData,
    getData,
    getDataById,
    postData,
    updateData,
} from "#root/mobile/controllers/accountancy/CashflowController";
import validationMessage from "#root/validations/Validate";
import CashflowValidation from "#root/validations/accountancy/CashflowValidation";

const router = express.Router();

router.get("/", getData);
router.post("/", validationMessage(CashflowValidation), postData);
router.put("/:id", validationMessage(CashflowValidation), updateData);
router.delete("/:id", deleteData);
router.get("/:id", getDataById);

export default router;
