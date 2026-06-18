// migrate-teams.js
// Migración segura: crea tabla teams, agrega team_id a modules, asigna todos los módulos existentes a L3
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Crear tabla teams
    await client.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id       SERIAL PRIMARY KEY,
        name     VARCHAR(50) NOT NULL UNIQUE,
        icon     VARCHAR(20) DEFAULT '👥',
        color    VARCHAR(20) DEFAULT '#475569',
        position INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla teams creada / ya existía');

    // 2. Insertar los 4 equipos base
    await client.query(`
      INSERT INTO teams (name, icon, color, position) VALUES
        ('L3', '🔧', '#6366f1', 1),
        ('L2', '🛡️', '#0ea5e9', 2),
        ('QA', '✅', '#22c55e', 3),
        ('MC', '🧩', '#f59e0b', 4)
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('✅ Equipos L3, L2, QA, MC insertados (o ya existían)');

    // 3. Agregar columna team_id a modules (si no existe)
    await client.query(`
      ALTER TABLE modules
      ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id)
    `);
    console.log('✅ Columna team_id agregada a modules (o ya existía)');

    // 4. Asignar todos los módulos sin equipo al equipo L3
    const result = await client.query(`
      UPDATE modules
      SET team_id = (SELECT id FROM teams WHERE name = 'L3')
      WHERE team_id IS NULL
    `);
    console.log(`✅ ${result.rowCount} módulo(s) asignados al equipo L3`);

    await client.query('COMMIT');
    console.log('\n🎉 Migración completada exitosamente.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error en migración — ROLLBACK ejecutado:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
