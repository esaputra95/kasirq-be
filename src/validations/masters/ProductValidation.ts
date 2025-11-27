import { body } from "express-validator";

const ProductValidation = [
    // Basic product info
    body("name")
        .exists({ checkFalsy: true })
        .withMessage("Product name is required")
        .isString()
        .withMessage("Product name should be string")
        .isLength({ min: 2, max: 255 })
        .withMessage("Product name should be between 2 and 255 characters"),

    body("categoryId")
        .exists({ checkFalsy: true })
        .withMessage("Category ID is required")
        .isString()
        .withMessage("Category ID should be string"),

    body("storeId")
        .exists({ checkFalsy: true })
        .withMessage("Store ID is required")
        .isString()
        .withMessage("Store ID should be string"),

    // Optional fields
    body("code")
        .optional()
        .isString()
        .withMessage("Product code should be string"),

    body("barcode")
        .optional()
        .isString()
        .withMessage("Barcode should be string"),

    body("sku").optional().isString().withMessage("SKU should be string"),

    body("brandId")
        .optional()
        .isString()
        .withMessage("Brand ID should be string"),

    body("description")
        .optional()
        .isString()
        .withMessage("Description should be string"),

    body("image").optional().isString().withMessage("Image should be string"),

    body("isStock")
        .optional()
        .isBoolean()
        .withMessage("isStock should be boolean"),

    // Price/conversion validation (CRITICAL for security)
    body("price")
        .exists({ checkFalsy: true })
        .withMessage("Price data is required")
        .isArray({ min: 1 })
        .withMessage("Price should be an array with at least one conversion"),

    body("price.*.unitId")
        .exists({ checkFalsy: true })
        .withMessage("Unit ID is required for each conversion")
        .isString()
        .withMessage("Unit ID should be string"),

    body("price.*.quantity")
        .exists({ checkFalsy: true })
        .withMessage("Quantity is required for each conversion")
        .isNumeric()
        .withMessage("Quantity should be numeric")
        .custom((value) => value > 0)
        .withMessage("Quantity must be greater than 0"),

    body("price.*.sell")
        .exists({ checkFalsy: true })
        .withMessage("Sell price is required")
        .isNumeric()
        .withMessage("Sell price should be numeric")
        .custom((value) => value >= 0)
        .withMessage("Sell price must be non-negative"),
];

const ProductUpdateValidation = [
    // ID is required for update
    body("id")
        .exists({ checkFalsy: true })
        .withMessage("Product ID is required")
        .isString()
        .withMessage("Product ID should be string"),

    // Basic product info
    body("name")
        .exists({ checkFalsy: true })
        .withMessage("Product name is required")
        .isString()
        .withMessage("Product name should be string")
        .isLength({ min: 2, max: 255 })
        .withMessage("Product name should be between 2 and 255 characters"),

    body("categoryId")
        .exists({ checkFalsy: true })
        .withMessage("Category ID is required")
        .isString()
        .withMessage("Category ID should be string"),

    body("storeId")
        .exists({ checkFalsy: true })
        .withMessage("Store ID is required")
        .isString()
        .withMessage("Store ID should be string"),

    // Optional fields
    body("code")
        .optional()
        .isString()
        .withMessage("Product code should be string"),

    body("barcode")
        .optional()
        .isString()
        .withMessage("Barcode should be string"),

    body("sku").optional().isString().withMessage("SKU should be string"),

    body("brandId")
        .optional()
        .isString()
        .withMessage("Brand ID should be string"),

    body("description")
        .optional()
        .isString()
        .withMessage("Description should be string"),

    body("image").optional().isString().withMessage("Image should be string"),

    body("isStock")
        .optional()
        .isBoolean()
        .withMessage("isStock should be boolean"),

    // Price validation
    body("price")
        .exists({ checkFalsy: true })
        .withMessage("Price data is required")
        .isArray({ min: 1 })
        .withMessage("Price should be an array with at least one conversion"),

    body("price.*.unitId")
        .exists({ checkFalsy: true })
        .withMessage("Unit ID is required for each conversion")
        .isString()
        .withMessage("Unit ID should be string"),

    body("price.*.quantity")
        .exists({ checkFalsy: true })
        .withMessage("Quantity is required for each conversion")
        .isNumeric()
        .withMessage("Quantity should be numeric")
        .custom((value) => value > 0)
        .withMessage("Quantity must be greater than 0"),

    body("price.*.capital")
        .exists({ checkFalsy: true })
        .withMessage("Capital price is required")
        .isNumeric()
        .withMessage("Capital price should be numeric")
        .custom((value) => value >= 0)
        .withMessage("Capital price must be non-negative"),

    body("price.*.sell")
        .exists({ checkFalsy: true })
        .withMessage("Sell price is required")
        .isNumeric()
        .withMessage("Sell price should be numeric")
        .custom((value) => value >= 0)
        .withMessage("Sell price must be non-negative"),

    body("price.*.type")
        .optional()
        .isString()
        .withMessage("Type should be string")
        .isIn(["default", "custom"])
        .withMessage("Type should be 'default' or 'custom'"),

    body("price.*.level")
        .optional()
        .isNumeric()
        .withMessage("Level should be numeric")
        .custom((value) => value >= 1)
        .withMessage("Level must be at least 1"),

    // idDelete validation (for update - IDs to delete)
    body("idDelete")
        .optional()
        .isArray()
        .withMessage("idDelete should be an array"),

    body("idDelete.*")
        .optional()
        .isString()
        .withMessage("Each ID in idDelete should be string"),
];

export { ProductValidation, ProductUpdateValidation };
export default ProductValidation;
