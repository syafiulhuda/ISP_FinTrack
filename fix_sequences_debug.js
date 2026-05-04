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

    // Get table info to see sequence
    const colRes = await client.query(`
      SELECT column_default 
      FROM information_schema.columns 
      WHERE table_name = 'stock_asset_roster' AND column_name = 'id'
    `);
    
    if (colRes.rows.length > 0) {
      const defaultValue = colRes.rows[0].column_default;
      console.log("Default value for id:", defaultValue);
      
      // Try to extract sequence name from "nextval('sequence_name'::regclass)"
      const match = defaultValue?.match(/nextval\('"?([^"']+)"?'/);
      if (match) {
        const seqName = match[1];
        console.log("Found sequence name:", seqName);
        const setRes = await client.query(`SELECT setval($1, (SELECT COALESCE(MAX(id), 0) + 10 FROM stock_asset_roster), false)`, [seqName]);
        console.log("Fixed sequence to:", setRes.rows[0].setval);
      } else {
        console.log("Could not find sequence name in default value.");
      }
    } else {
      console.log("Column 'id' not found in 'stock_asset_roster'.");
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.end();
  }
}

run();
