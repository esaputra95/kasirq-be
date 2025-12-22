import { body } from "express-validator";

const KasAccountValidation = [
    body("name")
        .exists({ checkFalsy: true })
        .withMessage("Nama kas harus diisi")
        .isString()
        .withMessage("Nama kas harus berupa string")
        .isLength({ max: 100 })
        .withMessage("Nama kas maksimal 100 karakter"),
    body("saldoAwal")
        .optional()
        .isDecimal()
        .withMessage("Saldo awal harus berupa angka"),
    body("isDefault")
        .optional()
        .isBoolean()
        .withMessage("isDefault harus berupa boolean"),
];

export default KasAccountValidation;
