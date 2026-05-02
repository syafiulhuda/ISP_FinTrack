import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DATABASE_USER || process.env.POSTGRES_USER,
  host: process.env.DATABASE_HOST || process.env.POSTGRES_HOST,
  database: process.env.DATABASE_NAME || process.env.POSTGRES_DATABASE,
  password: process.env.DATABASE_PASSWORD || process.env.POSTGRES_PASSWORD,
  port: parseInt(process.env.DATABASE_PORT || process.env.POSTGRES_PORT || '5432'),
  ssl: process.env.POSTGRES_URL ? { rejectUnauthorized: false } : false
});

async function createAdmin() {
  const email = 'msyafiulhuda1@gmail.com';
  const password = 'msyafiulhuda1';
  const nama = 'Super Admin';
  const role = 'Admin';
  const department = 'IT & Operations';

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if user exists
    const check = await pool.query('SELECT * FROM admin WHERE email = $1', [email]);
    
    if (check.rows.length > 0) {
      // Update existing user password
      await pool.query(
        'UPDATE admin SET password = $1, nama = $2, role = $3, department = $4 WHERE email = $5',
        [hashedPassword, nama, role, department, email]
      );
      console.log(`Success: Password for ${email} has been reset to: ${password}`);
    } else {
      // Insert new user
      await pool.query(
        'INSERT INTO admin (nama, email, password, role, department) VALUES ($1, $2, $3, $4, $5)',
        [nama, email, hashedPassword, role, department]
      );
      console.log(`Success: New admin created!`);
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
    }
  } catch (err) {
    console.error('Error creating admin:', err);
  } finally {
    await pool.end();
  }
}

createAdmin();
