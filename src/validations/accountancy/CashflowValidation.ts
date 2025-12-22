import { body } from "express-validator";

const CashflowValidation = [
    body("kasId")
        .exists({ checkFalsy: true })
        .withMessage("Kas ID harus diisi")
        .isString()
        .withMessage("Kas ID harus berupa string"),
    body("type")
        .exists({ checkFalsy: true })
        .withMessage("Tipe harus diisi")
        .isIn(["IN", "OUT", "TRANSFER"])
        .withMessage("Tipe harus 'IN', 'OUT' atau 'TRANSFER'"),
    body("amount")
        .exists({ checkFalsy: true })
        .withMessage("Jumlah harus diisi")
        .isDecimal()
        .withMessage("Jumlah harus berupa angka"),
    body("toKasId")
        .if(body("type").equals("TRANSFER"))
        .exists({ checkFalsy: true })
        .withMessage("Kas Tujuan harus diisi untuk transfer")
        .isString()
        .withMessage("Kas Tujuan harus berupa string"),
    body("description")
        .optional()
        .isString()
        .withMessage("Deskripsi harus berupa string")
        .isLength({ max: 255 })
        .withMessage("Deskripsi maksimal 255 karakter"),
    body("referenceId")
        .optional()
        .isString()
        .withMessage("Reference ID harus berupa string"),
    body("referenceType")
        .optional()
        .isString()
        .withMessage("Reference Type harus berupa string"),
];

export default CashflowValidation;
