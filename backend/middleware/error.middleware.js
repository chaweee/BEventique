/**
 * Error Handler Middleware
 * Centralized error handling for the application
 */

const logger = require('../utils/logger');
const config = require('../config/env.config');

/**
 * Not Found Handler - 404 errors
 */
exports.notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Global Error Handler
 * Catches all errors thrown in routes and middleware
 */
exports.errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user?.id || 'anonymous'
  });

  res.status(statusCode).json({
    status: 'error',
    message: err.message,
    ...(config.NODE_ENV === 'development' && { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
};

/**
 * Async Error Wrapper
 * Wraps async route handlers to catch errors
 */
exports.asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Validation Error Handler
 * Formats validation errors from express-validator
 */
exports.validationErrorHandler = (errors) => {
  const formattedErrors = {};
  
  errors.forEach(error => {
    if (!formattedErrors[error.param]) {
      formattedErrors[error.param] = [];
    }
    formattedErrors[error.param].push(error.msg);
  });

  return formattedErrors;
};
