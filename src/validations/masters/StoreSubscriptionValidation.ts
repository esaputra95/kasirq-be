import { body } from "express-validator";

const StoreSubscriptionValidation = [
    body("storeId")
        .exists({ checkFalsy: true })
        .withMessage("storeId is required")
        .isString()
        .withMessage("storeId should be string"),
    body("type")
        .exists({ checkFalsy: true })
        .withMessage("type is required")
        .isIn(["TRIAL", "PAID"])
        .withMessage("type should be either TRIAL or PAID"),
    body("startDate")
        .exists({ checkFalsy: true })
        .withMessage("startDate is required")
        .isISO8601()
        .withMessage("startDate should be a valid date"),
    body("endDate")
        .exists({ checkFalsy: true })
        .withMessage("endDate is required")
        .isISO8601()
        .withMessage("endDate should be a valid date"),
    body("durationMonth")
        .exists({ checkFalsy: true })
        .withMessage("durationMonth is required")
        .isInt({ min: 1 })
        .withMessage("durationMonth should be a positive integer"),
    body("price")
        .exists()
        .withMessage("price is required")
        .isDecimal()
        .withMessage("price should be a decimal number"),
    body("status")
        .exists({ checkFalsy: true })
        .withMessage("status is required")
        .isIn(["ACTIVE", "EXPIRED", "CANCELLED"])
        .withMessage("status should be either ACTIVE, EXPIRED, or CANCELLED"),
    body("paymentRef")
        .optional()
        .isString()
        .withMessage("paymentRef should be string"),
];

const StoreSubscriptionUpdateValidation = [
    body("storeId")
        .optional()
        .isString()
        .withMessage("storeId should be string"),
    body("type")
        .optional()
        .isIn(["TRIAL", "PAID"])
        .withMessage("type should be either TRIAL or PAID"),
    body("startDate")
        .optional()
        .isISO8601()
        .withMessage("startDate should be a valid date"),
    body("endDate")
        .optional()
        .isISO8601()
        .withMessage("endDate should be a valid date"),
    body("durationMonth")
        .optional()
        .isInt({ min: 1 })
        .withMessage("durationMonth should be a positive integer"),
    body("price")
        .optional()
        .isDecimal()
        .withMessage("price should be a decimal number"),
    body("status")
        .optional()
        .isIn(["ACTIVE", "EXPIRED", "CANCELLED"])
        .withMessage("status should be either ACTIVE, EXPIRED, or CANCELLED"),
];

export { StoreSubscriptionValidation, StoreSubscriptionUpdateValidation };
