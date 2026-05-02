import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  user: process.env.DATABASE_USER || process.env.POSTGRES_USER,
  host: process.env.DATABASE_HOST || process.env.POSTGRES_HOST,
  database: process.env.DATABASE_NAME || process.env.POSTGRES_DATABASE,
  password: process.env.DATABASE_PASSWORD || process.env.POSTGRES_PASSWORD,
  port: parseInt(process.env.DATABASE_PORT || process.env.POSTGRES_PORT || '5432'),
  ssl: process.env.POSTGRES_URL ? { rejectUnauthorized: false } : false
});

async function fixTriggers() {
  try {
    console.log("Dropping redundant trigger 'trg_asset_condition'...");
    await pool.query('DROP TRIGGER IF EXISTS trg_asset_condition ON asset_roster;');
    
    console.log("Dropping redundant function 'notify_asset_condition_change'...");
    await pool.query('DROP FUNCTION IF EXISTS notify_asset_condition_change();');
    
    console.log("Cleanup complete! Duplicate notifications should now be resolved.");
  } catch (err) {
    console.error("Error during cleanup:", err);
  } finally {
    await pool.end();
  }
}

fixTriggers();
