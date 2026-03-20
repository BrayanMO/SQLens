// File: src/services/queries.service.js
const db = require('../db/pool');

/**
 * Creates a new query record
 */
const createQuery = async (data) => {
  const { title, sql_query, context, tags = [], module = 'otros', dev = '' } = data;
  
  // Clean up tags: discard empty, deduplicate, lowercase
  const cleanTags = [...new Set(tags.filter(t => t && t.trim() !== '').map(t => t.toLowerCase()))];

  const text = `
    INSERT INTO queries (title, sql_query, context, tags, module, dev)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;
  const values = [title, sql_query, context, cleanTags, module || 'otros', dev];
  
  const result = await db.query(text, values).catch(async (error) => {
    if (error.message.includes('codificación') || error.code === '22021') {
      console.warn('Encoding error in query. Sanitizing...');
      // Strip non-ASCII characters as a last resort
      const sanitize = (str) => str.replace(/[^\x00-\x7F]/g, '');
      const safeValues = [sanitize(title), sql_query, sanitize(context), cleanTags.map(sanitize), module || 'otros'];
      return await db.query(text, safeValues);
    }
    throw error;
  });
  return result.rows[0];
};

/**
 * Retrieves paginated queries
 */
const getQueries = async (page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const text = `
    SELECT id, title, sql_query, context, tags, module, dev, created_at
    FROM queries
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2;
  `;
  const values = [limit, offset];
  
  const result = await db.query(text, values);
  
  // Get total count for pagination metadata
  const countResult = await db.query('SELECT COUNT(*) FROM queries');
  const total = parseInt(countResult.rows[0].count, 10);

  return {
    data: result.rows,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit)
    }
  };
};

/**
 * Retrieves a single query by ID
 */
const getQueryById = async (id) => {
  const text = 'SELECT * FROM queries WHERE id = $1';
  const result = await db.query(text, [id]);
  return result.rows[0] || null;
};

/**
 * Deletes a query by ID
 */
const deleteQuery = async (id) => {
  const text = 'DELETE FROM queries WHERE id = $1 RETURNING id';
  const result = await db.query(text, [id]);
  return result.rowCount > 0;
};

/**
 * Updates an existing query record
 */
const updateQuery = async (id, data) => {
  const { title, sql_query, context, tags, module } = data;
  
  const fields = [];
  const values = [];
  let queryText = 'UPDATE queries SET ';
  let paramIndex = 1;

  if (title !== undefined) { fields.push(`title = $${paramIndex++}`); values.push(title); }
  if (sql_query !== undefined) { fields.push(`sql_query = $${paramIndex++}`); values.push(sql_query); }
  if (context !== undefined) { fields.push(`context = $${paramIndex++}`); values.push(context); }
  if (module !== undefined) { fields.push(`module = $${paramIndex++}`); values.push(module); }
  if (dev !== undefined) { fields.push(`dev = $${paramIndex++}`); values.push(dev); }
  if (tags !== undefined) {
    const cleanTags = [...new Set(tags.filter(t => t && t.trim() !== '').map(t => t.toLowerCase()))];
    fields.push(`tags = $${paramIndex++}`);
    values.push(cleanTags);
  }

  if (fields.length === 0) return null;

  queryText += fields.join(', ');
  queryText += ` WHERE id = $${paramIndex} RETURNING *`;
  values.push(id);

  const result = await db.query(queryText, values).catch(async (error) => {
    if (error.message.includes('codificación') || error.code === '22021') {
      const sanitize = (str) => typeof str === 'string' ? str.replace(/[^\x00-\x7F]/g, '') : str;
      const safeValues = values.map(v => Array.isArray(v) ? v.map(sanitize) : sanitize(v));
      return await db.query(queryText, safeValues);
    }
    throw error;
  });
  return result.rows[0];
};

/**
 * Extract potential table names from all saved queries (Poor man's RAG)
 */
const getKnownTablesSummary = async () => {
  const text = 'SELECT sql_query FROM queries';
  const result = await db.query(text);
  
  const tables = new Set();
  const sqlRegex = /FROM\s+([a-zA-Z0-9_.]+)|JOIN\s+([a-zA-Z0-9_.]+)/gi;
  
  result.rows.forEach(row => {
    let match;
    while ((match = sqlRegex.exec(row.sql_query)) !== null) {
      const tableName = match[1] || match[2];
      if (tableName && tableName.length < 50) {
        tables.add(tableName.toLowerCase());
      }
    }
  });

  return Array.from(tables).join(', ');
};

module.exports = {
  createQuery,
  getQueries,
  getQueryById,
  updateQuery,
  deleteQuery,
  getKnownTablesSummary
};
