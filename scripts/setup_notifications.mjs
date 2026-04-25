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
    console.log('Creating notifications table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        category VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        is_unread BOOLEAN DEFAULT TRUE,
        action_label VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Seeding notifications...');
    await pool.query(`
      INSERT INTO notifications (category, title, message, type, is_unread, action_label)
      VALUES 
      ('Finance', 'New transaction detected', 'Incoming payment of Rp 1,240,000 from Enterprise Client #882 has been logged into the ledger.', 'transaction', true, 'View Details'),
      ('Finance', 'OCR Verification needed', 'Receipt scan from ''Mega Indah Solusindo'' requires manual review of total amount.', 'ocr', false, 'Launch OCR'),
      ('Inventory', 'Hardware SN-8924 reported faulty', 'Node-X Edge Router at site B-12 reports critical fan failure. Immediate dispatch required.', 'hardware', true, 'Schedule Dispatch'),
      ('System', 'System Backup Completed', 'Weekly financial ledger and inventory snapshot successfully archived to Secure Vault 01.', 'backup', false, null),
      ('System', 'Security Audit Passed', 'Monthly automated security scan finished with 0 critical vulnerabilities found across all active nodes.', 'audit', false, null);
    `);
    
    console.log('Setup successful!');
  } catch (err) {
    console.error('Error setting up notifications:', err);
  } finally {
    await pool.end();
  }
}

setup();
