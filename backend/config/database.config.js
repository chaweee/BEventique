/**
 * Database Configuration
 * MySQL connection pool settings
 */

const config = require('./env.config');

module.exports = {
  host: config.DB_HOST,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  port: config.DB_PORT,
  
  // Connection pool settings
  connectionLimit: 10,
  queueLimit: 0,
  waitForConnections: true,
  
  // Timezone configuration
  timezone: '+08:00', // Asia/Manila
  
  // Charset
  charset: 'utf8mb4',
  
  // Connection timeout
  connectTimeout: 10000,
  
  // Enable multiple statements
  multipleStatements: false,
  
  // Debug mode
  debug: config.NODE_ENV === 'development' ? false : false,
};
