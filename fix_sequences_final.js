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

    // Try multiple sequence naming patterns for stock_asset_roster
    const sequences = ['stock_asset_roster_id_seq', 'stock_asset_roster_id_serial', 'stock_asset_roster_id_key'];
    
    for (const seq of sequences) {
      try {
        await client.query(`SELECT setval($1, (SELECT COALESCE(MAX(id), 0) + 10 FROM stock_asset_roster), false)`, [seq]);
        console.log(`Successfully fixed sequence: ${seq}`);
        break; 
      } catch (e) {
        console.log(`Sequence ${seq} not found, trying next...`);
      }
    }

  } catch (error) {
    console.error("Connection error:", error);
  } finally {
    await client.end();
  }
}

run();
