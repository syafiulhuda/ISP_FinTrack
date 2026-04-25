const { Pool } = require('pg');
require('dotenv').config({ path: '../.env.local' });

const pool = new Pool({
  user: process.env.DATABASE_USER,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
});

async function checkData() {
  try {
    const expenses = await pool.query('SELECT * FROM expenses');
    console.log('--- EXPENSES ---');
    console.table(expenses.rows);
    
    const customers = await pool.query('SELECT "id", "name", "createdAt" FROM customers');
    console.log('\n--- CUSTOMERS ---');
    console.table(customers.rows.slice(0, 10));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkData();
