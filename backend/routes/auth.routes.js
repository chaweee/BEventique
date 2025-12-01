/**
 * Authentication Routes
 * Handles login, register, token refresh, logout
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { 
  validate, 
  registerValidation, 
  loginValidation 
} = require('../middleware/validation.middleware');

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post(
  '/register',
  registerValidation,
  validate,
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  loginValidation,
  validate,
  authController.login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  '/refresh',
  authController.refreshToken
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post(
  '/logout',
  authenticateToken,
  authController.logout
);

/**
 * @route   GET /api/auth/verify
 * @desc    Verify token validity
 * @access  Private
 */
router.get(
  '/verify',
  authenticateToken,
  authController.verifyToken
);

module.exports = router;
