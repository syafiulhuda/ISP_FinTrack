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

    // Find ALL triggers on transactions table + their function source
    const res = await client.query(`
      SELECT 
        t.trigger_name,
        t.event_manipulation,
        t.action_timing,
        p.proname as function_name,
        pg_get_functiondef(p.oid) as function_body
      FROM information_schema.triggers t
      JOIN pg_trigger pt ON pt.tgname = t.trigger_name
      JOIN pg_proc p ON p.oid = pt.tgfoid
      WHERE t.event_object_table = 'transactions'
      ORDER BY t.trigger_name, t.event_manipulation
    `);

    console.log(`Found ${res.rows.length} trigger events on 'transactions':\n`);
    res.rows.forEach(r => {
      console.log(`── Trigger: ${r.trigger_name} (${r.action_timing} ${r.event_manipulation})`);
      console.log(`   Function: ${r.function_name}`);
      console.log(`   Body:\n${r.function_body}\n`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
