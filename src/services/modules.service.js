// File: src/services/modules.service.js
const db = require('../db/pool');

/**
 * Retrieves all modules
 */
const getAllModules = async () => {
  const text = 'SELECT * FROM modules ORDER BY name ASC';
  const result = await db.query(text);
  return result.rows;
};

/**
 * Creates a new module
 */
const createModule = async (data) => {
  const { name, icon, color } = data;
  const text = `
    INSERT INTO modules (name, icon, color)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const values = [name.toLowerCase().trim(), icon || 'hex:1F4C1', color || '#475569'];
  const result = await db.query(text, values);
  return result.rows[0];
};

/**
 * Updates an existing module
 */
const updateModule = async (id, data) => {
  const { name, icon, color } = data;
  const text = `
    UPDATE modules 
    SET name = $1, icon = $2, color = $3
    WHERE id = $4
    RETURNING *;
  `;
  const values = [name.toLowerCase().trim(), icon, color, id];
  const result = await db.query(text, values);
  return result.rows[0];
};

/**
 * Deletes a module
 */
const deleteModule = async (id) => {
  const text = 'DELETE FROM modules WHERE id = $1 RETURNING id';
  const result = await db.query(text, [id]);
  return result.rowCount > 0;
};

module.exports = {
  getAllModules,
  createModule,
  updateModule,
  deleteModule
};
