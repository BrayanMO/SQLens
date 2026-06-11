const db = require('../db/pool');

const getAllPOs = async () => {
  const text = 'SELECT * FROM product_owners ORDER BY id ASC';
  const result = await db.query(text);
  return result.rows;
};

const createPO = async (data) => {
  const { project_name, owners } = data;
  const text = `
    INSERT INTO product_owners (project_name, owners)
    VALUES ($1, $2)
    RETURNING *;
  `;
  const values = [project_name.trim(), owners.trim()];
  const result = await db.query(text, values);
  return result.rows[0];
};

const updatePO = async (id, data) => {
  const { project_name, owners } = data;
  const text = `
    UPDATE product_owners 
    SET project_name = $1, owners = $2
    WHERE id = $3
    RETURNING *;
  `;
  const values = [project_name.trim(), owners.trim(), id];
  const result = await db.query(text, values);
  return result.rows[0];
};

const deletePO = async (id) => {
  const text = 'DELETE FROM product_owners WHERE id = $1 RETURNING id';
  const result = await db.query(text, [id]);
  return result.rowCount > 0;
};

module.exports = {
  getAllPOs,
  createPO,
  updatePO,
  deletePO
};
