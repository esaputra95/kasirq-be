import express from "express";
import {
    deleteData,
    getData,
    getDataById,
    postData,
    updateData,
} from "#root/mobile/controllers/accountancy/ExpenseController";
import validationMessage from "#root/validations/Validate";
import ExpenseValidation from "#root/validations/accountancy/ExpenseValidation";

const router = express.Router();

router.get("/", getData);
router.post("/", validationMessage(ExpenseValidation), postData);
router.put("/:id", updateData);
router.delete("/:id", deleteData);
router.get("/:id", getDataById);

export default router;
