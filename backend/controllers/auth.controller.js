/**
 * Authentication Controller
 * Handles login, signup, token refresh, and logout
 */

const authService = require('../services/auth.service');
const { successResponse, errorResponse } = require('../utils/response.util');
const logger = require('../utils/logger');

/**
 * User registration
 * @route POST /api/auth/register
 */
exports.register = async (req, res) => {
  try {
    const { email, password, firstname, lastname, role } = req.body;
    
    const result = await authService.register({
      email,
      password,
      firstname,
      lastname,
      role: role || 'customer'
    });

    return successResponse(res, result, 'Registration successful', 201);
  } catch (error) {
    logger.error('Registration error:', error);
    
    if (error.message.includes('already exists')) {
      return errorResponse(res, error.message, 409);
    }
    
    return errorResponse(res, 'Registration failed', 500);
  }
};

/**
 * User login
 * @route POST /api/auth/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await authService.login(email, password);
    
    if (!result) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    return successResponse(res, result, 'Login successful');
  } catch (error) {
    logger.error('Login error:', error);
    return errorResponse(res, 'Login failed', 500);
  }
};

/**
 * Refresh access token
 * @route POST /api/auth/refresh
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return errorResponse(res, 'Refresh token is required', 400);
    }

    const result = await authService.refreshAccessToken(refreshToken);
    
    return successResponse(res, result, 'Token refreshed successfully');
  } catch (error) {
    logger.error('Refresh token error:', error);
    return errorResponse(res, 'Invalid or expired refresh token', 401);
  }
};

/**
 * User logout
 * @route POST /api/auth/logout
 */
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    return successResponse(res, null, 'Logout successful');
  } catch (error) {
    logger.error('Logout error:', error);
    return errorResponse(res, 'Logout failed', 500);
  }
};

/**
 * Verify token
 * @route GET /api/auth/verify
 */
exports.verifyToken = async (req, res) => {
  try {
    // If request reaches here, token is valid (verified by middleware)
    return successResponse(res, { user: req.user }, 'Token is valid');
  } catch (error) {
    logger.error('Verify token error:', error);
    return errorResponse(res, 'Token verification failed', 500);
  }
};
