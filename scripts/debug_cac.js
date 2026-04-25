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

async function debug() {
  try {
    const now = new Date();
    // THE PROMPT SAYS IT'S 2026-04-23. Let's force it to April 2026 for testing if system clock is different.
    const month = 3; // April is 3 (0-indexed)
    const year = 2026;

    console.log(`Debugging for Month: ${month}, Year: ${year}`);

    const customers = await pool.query('SELECT * FROM customers');
    const newCustomers = customers.rows.filter(c => {
      const d = new Date(c.createdAt || c.created_at);
      return d.getMonth() === month && d.getFullYear() === year;
    });
    console.log(`Found ${newCustomers.length} new customers in April 2026`);
    newCustomers.forEach(c => console.log(` - ${c.name} (${c.createdAt})`));

    const expenses = await pool.query("SELECT * FROM expenses WHERE category = 'Marketing'");
    const marketingExpenses = expenses.rows.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });
    console.log(`Found ${marketingExpenses.length} marketing expenses in April 2026`);
    marketingExpenses.forEach(e => console.log(` - ${e.description}: Rp ${e.amount} (${e.date})`));

  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

debug();
