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

async function migrate() {
  try {
    console.log('Adding image column...');
    await pool.query(`ALTER TABLE admin ADD COLUMN IF NOT EXISTS image TEXT;`);
    
    console.log('Setting default image...');
    await pool.query(`UPDATE admin SET image = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAy5r20WVyuBCP6PIyl_WPdUNTOTLej17KRtvHSMhKkmw3XuvRxGquW9NQ7nL1YHK2ckLqfapVp4_3uLUkVNw5iP6LhThAAxHVLg2XMTKCoV5L9JsS-amXXtKCOWVLzMs29k1mHmq6SVCLVAQXzCifNQ93nAZ9Kla__kM7nbiY4R_vtpyT6r9en0Wa_A69W0YZxjzxE7p_x7B-sJfVfarpqrFbo2qgXbuK3unH5TREs7WhJEgFjRsvLWk-ZSbJb_MQwrA9_bw4lNaw' WHERE email = 'admin@company.com';`);
    
    console.log('Migration successful!');
  } catch (err) {
    console.error('Error migrating database:', err);
  } finally {
    await pool.end();
  }
}

migrate();
