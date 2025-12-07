const mysql = require('mysql2/promise');

const runMigration = async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    // Don't specify database initially
  });

  try {
    console.log('Connecting to MySQL...');
    
    // Switch to eventdb database
    await connection.query('USE eventdb');
    console.log('✓ Connected to eventdb');
    
    console.log('Starting migration...');
    
    // Drop has_custom_layout column
    console.log('Dropping has_custom_layout column...');
    await connection.query('ALTER TABLE bookings DROP COLUMN IF EXISTS has_custom_layout');
    console.log('✓ Dropped has_custom_layout column');
    
    // Modify custom_layout to LONGTEXT
    console.log('Modifying custom_layout to LONGTEXT...');
    await connection.query('ALTER TABLE bookings MODIFY COLUMN custom_layout LONGTEXT NULL');
    console.log('✓ Modified custom_layout to LONGTEXT');
    
    // Show table structure
    console.log('\nCurrent bookings table structure:');
    const [columns] = await connection.query('DESCRIBE bookings');
    columns.forEach(col => {
      console.log(`${col.Field.padEnd(20)} | ${col.Type.padEnd(30)} | ${col.Null} | ${col.Key || ''}`);
    });
    
    console.log('\n✓ Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
  } finally {
    await connection.end();
  }
};

runMigration();
