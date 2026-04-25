const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables if needed locally (requires dotenv)
try {
  require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
} catch (e) {
  // Ignore if dotenv is not installed
}

const pool = new Pool({
  user: process.env.DATABASE_USER,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
});

async function runSeed() {
  console.log('Menjalankan proses seeding ke database...');
  try {
    const seedFilePath = path.join(__dirname, '../seed.sql');
    const seedSql = fs.readFileSync(seedFilePath, 'utf8');
    
    await pool.query(seedSql);
    console.log('✅ Berhasil melakukan seeding data ke PostgreSQL!');
  } catch (error) {
    console.error('❌ Gagal melakukan seeding:', error);
  } finally {
    await pool.end();
  }
}

runSeed();
