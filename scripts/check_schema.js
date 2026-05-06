const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  user: process.env.DATABASE_USER,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: process.env.DATABASE_PORT || 5432,
});

async function check() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_name IN ('invoices', 'asset_roster', 'stock_asset_roster')");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

check();
