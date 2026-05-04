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

    // Simulate EXACTLY what postOcrEntry does for "pengeluaran"
    console.log('═══ TEST 1: Simulating pengeluaran flow ═══');
    const data = {
      vendor: 'Test Vendor',
      amount: '500000',
      date: '04/05/2026',
      reference: '',
      method: 'Bank Transfer',
      keterangan: 'pengeluaran',
      purchaseType: 'Lainnya',
      serialNumber: '',
      macNumber: '',
      location: 'Warehouse Main'
    };

    // Same logic as postOcrEntry
    const cleanNumeric = data.amount.replace(/[^0-9.-]+/g, '');
    const finalAmount = Number(cleanNumeric);
    const timestamp = new Date().toISOString();
    const inputterName = 'Debug Test';

    // City lookup
    const cityRes = await client.query('SELECT city FROM warehouse_location WHERE location = $1 LIMIT 1', [data.location]);
    const trxCity = cityRes.rows.length > 0 ? cityRes.rows[0].city : null;
    console.log('  City found:', trxCity);

    // Step 1: Insert expense
    console.log('  Step 1: INSERT INTO expenses...');
    try {
      const expenseRes = await client.query(`
        INSERT INTO expenses (category, amount, date, description, city, inputter, inputter_tms)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id
      `, [data.purchaseType, finalAmount, timestamp, '', trxCity, inputterName]);
      const expenseId = expenseRes.rows[0].id;
      console.log('  ✓ expense inserted, id:', expenseId);

      const trxId = `OUT-${expenseId}-${Date.now()}`;
      await client.query('UPDATE expenses SET description = $1 WHERE id = $2', [trxId, expenseId]);

      // Step 2: Insert transaction
      console.log('  Step 2: INSERT INTO transactions...');
      try {
        await client.query(`
          INSERT INTO transactions (id, method, amount, status, timestamp, type, keterangan, city, inputter, inputter_tms)
          VALUES ($1, $2, $3, 'Verified', $4, $5, $6, $7, $8, NOW())
        `, [trxId, data.method, finalAmount, timestamp, data.purchaseType, 'pengeluaran', trxCity, inputterName]);
        console.log('  ✓ transaction inserted, id:', trxId);
      } catch (e) {
        console.error('  ✗ transactions INSERT FAILED:', e.message);
      }

      // Cleanup
      await client.query('DELETE FROM transactions WHERE id = $1', [trxId]);
      await client.query('DELETE FROM expenses WHERE id = $1', [expenseId]);
      console.log('  ✓ Cleanup done\n');
    } catch (e) {
      console.error('  ✗ expenses INSERT FAILED:', e.message);
    }

    // Simulate EXACTLY what postOcrEntry does for "pemasukan"
    console.log('═══ TEST 2: Simulating pemasukan flow ═══');
    const trxRef = `TRX-CT001-${Date.now()}`;
    console.log('  Using reference:', trxRef);
    const finalAmount2 = 250000;

    console.log('  Step 1: INSERT INTO transactions...');
    try {
      await client.query(`
        INSERT INTO transactions (id, method, amount, status, timestamp, type, keterangan, city, inputter, inputter_tms)
        VALUES ($1, $2, $3, 'Verified', NOW(), $4, $5, $6, $7, NOW())
      `, [trxRef, 'Bank Transfer', finalAmount2, 'Tagihan', 'pemasukan', null, inputterName]);
      console.log('  ✓ transaction inserted, id:', trxRef);
      
      // Check auto-created invoice
      const invCheck = await client.query('SELECT id, customer_id FROM invoices ORDER BY id DESC LIMIT 1');
      if (invCheck.rows.length > 0) {
        console.log('  ✓ Invoice auto-created by trigger:', invCheck.rows[0]);
      }

      // Cleanup
      await client.query('DELETE FROM invoices WHERE customer_id = $1', [trxRef.split('-')[1]]);
      await client.query('DELETE FROM transactions WHERE id = $1', [trxRef]);
      console.log('  ✓ Cleanup done\n');
    } catch (e) {
      console.error('  ✗ transactions INSERT FAILED:', e.message);
    }

    // Check notifications schema
    console.log('═══ CHECK: notifications table columns ═══');
    const notifCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'notifications' 
      ORDER BY ordinal_position
    `);
    console.log('  Columns:', notifCols.rows.map(r => r.column_name).join(', '));

  } catch (err) {
    console.error('Fatal:', err.message);
  } finally {
    await client.end();
  }
}

run();
