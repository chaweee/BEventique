/**
 * Database Connection
 * MySQL connection pool using mysql2
 */

const mysql = require('mysql2/promise');
const dbConfig = require('../config/database.config');
const logger = require('../utils/logger');

// Create connection pool
const pool = mysql.createPool(dbConfig);

/**
 * Test database connection
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    logger.info('✓ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    logger.error('✗ Database connection failed:', error.message);
    throw error;
  }
}

/**
 * Execute query with error handling
 */
async function query(sql, params) {
  try {
    return await pool.execute(sql, params);
  } catch (error) {
    logger.error('Database query error:', {
      sql: sql.substring(0, 100),
      error: error.message
    });
    throw error;
  }
}

/**
 * Begin transaction
 */
async function beginTransaction() {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  return connection;
}

/**
 * Commit transaction
 */
async function commit(connection) {
  try {
    await connection.commit();
    connection.release();
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
}

/**
 * Rollback transaction
 */
async function rollback(connection) {
  try {
    await connection.rollback();
    connection.release();
  } catch (error) {
    connection.release();
    throw error;
  }
}

/**
 * Close pool
 */
async function closePool() {
  try {
    await pool.end();
    logger.info('Database pool closed');
  } catch (error) {
    logger.error('Error closing database pool:', error);
  }
}

// Export connection methods
module.exports = {
  query,
  pool,
  testConnection,
  beginTransaction,
  commit,
  rollback,
  closePool
};
