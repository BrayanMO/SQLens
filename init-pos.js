require('dotenv').config();
const { pool } = require('./src/db/pool');

const initPosTable = async () => {
  try {
    console.log('Connecting to database...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_owners (
        id SERIAL PRIMARY KEY,
        project_name TEXT NOT NULL,
        owners TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Table product_owners created successfully.');

    // Check if empty
    const res = await pool.query('SELECT COUNT(*) FROM product_owners');
    if (parseInt(res.rows[0].count, 10) === 0) {
      console.log('Inserting default data...');
      const defaultData = [
        { project: 'FFVV', owners: 'SB' },
        { project: 'APP FFVV', owners: 'SB' },
        { project: 'SB', owners: 'SB' },
        { project: 'APP SB', owners: 'SB' },
        { project: 'E-Catalogo', owners: 'Ecata' },
        { project: 'Unete', owners: 'Por definir' }
      ];

      for (const item of defaultData) {
        await pool.query('INSERT INTO product_owners (project_name, owners) VALUES ($1, $2)', [item.project, item.owners]);
      }
      console.log('Default data inserted successfully.');
    } else {
      console.log('Data already exists in product_owners table.');
    }
  } catch (error) {
    console.error('Error initializing product_owners table:', error);
  } finally {
    process.exit(0);
  }
};

initPosTable();
