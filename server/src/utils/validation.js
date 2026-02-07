const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation middleware
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

/**
 * User registration validation rules
 */
const registerRules = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters')
];

/**
 * Login validation rules
 */
const loginRules = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

/**
 * ECG analysis validation rules
 */
const ecgAnalysisRules = [
    body('leadCount')
        .optional()
        .isInt({ min: 1, max: 12 })
        .withMessage('Lead count must be between 1 and 12')
];

/**
 * History query validation
 */
const historyQueryRules = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
];

/**
 * Record ID validation
 */
const recordIdRules = [
    param('id')
        .isMongoId()
        .withMessage('Invalid record ID')
];

module.exports = {
    validate,
    registerRules,
    loginRules,
    ecgAnalysisRules,
    historyQueryRules,
    recordIdRules
};
