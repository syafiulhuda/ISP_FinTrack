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
    console.log('Connected\n');

    // 1. Check column types of transactions
    const colRes = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'transactions'
      ORDER BY ordinal_position
    `);
    console.log('── transactions columns:');
    colRes.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} (nullable: ${r.is_nullable})`));

    // 2. Check column types of expenses
    const expColRes = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'expenses'
      ORDER BY ordinal_position
    `);
    console.log('\n── expenses columns:');
    expColRes.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} (nullable: ${r.is_nullable})`));

    // 3. Try a test INSERT into transactions
    console.log('\n── Testing INSERT into transactions...');
    try {
      const testId = `TEST-${Date.now()}`;
      await client.query(`
        INSERT INTO transactions (id, method, amount, status, timestamp, type, keterangan, city, inputter, inputter_tms)
        VALUES ($1, $2, $3, 'Verified', NOW(), $4, $5, $6, $7, NOW())
      `, [testId, 'Bank Transfer', 100000, 'Test', 'pemasukan', null, 'Debug Script']);
      console.log(`  ✓ INSERT success with id: ${testId}`);
      
      // Clean up
      await client.query('DELETE FROM transactions WHERE id = $1', [testId]);
      console.log(`  ✓ Cleanup done`);
    } catch (e) {
      console.error(`  ✗ INSERT FAILED:`, e.message);
    }

    // 4. Try a test INSERT into expenses
    console.log('\n── Testing INSERT into expenses...');
    try {
      const expRes = await client.query(`
        INSERT INTO expenses (category, amount, date, description, city, inputter, inputter_tms)
        VALUES ($1, $2, NOW(), $3, $4, $5, NOW())
        RETURNING id
      `, ['Test', 50000, 'debug-test', null, 'Debug Script']);
      console.log(`  ✓ INSERT success with id: ${expRes.rows[0].id}`);
      await client.query('DELETE FROM expenses WHERE id = $1', [expRes.rows[0].id]);
      console.log(`  ✓ Cleanup done`);
    } catch (e) {
      console.error(`  ✗ INSERT FAILED:`, e.message);
    }

    // 5. Check latest 3 rows in transactions
    console.log('\n── Latest 3 transactions:');
    const latestRes = await client.query('SELECT id, keterangan, inputter, timestamp FROM transactions ORDER BY timestamp DESC LIMIT 3');
    latestRes.rows.forEach(r => console.log(`  id=${r.id}, keterangan=${r.keterangan}, inputter=${r.inputter}`));
    if (latestRes.rows.length === 0) console.log('  (no rows)');

  } catch (err) {
    console.error('Fatal:', err.message);
  } finally {
    await client.end();
  }
}

run();
