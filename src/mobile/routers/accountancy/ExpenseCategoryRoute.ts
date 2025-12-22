import express from "express";
import {
    deleteData,
    getData,
    getDataById,
    postData,
    updateData,
    getSelect,
} from "#root/mobile/controllers/accountancy/ExpenseCategoryController";
import validationMessage from "#root/validations/Validate";
import ExpenseCategoryValidation from "#root/validations/accountancy/ExpenseCategoryValidation";

const router = express.Router();

router.get("/", getData);
router.post("/", validationMessage(ExpenseCategoryValidation), postData);
router.put("/:id", updateData);
router.delete("/:id", deleteData);
router.get("/select", getSelect);
router.get("/:id", getDataById);

export default router;
