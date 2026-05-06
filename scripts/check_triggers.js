const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool();

async function check() {
  const client = await pool.connect();
  try {
    const triggers = await client.query("SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE event_object_table IN ('transactions', 'invoices')");
    console.log(triggers.rows);
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

check();
