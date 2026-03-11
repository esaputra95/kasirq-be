import { body } from "express-validator";

const MemberLevelValidation = [
    body("name")
        .exists({ checkFalsy: true })
        .withMessage("Name is required")
        .isString()
        .withMessage("Name should be string"),
    body("level")
        .exists({ checkFalsy: true })
        .withMessage("Level is required")
        .isInt()
        .withMessage("Level should be integer"),
];

export default MemberLevelValidation;
