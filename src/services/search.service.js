// File: src/services/search.service.js
const db = require('../db/pool');

/**
 * Performs a text search (ILIKE) on title and context
 */
const searchDatabase = async (searchQuery) => {
  // We use $1 for parameterized query to prevent SQL injection
  // ILIKE is case-insensitive
  const text = `
    SELECT id, title, sql_query, context, tags, module, created_at
    FROM queries
    WHERE title ILIKE $1 
       OR context ILIKE $1 
       OR array_to_string(tags, ' ') ILIKE $1
       OR module ILIKE $1
    ORDER BY created_at DESC
    LIMIT 20;
  `;
  
  // Wrap query in % for partial matching
  const values = [`%${searchQuery}%`];
  
  const result = await db.query(text, values);
  return result.rows;
};

module.exports = {
  searchDatabase
};
