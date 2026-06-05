import { body } from "express-validator";

const planCodePattern = /^[A-Z0-9_:-]+$/;

const SubscriptionPlanValidation = [
    body("code")
        .exists({ checkFalsy: true })
        .withMessage("code is required")
        .isString()
        .withMessage("code should be string")
        .matches(planCodePattern)
        .withMessage("code should only contain uppercase letters, numbers, _, :, or -"),
    body("name")
        .exists({ checkFalsy: true })
        .withMessage("name is required")
        .isString()
        .withMessage("name should be string"),
    body("description")
        .optional({ nullable: true })
        .isString()
        .withMessage("description should be string"),
    body("price")
        .optional({ nullable: true })
        .isDecimal()
        .withMessage("price should be decimal"),
    body("durationMonth")
        .optional({ nullable: true })
        .isInt({ min: 1 })
        .withMessage("durationMonth should be positive integer"),
    body("status")
        .optional()
        .isIn(["active", "inactive"])
        .withMessage("status should be active or inactive"),
    body("isPublic")
        .optional()
        .isBoolean()
        .withMessage("isPublic should be boolean"),
];

const SubscriptionPlanUpdateValidation = [
    body("code")
        .optional()
        .isString()
        .withMessage("code should be string")
        .matches(planCodePattern)
        .withMessage("code should only contain uppercase letters, numbers, _, :, or -"),
    body("name")
        .optional()
        .isString()
        .withMessage("name should be string"),
    body("description")
        .optional({ nullable: true })
        .isString()
        .withMessage("description should be string"),
    body("price")
        .optional({ nullable: true })
        .isDecimal()
        .withMessage("price should be decimal"),
    body("durationMonth")
        .optional({ nullable: true })
        .isInt({ min: 1 })
        .withMessage("durationMonth should be positive integer"),
    body("status")
        .optional()
        .isIn(["active", "inactive"])
        .withMessage("status should be active or inactive"),
    body("isPublic")
        .optional()
        .isBoolean()
        .withMessage("isPublic should be boolean"),
];

const SubscriptionPlanFeaturesValidation = [
    body("featureIds")
        .exists()
        .withMessage("featureIds is required")
        .isArray()
        .withMessage("featureIds should be array"),
    body("featureIds.*")
        .isString()
        .withMessage("featureIds item should be string"),
];

export {
    SubscriptionPlanValidation,
    SubscriptionPlanUpdateValidation,
    SubscriptionPlanFeaturesValidation,
};
