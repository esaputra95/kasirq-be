import { body } from "express-validator";

const ExpenseValidation = [
    body("accountId")
        .exists({ checkFalsy: true })
        .withMessage("Kas Account ID harus diisi")
        .isString()
        .withMessage("Kas Account ID harus berupa string"),
    body("expenseCategoryId")
        .exists({ checkFalsy: true })
        .withMessage("Kategori pengeluaran harus diisi")
        .isString()
        .withMessage("Kategori pengeluaran ID harus berupa string"),
    body("amount")
        .exists({ checkFalsy: true })
        .withMessage("Jumlah harus diisi")
        .isDecimal()
        .withMessage("Jumlah harus berupa angka"),
    body("description")
        .optional()
        .isString()
        .withMessage("Deskripsi harus berupa string"),
    body("expenseDate")
        .exists({ checkFalsy: true })
        .withMessage("Tanggal pengeluaran harus diisi")
        .isISO8601()
        .withMessage("Tanggal pengeluaran harus format ISO8601"),
];

export default ExpenseValidation;
