require('dotenv').config();
const { pool } = require('./src/db/pool');

async function migrate() {
    try {
        console.log("Adding is_favorite to queries table...");
        await pool.query(`ALTER TABLE queries ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false`);
        console.log("Migration successful!");
    } catch (err) {
        console.error("Migration failed", err);
    } finally {
        pool.end();
    }
}

migrate();
