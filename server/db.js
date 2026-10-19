const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'element_clash',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

let isConnected = false;

/**
 * Initializes PostgreSQL schema (users, matches)
 */
async function initDb() {
  try {
    const client = await pool.connect();
    console.log('[DB] Connected successfully to PostgreSQL database.');
    isConnected = true;

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        wins INT DEFAULT 0,
        losses INT DEFAULT 0,
        draws INT DEFAULT 0,
        total_matches INT DEFAULT 0,
        total_damage_dealt INT DEFAULT 0,
        win_streak INT DEFAULT 0,
        max_win_streak INT DEFAULT 0
      );
    `);

    // Matches history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id SERIAL PRIMARY KEY,
        player1_id INT REFERENCES users(id) ON DELETE CASCADE,
        player2_id INT REFERENCES users(id) ON DELETE CASCADE,
        winner_id INT REFERENCES users(id) ON DELETE SET NULL,
        p1_score INT DEFAULT 0,
        p2_score INT DEFAULT 0,
        end_reason VARCHAR(50) DEFAULT 'normal',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('[DB] Database tables initialized successfully.');
    client.release();
  } catch (err) {
    isConnected = false;
    console.warn('[DB Warning] Could not connect to PostgreSQL or initialize tables:', err.message);
    console.warn('[DB Warning] Ensure PostgreSQL is running on port ' + (process.env.DB_PORT || 5432) + ' and database "' + (process.env.DB_NAME || 'element_clash') + '" exists.');
  }
}

/**
 * Custom query execution helper
 */
async function query(text, params) {
  if (!isConnected) {
    // Try reconnecting once if initial connection failed
    try {
      await initDb();
    } catch (e) {
      // ignore
    }
  }
  if (!isConnected) {
    throw new Error('Database is not connected. Please check your PostgreSQL service.');
  }
  return pool.query(text, params);
}

module.exports = {
  pool,
  query,
  initDb,
  getIsConnected: () => isConnected
};
