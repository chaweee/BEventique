/**
 * Database Migration Example
 * Create tables if they don't exist
 * Run this file manually or on server startup
 */

const db = require('./connection');
const logger = require('../utils/logger');

/**
 * Create account table
 */
const createAccountsTable = `
  CREATE TABLE IF NOT EXISTS account (
    Account_ID INT AUTO_INCREMENT PRIMARY KEY,
    Email VARCHAR(255) UNIQUE NOT NULL,
    Password VARCHAR(255) NOT NULL,
    Firstname VARCHAR(100) NOT NULL,
    Lastname VARCHAR(100) NOT NULL,
    Role ENUM('customer', 'designer', 'admin') DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (Email),
    INDEX idx_role (Role)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

/**
 * Create packages table
 */
const createPackagesTable = `
  CREATE TABLE IF NOT EXISTS packages (
    Package_ID INT AUTO_INCREMENT PRIMARY KEY,
    Package_Name VARCHAR(255) NOT NULL,
    Description TEXT,
    Package_Amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (Package_Name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

/**
 * Create package_photos table
 */
const createPackagePhotosTable = `
  CREATE TABLE IF NOT EXISTS package_photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Package_ID INT NOT NULL,
    photo_url VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Package_ID) REFERENCES packages(Package_ID) ON DELETE CASCADE,
    INDEX idx_package (Package_ID)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

/**
 * Create bookings table
 */
const createBookingsTable = `
  CREATE TABLE IF NOT EXISTS bookings (
    Booking_ID INT AUTO_INCREMENT PRIMARY KEY,
    Account_ID INT NOT NULL,
    Package_ID INT NOT NULL,
    Event_Date DATE NOT NULL,
    Event_Time TIME,
    Venue VARCHAR(255),
    Status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
    Total_Amount DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (Account_ID) REFERENCES account(Account_ID) ON DELETE CASCADE,
    FOREIGN KEY (Package_ID) REFERENCES packages(Package_ID) ON DELETE RESTRICT,
    INDEX idx_account (Account_ID),
    INDEX idx_status (Status),
    INDEX idx_event_date (Event_Date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

/**
 * Create design_queries table
 */
const createDesignQueriesTable = `
  CREATE TABLE IF NOT EXISTS design_queries (
    Query_ID INT AUTO_INCREMENT PRIMARY KEY,
    Account_ID INT NOT NULL,
    Booking_ID INT,
    Subject VARCHAR(255) NOT NULL,
    Status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    assigned_to INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (Account_ID) REFERENCES account(Account_ID) ON DELETE CASCADE,
    FOREIGN KEY (Booking_ID) REFERENCES bookings(Booking_ID) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES account(Account_ID) ON DELETE SET NULL,
    INDEX idx_account (Account_ID),
    INDEX idx_status (Status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

/**
 * Create query_messages table
 */
const createQueryMessagesTable = `
  CREATE TABLE IF NOT EXISTS query_messages (
    Message_ID INT AUTO_INCREMENT PRIMARY KEY,
    Query_ID INT NOT NULL,
    Sender_ID INT NOT NULL,
    Message TEXT NOT NULL,
    is_designer BOOLEAN DEFAULT FALSE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Query_ID) REFERENCES design_queries(Query_ID) ON DELETE CASCADE,
    FOREIGN KEY (Sender_ID) REFERENCES account(Account_ID) ON DELETE CASCADE,
    INDEX idx_query (Query_ID),
    INDEX idx_sender (Sender_ID)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

/**
 * Run all migrations
 */
async function runMigrations() {
  try {
    logger.info('Starting database migrations...');

    await db.query(createAccountsTable);
    logger.info('✓ Account table created/verified');

    await db.query(createPackagesTable);
    logger.info('✓ Packages table created/verified');

    await db.query(createPackagePhotosTable);
    logger.info('✓ Package photos table created/verified');

    await db.query(createBookingsTable);
    logger.info('✓ Bookings table created/verified');

    await db.query(createDesignQueriesTable);
    logger.info('✓ Design queries table created/verified');

    await db.query(createQueryMessagesTable);
    logger.info('✓ Query messages table created/verified');

    logger.info('✓ All migrations completed successfully');
  } catch (error) {
    logger.error('✗ Migration failed:', error);
    throw error;
  }
}

// Run migrations if executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Migrations complete. Exiting...');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration error:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations };
