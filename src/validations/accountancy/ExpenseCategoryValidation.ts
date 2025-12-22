import { body } from "express-validator";

const ExpenseCategoryValidation = [
    body("name")
        .exists({ checkFalsy: true })
        .withMessage("Nama kategori harus diisi")
        .isString()
        .withMessage("Nama kategori harus berupa string")
        .isLength({ max: 100 })
        .withMessage("Nama kategori maksimal 100 karakter"),
    body("desc")
        .optional()
        .isString()
        .withMessage("Deskripsi harus berupa string"),
];

export default ExpenseCategoryValidation;
