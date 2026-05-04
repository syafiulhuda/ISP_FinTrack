const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new Client({
    user: process.env.DATABASE_USER,
    host: process.env.DATABASE_HOST,
    database: process.env.DATABASE_NAME,
    password: process.env.DATABASE_PASSWORD,
    port: parseInt(process.env.DATABASE_PORT || '5432'),
  });
  
  try {
    await client.connect();
    
    console.log("Checking record OUT-25-20260405 after standardization:");
    
    const res1 = await client.query("SELECT id, inputter_tms FROM transactions WHERE id = 'OUT-25-20260405'");
    const res2 = await client.query("SELECT description, inputter_tms FROM expenses WHERE description = 'OUT-25-20260405'");
    
    console.log('Transactions table:', res1.rows[0]);
    console.log('Expenses table:    ', res2.rows[0]);

    // Check schema of expenses again
    const schema = await client.query("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'inputter_tms'");
    console.log('\nExpenses inputter_tms Schema:', schema.rows[0]);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.end();
  }
}

run();
