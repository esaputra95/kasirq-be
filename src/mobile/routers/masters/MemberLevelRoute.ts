import express from "express";
import {
    deleteData,
    getData,
    getDataById,
    postData,
    updateData,
    getSelect,
} from "#root/mobile/controllers/masters/MemberLevelController";
import validationMessage from "#root/validations/Validate";
import MemberLevelValidation from "#root/validations/masters/MemberLevelValidation";
import { AccessToken } from "#root/mobile/controllers/auth/middlewareController";
const router = express.Router();

router.get("/", AccessToken, getData);
router.post(
    "/",
    AccessToken,
    validationMessage(MemberLevelValidation),
    postData,
);
router.put("/:id", AccessToken, updateData);
router.delete("/:id", AccessToken, deleteData);
router.get("/select", AccessToken, getSelect);
router.get("/:id", AccessToken, getDataById);

export default router;
