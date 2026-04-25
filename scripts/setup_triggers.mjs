import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env.local') });
dotenv.config({ path: join(__dirname, '../.env') });

const pool = new pg.Pool({
  user: process.env.DATABASE_USER,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
});

async function setup() {
  try {
    console.log('Setting up automated notification triggers...');
    
    await pool.query(`
      CREATE OR REPLACE FUNCTION notify_asset_condition() RETURNS TRIGGER AS $$
      BEGIN
        -- Hanya buat notifikasi jika kondisi bukan 'Good' DAN Kepemilikan adalah 'Dimiliki'
        IF (NEW.condition != 'Good' AND (NEW.kepemilikan = 'Dimiliki' OR NEW.kepemilikan IS NULL)) THEN
          INSERT INTO notifications (category, title, message, type, is_unread, action_label)
          VALUES (
            'Inventory',
            'Hardware ' || NEW.sn || ' reported ' || LOWER(NEW.condition),
            'Asset type ' || NEW.type || ' at ' || NEW.location || ' requires attention. Condition: ' || NEW.condition,
            'hardware',
            true,
            CASE 
              WHEN NEW.condition = 'Broken' THEN 'Schedule Dispatch' 
              WHEN NEW.condition = 'Warning' THEN 'Schedule Dispatch'
              ELSE 'Log Maintenance' 
            END
          );
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 2. Function for Transactions (Finance)
    await pool.query(`
      CREATE OR REPLACE FUNCTION notify_new_transaction() RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO notifications (category, title, message, type, is_unread, action_label)
        VALUES (
          'Finance',
          'New transaction detected',
          'Incoming payment of ' || NEW.amount || ' via ' || NEW.method || ' has been logged.',
          'transaction',
          true,
          'View Details'
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 3. Create Triggers
    await pool.query(`DROP TRIGGER IF EXISTS trg_asset_notification ON asset_roster;`);
    await pool.query(`
      CREATE TRIGGER trg_asset_notification
      AFTER INSERT OR UPDATE ON asset_roster
      FOR EACH ROW
      EXECUTE FUNCTION notify_asset_condition();
    `);

    await pool.query(`DROP TRIGGER IF EXISTS trg_transaction_notification ON transactions;`);
    await pool.query(`
      CREATE TRIGGER trg_transaction_notification
      AFTER INSERT ON transactions
      FOR EACH ROW
      EXECUTE FUNCTION notify_new_transaction();
    `);

    console.log('Automated triggers successfully established!');
  } catch (err) {
    console.error('Error setting up triggers:', err.message);
  } finally {
    await pool.end();
  }
}

setup();
