import { body } from 'express-validator';

const SalesValidation = [
    body('subTotal')
    .isNumeric().withMessage('subTotal harus berupa angka')
    .notEmpty().withMessage('subTotal wajib diisi'),

    body('pay')
        .isNumeric().withMessage('pay harus berupa angka')
        .notEmpty().withMessage('pay wajib diisi'),

    body('storeId')
        // .isUUID().withMessage('storeId harus berupa UUID')
        .notEmpty().withMessage('storeId wajib diisi'),

    body('detailItem')
        .isObject().withMessage('detailItem harus berupa objek')
        .notEmpty().withMessage('detailItem wajib diisi'),

    body('detailItem.*.unitId')
        .isUUID().withMessage('unitId di setiap item harus UUID')
        .notEmpty().withMessage('unitId di setiap item wajib diisi'),

    body('detailItem.*.quantity')
        .isNumeric().withMessage('quantity di setiap item harus angka')
        .notEmpty().withMessage('quantity di setiap item wajib diisi'),

    body('detailItem.*.price')
        .isNumeric().withMessage('price di setiap item harus angka')
        .notEmpty().withMessage('price di setiap item wajib diisi'),
]

export default SalesValidation