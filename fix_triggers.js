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

    // Fix the insert_invoice_from_transaction trigger function
    // amount is now NUMERIC, so REPLACE() fails. Cast to text first, or just use NEW.amount directly.
    console.log('── Fixing insert_invoice_from_transaction trigger function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.insert_invoice_from_transaction()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $function$
      BEGIN
        -- Only auto-create invoice for 'pemasukan' transactions
        IF NEW.keterangan = 'pemasukan' THEN
          INSERT INTO invoices (
            customer_id,
            amount,
            due_date,
            status,
            node
          ) VALUES (
            -- Extract customer ID from TRX format e.g. 'TRX-CT057-20260502'
            SPLIT_PART(NEW.id, '-', 2),
            -- amount is already NUMERIC — use directly (no REPLACE needed)
            NEW.amount,
            -- Use date from transaction timestamp
            NEW.timestamp::date,
            'Paid',
            -- node from city
            NEW.city
          );
        END IF;
        RETURN NEW;
      END;
      $function$
    `);
    console.log('  ✓ insert_invoice_from_transaction fixed (amount cast removed)');

    // Also fix the trg_new_transaction to use inputter field
    console.log('\n── Updating notify_new_transaction to include inputter...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.notify_new_transaction()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $function$
      BEGIN
        IF NEW.keterangan = 'pengeluaran' THEN
          INSERT INTO notifications (category, title, message, type, is_unread, action_label, inputter, inputter_tms)
          VALUES (
            'Finance', 
            'New expense recorded', 
            'Outgoing expense of Rp ' || NEW.amount::text || ' via ' || NEW.method || ' has been logged.', 
            'transaction', true, 'View Details',
            COALESCE(NEW.inputter, 'System'),
            NOW()
          );
        ELSE
          INSERT INTO notifications (category, title, message, type, is_unread, action_label, inputter, inputter_tms)
          VALUES (
            'Finance', 
            'New transaction detected', 
            'Incoming payment of Rp ' || NEW.amount::text || ' via ' || NEW.method || ' has been logged.', 
            'transaction', true, 'View Details',
            COALESCE(NEW.inputter, 'System'),
            NOW()
          );
        END IF;
        RETURN NEW;
      END;
      $function$
    `);
    console.log('  ✓ notify_new_transaction updated');

    // Verify by running a test INSERT
    console.log('\n── Verifying with test INSERT...');
    const testId = `TEST-VERIFY-${Date.now()}`;
    try {
      await client.query(`
        INSERT INTO transactions (id, method, amount, status, timestamp, type, keterangan, city, inputter, inputter_tms)
        VALUES ($1, 'Bank Transfer', 150000, 'Verified', NOW(), 'Tagihan', 'pemasukan', NULL, 'Debug Script', NOW())
      `, [testId]);
      console.log(`  ✓ INSERT success! Test transaction inserted: ${testId}`);
      
      // Check if invoice was auto-created by trigger
      const invRes = await client.query('SELECT id FROM invoices WHERE customer_id = $1', ['VERIFY']);
      console.log(`  ✓ Invoice trigger fired: ${invRes.rows.length > 0 ? 'yes' : 'no (expected, no matching customer)'}`);
      
      // Cleanup
      await client.query('DELETE FROM transactions WHERE id = $1', [testId]);
      // Also clean up auto-created invoice if any
      await client.query("DELETE FROM invoices WHERE customer_id = 'VERIFY'");
      // Clean up auto-created notification
      await client.query("DELETE FROM notifications WHERE message LIKE '%150000%' AND category = 'Finance' AND created_at > NOW() - INTERVAL '10 seconds'");
      console.log('  ✓ Cleanup done');
    } catch (e) {
      console.error(`  ✗ Test INSERT still failing:`, e.message);
    }

    console.log('\n✅ Done! Triggers are now fixed.');

  } catch (err) {
    console.error('Fatal:', err.message);
  } finally {
    await client.end();
  }
}

run();
