import { body } from 'express-validator';

const MemberValidation = [
    body("name").exists({ checkFalsy: true })
        .withMessage("Name is required")
        .isString()
        .withMessage("Name should be string"),
    body("storeId").exists({ checkFalsy: true })
        .withMessage("Store is required")
        .isString()
        .withMessage("Store should be string"),
]

export default MemberValidation