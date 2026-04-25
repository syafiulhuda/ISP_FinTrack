import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
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

async function run() {
  try {
    const sqlPath = join(__dirname, 'query.pgsql');
    if (!fs.existsSync(sqlPath)) {
      console.error('File query.pgsql not found!');
      return;
    }
    
    const queryText = fs.readFileSync(sqlPath, 'utf8');
    if (!queryText.trim()) {
      console.log('Query file is empty.');
      return;
    }

    console.log('Executing query from query.pgsql...');
    const start = Date.now();
    const res = await pool.query(queryText);
    const end = Date.now();

    console.log(`Query completed in ${end - start}ms`);
    if (res.rows && res.rows.length > 0) {
      console.table(res.rows);
    } else if (res.command) {
      console.log(`Query successful. Command: ${res.command}`);
      if (res.rowCount !== null) console.log(`Affected rows: ${res.rowCount}`);
    } else {
      console.log('Query returned no results.');
    }
  } catch (err) {
    console.error('SQL Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
