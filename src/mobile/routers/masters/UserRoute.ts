import express from "express";
import {
    deleteData,
    getData,
    getDataById,
    postData,
    updateData,
    changePassword,
    getDataCashiers,
    postDeviceToken,
} from "#root/mobile/controllers/masters/UserController";
import userDataValidateSchemaBased from "#root/validations/masters/UserValidation";
import validationMessage from "#root/validations/Validate";
const router = express.Router();

router.get("/", getData);
router.get("/cashiers", getDataCashiers);
router.post("/device-tokens", postDeviceToken);
router.post("/", validationMessage(userDataValidateSchemaBased), postData);
router.put("/change-password", changePassword);
router.put("/:id", updateData);
router.delete("/:id", deleteData);
router.get("/:id", getDataById);

export default router;
