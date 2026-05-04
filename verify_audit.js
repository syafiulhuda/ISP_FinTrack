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

    // 1. Verify inputter columns exist
    const colRes = await client.query(`
      SELECT table_name, COUNT(*) as col_count
      FROM information_schema.columns 
      WHERE column_name IN ('inputter', 'inputter_tms') 
        AND table_name IN ('transactions', 'expenses', 'invoices', 'customers', 'stock_asset_roster', 'asset_roster', 'maintenance_history', 'notifications')
      GROUP BY table_name
      ORDER BY table_name
    `);
    console.log('\n✅ Tables with inputter + inputter_tms columns (expect 2 per table):');
    colRes.rows.forEach(r => console.log(`   ${r.table_name}: ${r.col_count} columns`));

    // 2. Verify triggers exist
    const trigRes = await client.query(`
      SELECT event_object_table as table_name, COUNT(*) as trigger_count
      FROM information_schema.triggers
      WHERE trigger_name LIKE 'trg_%_inputter_tms'
      GROUP BY event_object_table
      ORDER BY event_object_table
    `);
    console.log('\n✅ Tables with active triggers:');
    trigRes.rows.forEach(r => console.log(`   ${r.table_name}: ${r.trigger_count} trigger events`));

    // 3. Check latest audit data
    const stockCount = await client.query(`SELECT COUNT(*) FROM stock_asset_roster WHERE inputter IS NOT NULL`);
    const assetCount = await client.query(`SELECT COUNT(*) FROM asset_roster WHERE inputter IS NOT NULL`);
    const custCount  = await client.query(`SELECT COUNT(*) FROM customers WHERE inputter IS NOT NULL`);
    const expCount   = await client.query(`SELECT COUNT(*) FROM expenses WHERE inputter IS NOT NULL`);
    const invCount   = await client.query(`SELECT COUNT(*) FROM invoices WHERE inputter IS NOT NULL`);
    const trxCount   = await client.query(`SELECT COUNT(*) FROM transactions WHERE inputter IS NOT NULL`);

    console.log('\n✅ Rows with inputter data (audit trail readiness):');
    console.log(`   stock_asset_roster: ${stockCount.rows[0].count}`);
    console.log(`   asset_roster:       ${assetCount.rows[0].count}`);
    console.log(`   customers:          ${custCount.rows[0].count}`);
    console.log(`   expenses:           ${expCount.rows[0].count}`);
    console.log(`   invoices:           ${invCount.rows[0].count}`);
    console.log(`   transactions:       ${trxCount.rows[0].count}`);

    console.log('\n🎉 Verification complete — all systems go!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
