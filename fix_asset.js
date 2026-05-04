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

    await client.query('BEGIN');

    // Manually jump sequence
    await client.query("SELECT setval('stock_asset_roster_id_seq', 1000)");

    // 1. Delete from asset_roster
    const delRes = await client.query('DELETE FROM asset_roster WHERE sn = $1 RETURNING *', ['ODP-004']);
    
    if (delRes.rows.length > 0) {
      const a = delRes.rows[0];
      // 2. Delete from stock_asset_roster if exists
      await client.query('DELETE FROM stock_asset_roster WHERE sn = $1', [a.sn]);
      
      // 3. Insert into stock_asset_roster
      await client.query(`
        INSERT INTO stock_asset_roster (
          sn, mac, type, location, condition, color, 
          latitude, longitude, status, kepemilikan, 
          tanggal_perubahan, is_used, inputter, inputter_tms
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Offline', $9, NOW(), false, $10, NOW())
      `, [a.sn, a.mac, a.type, a.location, a.condition, a.color, a.latitude, a.longitude, a.kepemilikan, 'System Admin']);
      console.log("Successfully moved ODP-004 to stock_asset_roster with Offline status.");
    }

    await client.query('COMMIT');
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error("Error:", error);
  } finally {
    await client.end();
  }
}

run();
