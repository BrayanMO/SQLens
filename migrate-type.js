require('dotenv').config();
const { pool } = require('./src/db/pool');

const migrateTable = async () => {
  try {
    console.log('Adding type column to queries table...');
    await pool.query(`
      ALTER TABLE queries ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'sql';
    `);
    console.log('Migration successful.');
  } catch (error) {
    console.error('Error migrating table:', error);
  } finally {
    process.exit(0);
  }
};

migrateTable();
