/**
 * Authentication Service
 * Business logic for authentication (login, register, token management)
 */

const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/env.config');
const logger = require('../utils/logger');

class AuthService {
  /**
   * User registration
   */
  async register({ email, password, firstname, lastname, role }) {
    try {
      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, config.BCRYPT_ROUNDS);

      // Create user
      const user = await User.create({
        email,
        password: hashedPassword,
        firstname,
        lastname,
        role: role || 'customer'
      });

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens({
        id: user.id,
        email: user.email,
        role: user.Role
      });

      // Remove password from response
      delete user.Password;

      return {
        user,
        accessToken,
        refreshToken
      };
    } catch (error) {
      logger.error('AuthService.register error:', error);
      throw error;
    }
  }

  /**
   * User login
   */
  async login(email, password) {
    try {
      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        return null;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.Password);
      if (!isPasswordValid) {
        return null;
      }

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens({
        id: user.Account_ID,
        email: user.Email,
        role: user.Role
      });

      // Remove password from response
      delete user.Password;

      return {
        user,
        accessToken,
        refreshToken
      };
    } catch (error) {
      logger.error('AuthService.login error:', error);
      throw error;
    }
  }

  /**
   * Generate access and refresh tokens
   */
  generateTokens(payload) {
    const accessToken = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRE
    });

    const refreshToken = jwt.sign(payload, config.JWT_REFRESH_SECRET, {
      expiresIn: config.JWT_REFRESH_EXPIRE
    });

    return { accessToken, refreshToken };
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, config.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, config.JWT_REFRESH_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = this.verifyRefreshToken(refreshToken);

      // Generate new access token
      const newAccessToken = jwt.sign(
        {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role
        },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRE }
      );

      return {
        accessToken: newAccessToken
      };
    } catch (error) {
      logger.error('AuthService.refreshAccessToken error:', error);
      throw error;
    }
  }

  /**
   * Logout (invalidate refresh token)
   * Note: For production, store refresh tokens in DB and delete on logout
   */
  async logout(refreshToken) {
    try {
      // In a production app, you would:
      // 1. Store refresh tokens in a database table
      // 2. Delete the token from DB on logout
      // 3. Implement token blacklisting for access tokens if needed
      
      logger.info('User logged out');
      return true;
    } catch (error) {
      logger.error('AuthService.logout error:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();
