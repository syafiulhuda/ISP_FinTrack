const { Pool } = require('pg');
const path = require('path');

try {
  require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
} catch (e) {}

const pool = new Pool({
  user: process.env.DATABASE_USER,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
});

async function addExpensesTable() {
  console.log('Menambahkan tabel expenses...');
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "expenses" (
        id SERIAL PRIMARY KEY,
        "category" TEXT,
        "amount" NUMERIC,
        "date" DATE DEFAULT CURRENT_DATE,
        "description" TEXT
      );
    `);
    
    // Check if empty
    const check = await pool.query('SELECT COUNT(*) FROM expenses');
    if (parseInt(check.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO "expenses" ("category", "amount", "date", "description") VALUES
        ('Marketing', 1500000, '2026-04-01', 'Google Ads Campaign April'),
        ('Marketing', 500000, '2026-04-15', 'Facebook Ads West Java'),
        ('Infrastructure', 2500000, '2026-04-10', 'Fiber Optic Maintenance Cimahi'),
        ('Operational', 1200000, '2026-04-05', 'Electricity & Internet Office');
      `);
      console.log('✅ Berhasil menambahkan data awal ke tabel expenses!');
    } else {
      console.log('ℹ️ Tabel expenses sudah berisi data.');
    }
  } catch (error) {
    console.error('❌ Gagal menambahkan tabel expenses:', error);
  } finally {
    await pool.end();
  }
}

addExpensesTable();
