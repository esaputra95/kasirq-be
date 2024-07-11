import { body } from 'express-validator';

const SupplierValidation = [
    body("name").exists({ checkFalsy: true })
        .withMessage("User name is required")
        .isString()
        .withMessage("User name should be string"),
    body("storeId").exists({ checkFalsy: true })
        .withMessage("Store Id is required")
        .isString()
        .withMessage("Store Id should be string"),
]

export default SupplierValidation