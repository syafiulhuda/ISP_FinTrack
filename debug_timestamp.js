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

    // Find the transaction with out-23
    console.log('1. Finding OUT-23-20260430 in transactions:');
    const res = await client.query(`SELECT id, timestamp, keterangan, amount, inputter FROM transactions WHERE id = 'OUT-23-20260430'`);
    console.log('   Result:', res.rows);

    // Check PostgreSQL date style setting
    console.log('\n2. PostgreSQL DateStyle setting:');
    const ds = await client.query('SHOW DateStyle');
    console.log('   DateStyle:', ds.rows[0]);

    // Fix: normalize timestamp to use ISO format in postOcrEntry
    // Test what happens with ISO format
    console.log('\n3. Testing INSERT with ISO timestamp (the fix):');
    const testId = `OUT-FIX-${Date.now()}`;
    const isoTimestamp = new Date('2026-04-30').toISOString(); // same date but ISO
    await client.query(`
      INSERT INTO transactions (id, method, amount, status, timestamp, type, keterangan, city, inputter, inputter_tms)
      VALUES ($1, 'Bank Transfer', 5000000, 'Verified', $2, 'Server', 'pengeluaran', 'Jakarta Pusat', 'M Syafiul Huda', NOW())
    `, [testId, isoTimestamp]);
    const check = await client.query(`SELECT id, timestamp FROM transactions WHERE id = $1`, [testId]);
    console.log('   ✓ ISO timestamp stored as:', check.rows[0]);
    await client.query('DELETE FROM transactions WHERE id = $1', [testId]);
    await client.query("DELETE FROM notifications WHERE message LIKE '%5000000%' AND created_at > NOW() - INTERVAL '30 seconds'");
    console.log('   ✓ Cleanup done');

    // Show the "lost" transactions (old timestamps)
    console.log('\n4. Transactions with old timestamps (before 2026-05-01):');
    const old = await client.query(`SELECT id, timestamp, keterangan, inputter FROM transactions WHERE timestamp < '2026-05-01' ORDER BY timestamp DESC LIMIT 5`);
    console.log('  ', old.rows);

  } catch (err) {
    console.error('Fatal:', err.message);
  } finally {
    await client.end();
  }
}
run();
