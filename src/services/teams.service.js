// File: src/services/teams.service.js
const db = require('../db/pool');

/**
 * Retrieves all teams ordered by position
 */
const getAllTeams = async () => {
  const text = 'SELECT * FROM teams ORDER BY position ASC, name ASC';
  const result = await db.query(text);
  return result.rows;
};

/**
 * Creates a new team
 */
const createTeam = async (data) => {
  const { name, icon, color, position } = data;
  const text = `
    INSERT INTO teams (name, icon, color, position)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const values = [name.trim(), icon || '👥', color || '#475569', position || 0];
  const result = await db.query(text, values);
  return result.rows[0];
};

/**
 * Updates an existing team
 */
const updateTeam = async (id, data) => {
  const { name, icon, color, position } = data;
  const text = `
    UPDATE teams
    SET name = $1, icon = $2, color = $3, position = $4
    WHERE id = $5
    RETURNING *;
  `;
  const values = [name.trim(), icon, color, position, id];
  const result = await db.query(text, values);
  return result.rows[0];
};

/**
 * Deletes a team
 */
const deleteTeam = async (id) => {
  const text = 'DELETE FROM teams WHERE id = $1 RETURNING id';
  const result = await db.query(text, [id]);
  return result.rowCount > 0;
};

module.exports = {
  getAllTeams,
  createTeam,
  updateTeam,
  deleteTeam,
};
