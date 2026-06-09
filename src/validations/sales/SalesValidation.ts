import { body } from "express-validator";

const SalesValidation = [
    body("subTotal")
        .isNumeric()
        .withMessage("subTotal harus berupa angka")
        .notEmpty()
        .withMessage("subTotal wajib diisi"),

    body("pay")
        .isNumeric()
        .withMessage("pay harus berupa angka")
        .notEmpty()
        .withMessage("pay wajib diisi"),

    body("tax")
        .optional()
        .isNumeric()
        .withMessage("tax harus berupa angka"),

    body("taxBase")
        .optional()
        .isNumeric()
        .withMessage("taxBase harus berupa angka"),

    body("taxRate")
        .optional()
        .isNumeric()
        .withMessage("taxRate harus berupa angka"),

    body("taxType")
        .optional()
        .isIn(["include", "exclude"])
        .withMessage("taxType harus include atau exclude"),

    body("taxLabel")
        .optional()
        .isString()
        .withMessage("taxLabel harus berupa teks"),

    body("taxDetails")
        .optional()
        .isObject()
        .withMessage("taxDetails harus berupa objek"),

    body("payments")
        .optional()
        .isArray()
        .withMessage("payments harus berupa array"),

    body("payments.*.accountId")
        .optional()
        .isUUID()
        .withMessage("accountId di setiap pembayaran harus UUID"),

    body("payments.*.amount")
        .optional()
        .isNumeric()
        .withMessage("amount di setiap pembayaran harus angka"),

    body("detailItem")
        .isObject()
        .withMessage("detailItem harus berupa objek")
        .notEmpty()
        .withMessage("detailItem wajib diisi"),

    body("detailItem.*.unitId")
        .isUUID()
        .withMessage("unitId di setiap item harus UUID")
        .notEmpty()
        .withMessage("unitId di setiap item wajib diisi"),

    body("detailItem.*.quantity")
        .isNumeric()
        .withMessage("quantity di setiap item harus angka")
        .notEmpty()
        .withMessage("quantity di setiap item wajib diisi"),

    body("detailItem.*.price")
        .isNumeric()
        .withMessage("price di setiap item harus angka")
        .notEmpty()
        .withMessage("price di setiap item wajib diisi"),

    body("detailItem.*.grossTotal")
        .optional()
        .isNumeric()
        .withMessage("grossTotal di setiap item harus angka"),

    body("detailItem.*.netTotal")
        .optional()
        .isNumeric()
        .withMessage("netTotal di setiap item harus angka"),

    body("detailItem.*.taxBase")
        .optional()
        .isNumeric()
        .withMessage("taxBase di setiap item harus angka"),

    body("detailItem.*.tax")
        .optional()
        .isNumeric()
        .withMessage("tax di setiap item harus angka"),

    body("detailItem.*.taxRate")
        .optional()
        .isNumeric()
        .withMessage("taxRate di setiap item harus angka"),

    body("detailItem.*.taxType")
        .optional()
        .isIn(["include", "exclude"])
        .withMessage("taxType di setiap item harus include atau exclude"),

    body("detailItem.*.taxLabel")
        .optional()
        .isString()
        .withMessage("taxLabel di setiap item harus berupa teks"),

    body("detailItem.*.isTaxable")
        .optional()
        .isBoolean()
        .withMessage("isTaxable di setiap item harus boolean"),

    body("detailItem.*.discountAllocation")
        .optional()
        .isNumeric()
        .withMessage("discountAllocation di setiap item harus angka"),
];

export default SalesValidation;
