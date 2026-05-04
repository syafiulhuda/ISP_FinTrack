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

    // Test exact pengeluaran INSERT that app does
    const testId = `OUT-23-20260430`;
    const inputter = 'M Syafiul Huda';

    console.log('1. Checking if OUT-23-20260430 already exists in transactions...');
    const exists = await client.query('SELECT id FROM transactions WHERE id = $1', [testId]);
    console.log('   Exists:', exists.rows.length > 0 ? 'YES (duplicate!)' : 'NO');

    console.log('\n2. Checking unique constraints on transactions.id...');
    const constraints = await client.query(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'transactions'
    `);
    console.log('   Constraints:', constraints.rows);

    console.log('\n3. Testing exact INSERT with purchaseType as type...');
    const testId2 = `OUT-DEBUG-${Date.now()}`;
    try {
      await client.query(`
        INSERT INTO transactions (id, method, amount, status, timestamp, type, keterangan, city, inputter, inputter_tms)
        VALUES ($1, $2, $3, 'Verified', $4, $5, $6, $7, $8, NOW())
      `, [testId2, 'Bank Transfer', 5000000, '04/05/2026', 'Server', 'pengeluaran', 'Jakarta Pusat', inputter]);
      console.log('   ✓ INSERT succeeded:', testId2);
      await client.query('DELETE FROM transactions WHERE id = $1', [testId2]);
      // Clean up auto-created notification
      await client.query("DELETE FROM notifications WHERE message LIKE '%5000000%' AND created_at > NOW() - INTERVAL '10 seconds'");
      console.log('   ✓ Cleanup done');
    } catch (e) {
      console.error('   ✗ INSERT FAILED:', e.message);
      // If it's the notification INSERT, show detail
      console.error('   Detail:', e.detail || e.hint || '');
    }

    console.log('\n4. Check notifications for any constraint...');
    const notifConstraints = await client.query(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'notifications'
    `);
    console.log('   Notification constraints:', notifConstraints.rows);

  } catch (err) {
    console.error('Fatal:', err.message);
  } finally {
    await client.end();
  }
}
run();
