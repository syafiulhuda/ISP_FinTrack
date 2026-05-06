const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool();

async function check() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT customer_id, due_date, COUNT(*) FROM invoices GROUP BY customer_id, due_date HAVING COUNT(*) > 1 LIMIT 5');
    console.log("Duplicate invoices:", res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

check();
