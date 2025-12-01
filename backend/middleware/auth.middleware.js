/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user to request
 */

const authService = require('../services/auth.service');
const { errorResponse } = require('../utils/response.util');
const logger = require('../utils/logger');

/**
 * Verify JWT token from Authorization header
 */
exports.authenticateToken = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return errorResponse(res, 'Access token is required', 401);
    }

    // Verify token
    const decoded = authService.verifyAccessToken(token);
    
    // Attach user to request
    req.user = decoded;
    
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return errorResponse(res, 'Invalid or expired token', 401);
  }
};

/**
 * Check if user has required role
 */
exports.authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Authentication required', 401);
    }

    const userRole = req.user.role.toLowerCase();
    
    if (!allowedRoles.map(r => r.toLowerCase()).includes(userRole)) {
      return errorResponse(res, 'Insufficient permissions', 403);
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token
 */
exports.optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = authService.verifyAccessToken(token);
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // Token invalid, but continue without user
    next();
  }
};
