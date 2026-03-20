// File: src/db/pool.js
const { Pool } = require('pg');

// Create the connection pool with max 5 connections
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

// Handle ECONNREFUSED at startup gracefully with a retry message
pool.on('error', (err, client) => {
  if (err.code === 'ECONNREFUSED') {
    console.error('Database connection refused. Ensure the database is running and accessible.');
    // The application shouldn't crash immediately, standard pg pool behavior handles reconnects,
    // but the error needs to be logged at least.
  } else {
    console.error('Unexpected error on idle client', err);
  }
});

// Wrapper for query execution that automatically logs slow queries (>500ms) to stderr
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 500) {
      console.error(`SLOW QUERY (${duration}ms): ${text}`);
    }
    return res;
  } catch (error) {
    // Re-throw to be handled by the service or controller calling this wrapper
    throw error;
  }
};

module.exports = {
  query, // Using the wrapper function here instead of pool.query directly
  pool   // Expose the raw pool just in case, but prefer the wrapper
};
