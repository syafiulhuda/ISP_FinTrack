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
      'admin', 
      'expenses', 
      'invoices', 
      'login_logs', 
      'maintenance_history', 
      'notifications', 
      'ocr_data', 
      'stock_asset_roster',
      'asset_roster',
      'customers',
      'transactions'
    ];

    for (const table of tables) {
      try {
        // Change column type to TIMESTAMP WITH TIME ZONE
        await client.query(`ALTER TABLE "${table}" ALTER COLUMN inputter_tms TYPE TIMESTAMP WITH TIME ZONE USING inputter_tms AT TIME ZONE 'Asia/Jakarta'`);
        console.log(`Standardized inputter_tms in: ${table}`);
      } catch (e) {
        console.error(`Error standardizing ${table}:`, e.message);
      }
    }

  } catch (error) {
    console.error("Connection error:", error);
  } finally {
    await client.end();
  }
}

run();
