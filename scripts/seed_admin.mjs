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

async function seed() {
  try {
    console.log('Creating admin table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin (
        id SERIAL PRIMARY KEY,
        nama VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(100) NOT NULL,
        department VARCHAR(100) NOT NULL
      );
    `);
    
    console.log('Inserting default admin...');
    await pool.query(`
      INSERT INTO admin (nama, email, password, role, department)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE 
      SET nama = EXCLUDED.nama,
          role = EXCLUDED.role,
          department = EXCLUDED.department,
          password = EXCLUDED.password;
    `, ['Alex Rivera', 'admin@company.com', 'admin', 'Senior Administrator', 'Infrastructure & Ops']);
    
    console.log('Successfully seeded admin table!');
  } catch (err) {
    console.error('Error seeding admin table:', err);
  } finally {
    await pool.end();
  }
}

seed();
