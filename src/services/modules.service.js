// File: src/services/modules.service.js
const db = require('../db/pool');

/**
 * Retrieves all modules (with team info via JOIN)
 */
const getAllModules = async () => {
  const text = `
    SELECT m.*, t.name AS team_name, t.icon AS team_icon, t.color AS team_color
    FROM modules m
    LEFT JOIN teams t ON m.team_id = t.id
    ORDER BY t.position ASC, m.name ASC
  `;
  const result = await db.query(text);
  return result.rows;
};

/**
 * Creates a new module
 */
const createModule = async (data) => {
  const { name, icon, color, team_id } = data;
  const text = `
    INSERT INTO modules (name, icon, color, team_id)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const values = [name.trim(), icon || 'hex:1F4C1', color || '#475569', team_id || null];
  const result = await db.query(text, values);
  return result.rows[0];
};

/**
 * Updates an existing module
 */
const updateModule = async (id, data) => {
  const { name, icon, color, team_id } = data;
  const text = `
    UPDATE modules
    SET name = $1, icon = $2, color = $3, team_id = $4
    WHERE id = $5
    RETURNING *;
  `;
  const values = [name.trim(), icon, color, team_id || null, id];
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
  deleteModule,
};
