
const { Client } = require('pg');
const client = new Client({
  connectionString: "postgresql://postgres:msh456@localhost:5432/clients"
});

async function cleanData() {
  await client.connect();
  console.log("Connected to DB");
  
  const queries = [
    "UPDATE transactions SET type = 'Maintenance' WHERE type = 'Maintenis'",
    "UPDATE transactions SET type = 'Hardware' WHERE type = 'Beli Hardware'",
    "UPDATE transactions SET type = 'Utilitas' WHERE type = 'Listrik & Utilities'",
    "UPDATE transactions SET type = 'Sewa' WHERE type = 'Sewa Infrastruktur'",
    "UPDATE expenses SET category = 'Maintenance' WHERE category = 'Maintenis'",
    "UPDATE expenses SET category = 'Hardware' WHERE category = 'Beli Hardware'",
    "UPDATE expenses SET category = 'Utilitas' WHERE category = 'Listrik & Utilities'",
    "UPDATE expenses SET category = 'Sewa' WHERE category = 'Sewa Infrastruktur'"
  ];

  for (let q of queries) {
    const res = await client.query(q);
    console.log(`Executed: ${q} - Rows affected: ${res.rowCount}`);
  }

  await client.end();
}

cleanData().catch(console.error);
