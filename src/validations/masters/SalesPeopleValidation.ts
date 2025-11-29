import { body } from "express-validator";

const SalesPeopleValidation = [
    body("name")
        .exists({ checkFalsy: true })
        .withMessage("Sales people name is required")
        .isString()
        .withMessage("Sales people name should be string"),
    body("storeId")
        .exists({ checkFalsy: true })
        .withMessage("Store Id is required")
        .isString()
        .withMessage("Store Id should be string"),
];

export default SalesPeopleValidation;
