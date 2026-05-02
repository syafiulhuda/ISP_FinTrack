import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  user: process.env.DATABASE_USER || process.env.POSTGRES_USER,
  host: process.env.DATABASE_HOST || process.env.POSTGRES_HOST,
  database: process.env.DATABASE_NAME || process.env.POSTGRES_DATABASE,
  password: process.env.DATABASE_PASSWORD || process.env.POSTGRES_PASSWORD,
  port: parseInt(process.env.DATABASE_PORT || process.env.POSTGRES_PORT || '5432'),
});

async function listAdmins() {
  try {
    const res = await pool.query("SELECT nama, email, role FROM admin");
    console.log("\n--- Registered Admin Users ---");
    res.rows.forEach((user, i) => {
      console.log(`${i + 1}. ${user.nama} (${user.email}) - Role: ${user.role}`);
    });
    console.log("------------------------------\n");
  } catch (err) {
    console.error("Error listing admins:", err);
  } finally {
    await pool.end();
  }
}

listAdmins();
