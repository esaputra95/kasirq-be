import { body } from "express-validator";

const featureKeyPattern = /^[a-z0-9_:-]+$/;

const FeatureValidation = [
    body("key")
        .exists({ checkFalsy: true })
        .withMessage("key is required")
        .isString()
        .withMessage("key should be string")
        .matches(featureKeyPattern)
        .withMessage("key should only contain lowercase letters, numbers, _, :, or -"),
    body("name")
        .exists({ checkFalsy: true })
        .withMessage("name is required")
        .isString()
        .withMessage("name should be string"),
    body("description")
        .optional({ nullable: true })
        .isString()
        .withMessage("description should be string"),
    body("group")
        .optional({ nullable: true })
        .isString()
        .withMessage("group should be string"),
    body("status")
        .optional()
        .isIn(["active", "inactive"])
        .withMessage("status should be active or inactive"),
];

const FeatureUpdateValidation = [
    body("key")
        .optional()
        .isString()
        .withMessage("key should be string")
        .matches(featureKeyPattern)
        .withMessage("key should only contain lowercase letters, numbers, _, :, or -"),
    body("name")
        .optional()
        .isString()
        .withMessage("name should be string"),
    body("description")
        .optional({ nullable: true })
        .isString()
        .withMessage("description should be string"),
    body("group")
        .optional({ nullable: true })
        .isString()
        .withMessage("group should be string"),
    body("status")
        .optional()
        .isIn(["active", "inactive"])
        .withMessage("status should be active or inactive"),
];

export { FeatureValidation, FeatureUpdateValidation };
