import { body } from "express-validator";

const StockOpnameValidation = [
    body("date")
        .exists({ checkFalsy: true })
        .withMessage("Date is required")
        .isISO8601()
        .withMessage("Date must be a valid ISO8601 date"),

    body("storeId")
        .exists({ checkFalsy: true })
        .withMessage("Store ID is required")
        .isString()
        .withMessage("Store ID must be a string"),

    body("description")
        .optional()
        .isString()
        .withMessage("Description must be a string"),

    body("details")
        .exists({ checkFalsy: true })
        .withMessage("Details are required")
        .isArray({ min: 1 })
        .withMessage("Details must be a non-empty array"),

    body("details.*.productId")
        .exists({ checkFalsy: true })
        .withMessage("Product ID is required for each detail")
        .isString()
        .withMessage("Product ID must be a string"),

    body("details.*.actualQuantity")
        .exists({ checkFalsy: true })
        .withMessage("Actual quantity is required for each detail")
        .isNumeric()
        .withMessage("Actual quantity must be a number"),

    body("details.*.productConversionId")
        .optional()
        .isString()
        .withMessage("Product Conversion ID must be a string"),

    body("details.*.description")
        .optional()
        .isString()
        .withMessage("Detail description must be a string"),
];

const StockOpnameUpdateValidation = [
    body("date")
        .optional()
        .isISO8601()
        .withMessage("Date must be a valid ISO8601 date"),

    body("storeId")
        .optional()
        .isString()
        .withMessage("Store ID must be a string"),

    body("description")
        .optional()
        .isString()
        .withMessage("Description must be a string"),

    body("status")
        .optional()
        .isIn(["pending", "completed", "canceled"])
        .withMessage("Status must be pending, completed, or canceled"),

    body("details")
        .optional()
        .isArray()
        .withMessage("Details must be an array"),

    body("details.*.productId")
        .optional()
        .isString()
        .withMessage("Product ID must be a string"),

    body("details.*.actualQuantity")
        .optional()
        .isNumeric()
        .withMessage("Actual quantity must be a number"),
];

export { StockOpnameValidation, StockOpnameUpdateValidation };
