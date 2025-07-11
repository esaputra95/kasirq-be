import { body } from 'express-validator';

const SubscriptionStoreValidation = [
    body("startDate")
        .exists({ checkFalsy: true })
        .withMessage("startDate is required")
        .isString()
        .withMessage("start Date should be string"),
    body("endDate").exists({ checkFalsy: true })
        .withMessage("endDate is required")
        .isString()
        .withMessage("endDate should be string"),
    body("storeId").exists({checkFalsy: true})
        .withMessage("storeId is required")
        .isString()
        .withMessage('storeId should be string')
]


const SubscriptionStoreUpdateValidation = [
    body("startDate")
        .isString()
        .withMessage("start Date should be string"),
    body("endDate").exists({ checkFalsy: true })
        .withMessage("endDate should be string"),
    body("storeId").exists({checkFalsy: true})
        .isString()
        .withMessage('storeId should be string')
]

export { SubscriptionStoreValidation, SubscriptionStoreUpdateValidation }