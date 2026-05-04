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
    console.log("Connected to database");

    const tables = [
      'admin', 'expenses', 'invoices', 'login_logs', 
      'maintenance_history', 'notifications', 'ocr_data', 'stock_asset_roster'
    ];

    for (const table of tables) {
      try {
        await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS inputter VARCHAR(255);`);
        await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS inputter_tms TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
        console.log(`Added inputter & inputter_tms to: ${table}`);
      } catch (e) {
        console.log(`Error updating ${table}:`, e.message);
      }
    }
  } catch (error) {
    console.error("Connection error:", error);
  } finally {
    await client.end();
  }
}

run();
