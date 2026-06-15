require('dotenv').config();
const { pool } = require('./src/db/pool');

const insertModules = async () => {
  try {
    console.log('Connecting to database...');
    
    // Check existing modules
    const { rows } = await pool.query('SELECT name FROM modules');
    const existing = rows.map(r => r.name.toLowerCase());
    
    const newModules = [
      { name: 'SICC', icon: 'hex:1F4BB', color: '#0369a1' },
      { name: 'ODS', icon: 'hex:1F4C4', color: '#0f766e' },
      { name: 'PROL', icon: 'hex:1F4CB', color: '#be185d' }
    ];

    for (const m of newModules) {
      if (!existing.includes(m.name.toLowerCase())) {
        console.log(`Inserting module ${m.name}...`);
        await pool.query(
          'INSERT INTO modules (name, icon, color) VALUES ($1, $2, $3)',
          [m.name, m.icon, m.color]
        );
      } else {
        console.log(`Module ${m.name} already exists.`);
      }
    }
    console.log('Finished inserting modules.');
  } catch (error) {
    console.error('Error inserting modules:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
};

insertModules();
