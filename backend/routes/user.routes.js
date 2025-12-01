/**
 * User Routes
 * Defines API endpoints for user operations
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticateToken, authorize } = require('../middleware/auth.middleware');
const { 
  validate, 
  updateUserValidation, 
  idValidation, 
  paginationValidation 
} = require('../middleware/validation.middleware');

/**
 * @route   GET /api/users
 * @desc    Get all users (with pagination and search)
 * @access  Private (Admin only)
 */
router.get(
  '/',
  authenticateToken,
  authorize('admin'),
  paginationValidation,
  validate,
  userController.getAllUsers
);

/**
 * @route   GET /api/users/profile/me
 * @desc    Get current user's profile
 * @access  Private
 */
router.get(
  '/profile/me',
  authenticateToken,
  userController.getMyProfile
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticateToken,
  idValidation,
  validate,
  userController.getUserById
);

/**
 * @route   POST /api/users
 * @desc    Create new user
 * @access  Private (Admin only)
 */
router.post(
  '/',
  authenticateToken,
  authorize('admin'),
  // Add validation here if needed
  userController.createUser
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private
 */
router.put(
  '/:id',
  authenticateToken,
  updateUserValidation,
  validate,
  userController.updateUser
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  authenticateToken,
  authorize('admin'),
  idValidation,
  validate,
  userController.deleteUser
);

module.exports = router;
