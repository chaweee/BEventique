/**
 * User Model
 * Represents user entity and database operations
 */

const db = require('../db/connection');

class User {
  /**
   * Find user by ID
   */
  static async findById(id) {
    const [rows] = await db.query(
      'SELECT Account_ID as id, Email as email, Firstname, Lastname, Role, created_at FROM accounts WHERE Account_ID = ?',
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    const [rows] = await db.query(
      'SELECT * FROM accounts WHERE Email = ?',
      [email]
    );
    return rows[0] || null;
  }

  /**
   * Find all users with pagination
   */
  static async findAll({ page = 1, limit = 10, search = '' }) {
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT Account_ID as id, Email as email, Firstname, Lastname, Role, created_at 
      FROM accounts
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM accounts';
    const params = [];
    
    if (search) {
      query += ' WHERE Email LIKE ? OR Firstname LIKE ? OR Lastname LIKE ?';
      countQuery += ' WHERE Email LIKE ? OR Firstname LIKE ? OR Lastname LIKE ?';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    query += ' LIMIT ? OFFSET ?';
    
    const [users] = await db.query(query, [...params, limit, offset]);
    const [countResult] = await db.query(countQuery, params);
    
    return {
      users,
      total: countResult[0].total,
      page,
      totalPages: Math.ceil(countResult[0].total / limit)
    };
  }

  /**
   * Create new user
   */
  static async create({ email, password, firstname, lastname, role }) {
    const [result] = await db.query(
      'INSERT INTO accounts (Email, Password, Firstname, Lastname, Role) VALUES (?, ?, ?, ?, ?)',
      [email, password, firstname, lastname, role]
    );
    
    return this.findById(result.insertId);
  }

  /**
   * Update user
   */
  static async update(id, data) {
    const fields = [];
    const values = [];
    
    if (data.firstname) {
      fields.push('Firstname = ?');
      values.push(data.firstname);
    }
    if (data.lastname) {
      fields.push('Lastname = ?');
      values.push(data.lastname);
    }
    if (data.email) {
      fields.push('Email = ?');
      values.push(data.email);
    }
    if (data.password) {
      fields.push('Password = ?');
      values.push(data.password);
    }
    if (data.role) {
      fields.push('Role = ?');
      values.push(data.role);
    }
    
    if (fields.length === 0) return null;
    
    values.push(id);
    
    await db.query(
      `UPDATE accounts SET ${fields.join(', ')} WHERE Account_ID = ?`,
      values
    );
    
    return this.findById(id);
  }

  /**
   * Delete user
   */
  static async delete(id) {
    const [result] = await db.query(
      'DELETE FROM accounts WHERE Account_ID = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Check if email exists
   */
  static async emailExists(email, excludeId = null) {
    let query = 'SELECT COUNT(*) as count FROM accounts WHERE Email = ?';
    const params = [email];
    
    if (excludeId) {
      query += ' AND Account_ID != ?';
      params.push(excludeId);
    }
    
    const [rows] = await db.query(query, params);
    return rows[0].count > 0;
  }
}

module.exports = User;
