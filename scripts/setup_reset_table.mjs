import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  user: process.env.DATABASE_USER || process.env.POSTGRES_USER,
  host: process.env.DATABASE_HOST || process.env.POSTGRES_HOST,
  database: process.env.DATABASE_NAME || process.env.POSTGRES_DATABASE,
  password: process.env.DATABASE_PASSWORD || process.env.POSTGRES_PASSWORD,
  port: parseInt(process.env.DATABASE_PORT || process.env.POSTGRES_PORT || '5432'),
});

async function setup() {
  try {
    console.log("Setting up password_resets table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Success: Table password_resets is ready.");
  } catch (err) {
    console.error("Error setting up table:", err);
  } finally {
    await pool.end();
  }
}

setup();
