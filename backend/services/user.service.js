/**
 * User Service
 * Business logic for user operations
 */

const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const config = require('../config/env.config');
const logger = require('../utils/logger');

class UserService {
  /**
   * Get all users with pagination and search
   */
  async getAllUsers({ page, limit, search }) {
    try {
      return await User.findAll({ page, limit, search });
    } catch (error) {
      logger.error('UserService.getAllUsers error:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id) {
    try {
      return await User.findById(id);
    } catch (error) {
      logger.error('UserService.getUserById error:', error);
      throw error;
    }
  }

  /**
   * Create new user
   */
  async createUser(userData) {
    try {
      // Check if email already exists
      const existingUser = await User.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('Email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, config.BCRYPT_ROUNDS);

      // Create user
      const user = await User.create({
        email: userData.email,
        password: hashedPassword,
        firstname: userData.firstname,
        lastname: userData.lastname,
        role: userData.role || 'customer'
      });

      // Remove password from response
      delete user.Password;
      
      return user;
    } catch (error) {
      logger.error('UserService.createUser error:', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(id, updateData) {
    try {
      // Check if user exists
      const user = await User.findById(id);
      if (!user) {
        return null;
      }

      // Check email uniqueness if email is being updated
      if (updateData.email && updateData.email !== user.Email) {
        const emailExists = await User.emailExists(updateData.email, id);
        if (emailExists) {
          throw new Error('Email already exists');
        }
      }

      // Hash password if being updated
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, config.BCRYPT_ROUNDS);
      }

      // Update user
      const updatedUser = await User.update(id, updateData);
      
      // Remove password from response
      if (updatedUser && updatedUser.Password) {
        delete updatedUser.Password;
      }
      
      return updatedUser;
    } catch (error) {
      logger.error('UserService.updateUser error:', error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(id) {
    try {
      return await User.delete(id);
    } catch (error) {
      logger.error('UserService.deleteUser error:', error);
      throw error;
    }
  }

  /**
   * Verify password
   */
  async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = new UserService();
