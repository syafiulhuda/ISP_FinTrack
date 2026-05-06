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
    const inv = await client.query('SELECT COUNT(*) FROM invoices');
    const trx = await client.query("SELECT COUNT(*) FROM transactions WHERE keterangan='pemasukan'");
    const hb = await client.query("SELECT harga_beli FROM asset_roster LIMIT 1");
    const pb = await client.query("SELECT DISTINCT province FROM customers");
    console.log("Invoices:", inv.rows[0].count);
    console.log("Transactions Pemasukan:", trx.rows[0].count);
    console.log("Harga Beli:", hb.rows[0].harga_beli);
    console.log("Provinces:", pb.rows.map(r => r.province));
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

check();
