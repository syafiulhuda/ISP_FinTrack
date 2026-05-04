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
      'warehouse_location'
    ];

    for (const table of tables) {
      try {
        // Fix sequence by finding the max ID and setting the next value to max+1
        const res = await client.query(`
          SELECT setval(pg_get_serial_sequence($1, 'id'), coalesce(max(id), 1), true) 
          FROM "${table}"
        `, [table]);
        console.log(`Updated sequence for ${table}: ${res.rows[0].setval}`);
      } catch (e) {
        console.log(`Failed to update sequence for ${table}: ${e.message}`);
      }
    }

  } catch (error) {
    console.error("Connection error:", error);
  } finally {
    await client.end();
  }
}

run();
