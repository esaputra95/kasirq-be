import express from "express";
import {
    getSelect,
    updateData,
    getDataById,
    getSelectSubscription,
    uploadReceiptLogo,
} from "#root/mobile/controllers/masters/StoreController";
import { getStoreEntitlements } from "#root/mobile/controllers/entitlements/FeatureEntitlementController";
import { LogoUpload } from "#root/helpers/uploadReceiptLogo";
import multer from "multer";
const router = express.Router();

router.get("/select", getSelect);
router.get("/select-subscription", getSelectSubscription);
router.get("/:storeId/entitlements", getStoreEntitlements);
router.post("/upload-logo", (req, res, next) => {
    LogoUpload.single("logo")(req, res, function (err) {
        if (err) {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ error: err.message });
            } else if (err instanceof Error) {
                return res.status(400).json({ error: err.message });
            }
        }
        uploadReceiptLogo(req, res);
    });
});
router.get("/:id", getDataById);
router.put("/:id", updateData);

export default router;
