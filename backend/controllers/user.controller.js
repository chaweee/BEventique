/**
 * User Controller
 * Handles HTTP requests related to user operations
 */

const userService = require('../services/user.service');
const { successResponse, errorResponse } = require('../utils/response.util');
const logger = require('../utils/logger');

/**
 * Get all users
 * @route GET /api/users
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const result = await userService.getAllUsers({
      page: parseInt(page),
      limit: parseInt(limit),
      search
    });

    return successResponse(res, result, 'Users retrieved successfully');
  } catch (error) {
    logger.error('Get all users error:', error);
    return errorResponse(res, 'Failed to retrieve users', 500);
  }
};

/**
 * Get user by ID
 * @route GET /api/users/:id
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await userService.getUserById(id);
    
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, user, 'User retrieved successfully');
  } catch (error) {
    logger.error('Get user by ID error:', error);
    return errorResponse(res, 'Failed to retrieve user', 500);
  }
};

/**
 * Create new user
 * @route POST /api/users
 */
exports.createUser = async (req, res) => {
  try {
    const userData = req.body;
    
    // Validation would be done in middleware
    const newUser = await userService.createUser(userData);
    
    return successResponse(res, newUser, 'User created successfully', 201);
  } catch (error) {
    logger.error('Create user error:', error);
    
    if (error.message.includes('already exists')) {
      return errorResponse(res, error.message, 409);
    }
    
    return errorResponse(res, 'Failed to create user', 500);
  }
};

/**
 * Update user
 * @route PUT /api/users/:id
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const updatedUser = await userService.updateUser(id, updateData);
    
    if (!updatedUser) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, updatedUser, 'User updated successfully');
  } catch (error) {
    logger.error('Update user error:', error);
    return errorResponse(res, 'Failed to update user', 500);
  }
};

/**
 * Delete user
 * @route DELETE /api/users/:id
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await userService.deleteUser(id);
    
    if (!deleted) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, null, 'User deleted successfully');
  } catch (error) {
    logger.error('Delete user error:', error);
    return errorResponse(res, 'Failed to delete user', 500);
  }
};

/**
 * Get current user profile
 * @route GET /api/users/profile/me
 */
exports.getMyProfile = async (req, res) => {
  try {
    // req.user is set by auth middleware
    const userId = req.user.id;
    
    const user = await userService.getUserById(userId);
    
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, user, 'Profile retrieved successfully');
  } catch (error) {
    logger.error('Get profile error:', error);
    return errorResponse(res, 'Failed to retrieve profile', 500);
  }
};
