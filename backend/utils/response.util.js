/**
 * Response Utility
 * Standardized response format for API endpoints
 */

/**
 * Success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {String} message - Success message
 * @param {Number} statusCode - HTTP status code (default: 200)
 */
exports.successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

/**
 * Error response
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {Number} statusCode - HTTP status code (default: 500)
 * @param {*} errors - Validation or detailed errors
 */
exports.errorResponse = (res, message = 'Error', statusCode = 500, errors = null) => {
  const response = {
    status: 'error',
    message,
    timestamp: new Date().toISOString()
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {Number} total - Total number of items
 * @param {Number} page - Current page
 * @param {Number} limit - Items per page
 * @param {String} message - Success message
 */
exports.paginatedResponse = (res, data, total, page, limit, message = 'Success') => {
  return res.status(200).json({
    status: 'success',
    message,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    },
    timestamp: new Date().toISOString()
  });
};
