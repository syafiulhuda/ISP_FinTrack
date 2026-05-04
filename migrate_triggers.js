/**
 * migrate_triggers.js
 * 
 * Creates PostgreSQL trigger functions that auto-populate `inputter_tms`
 * on INSERT for all critical tables. The `inputter` field is set by the
 * application layer (server actions) — triggers only ensure `inputter_tms`
 * is never NULL on INSERT.
 *
 * Run: node migrate_triggers.js
 */

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const TABLES_WITH_INPUTTER = [
  'admin',
  'expenses',
  'invoices',
  'login_logs',
  'maintenance_history',
  'notifications',
  'ocr_data',
  'stock_asset_roster',
  'asset_roster',
  'customers',
  'transactions',
];

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
    console.log('Connected to database\n');

    // ── Step 1: Ensure all tables have the inputter columns ──────────────────
    console.log('── Step 1: Adding missing columns ──');
    for (const table of TABLES_WITH_INPUTTER) {
      try {
        await client.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS inputter VARCHAR(255)`);
        await client.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS inputter_tms TIMESTAMP WITH TIME ZONE`);
        console.log(`  ✓ ${table}: columns ensured`);
      } catch (e) {
        console.error(`  ✗ ${table}: ${e.message}`);
      }
    }

    // ── Step 2: Create shared trigger function ────────────────────────────────
    console.log('\n── Step 2: Creating trigger function ──');
    await client.query(`
      CREATE OR REPLACE FUNCTION fn_set_inputter_tms()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Only set inputter_tms if not already provided
        IF NEW.inputter_tms IS NULL THEN
          NEW.inputter_tms := NOW();
        END IF;
        -- If inputter is NULL on INSERT, set a default
        IF TG_OP = 'INSERT' AND NEW.inputter IS NULL THEN
          NEW.inputter := 'System';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('  ✓ fn_set_inputter_tms() created/updated');

    // ── Step 3: Attach trigger to each table ──────────────────────────────────
    console.log('\n── Step 3: Attaching triggers ──');
    for (const table of TABLES_WITH_INPUTTER) {
      const triggerName = `trg_${table}_inputter_tms`;
      try {
        // Drop existing trigger first to avoid conflicts
        await client.query(`DROP TRIGGER IF EXISTS "${triggerName}" ON "${table}"`);
        // Create BEFORE INSERT OR UPDATE trigger
        await client.query(`
          CREATE TRIGGER "${triggerName}"
          BEFORE INSERT OR UPDATE ON "${table}"
          FOR EACH ROW
          EXECUTE FUNCTION fn_set_inputter_tms();
        `);
        console.log(`  ✓ ${table}: trigger attached`);
      } catch (e) {
        console.error(`  ✗ ${table}: ${e.message}`);
      }
    }

    // ── Step 4: Verify ────────────────────────────────────────────────────────
    console.log('\n── Step 4: Verification ──');
    const verifyRes = await client.query(`
      SELECT trigger_name, event_object_table as table_name
      FROM information_schema.triggers
      WHERE trigger_name LIKE 'trg_%_inputter_tms'
      ORDER BY event_object_table
    `);
    console.log(`  ✓ ${verifyRes.rows.length} triggers active:`);
    verifyRes.rows.forEach(r => console.log(`    - ${r.table_name}: ${r.trigger_name}`));

    console.log('\n✅ Migration complete!');

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await client.end();
  }
}

run();
