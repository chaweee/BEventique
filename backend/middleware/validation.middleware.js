/**
 * Validation Middleware
 * Request validation using express-validator
 */

const { body, param, query, validationResult } = require('express-validator');
const { errorResponse } = require('../utils/response.util');

/**
 * Validate request and return errors if any
 */
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = {};
    errors.array().forEach(error => {
      if (!formattedErrors[error.path]) {
        formattedErrors[error.path] = [];
      }
      formattedErrors[error.path].push(error.msg);
    });

    return errorResponse(res, 'Validation failed', 400, formattedErrors);
  }
  
  next();
};

/**
 * User registration validation rules
 */
exports.registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  
  body('firstname')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name must not exceed 50 characters'),
  
  body('lastname')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name must not exceed 50 characters'),
  
  body('role')
    .optional()
    .isIn(['customer', 'designer', 'admin'])
    .withMessage('Invalid role'),
];

/**
 * Login validation rules
 */
exports.loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

/**
 * User update validation rules
 */
exports.updateUserValidation = [
  param('id')
    .isInt()
    .withMessage('Valid user ID is required'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  
  body('firstname')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('First name must not exceed 50 characters'),
  
  body('lastname')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Last name must not exceed 50 characters'),
];

/**
 * ID parameter validation
 */
exports.idValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid ID is required'),
];

/**
 * Pagination validation
 */
exports.paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];
