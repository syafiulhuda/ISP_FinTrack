import pg from 'pg';

async function test() {
  const pool = new pg.Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'clients',
    password: 'msh456',
    port: 5432,
  });

  const resTx = await pool.query("SELECT * FROM transactions");
  const resCust = await pool.query("SELECT * FROM customers");
  const resExp = await pool.query("SELECT * FROM expenses");

  const transactions = resTx.rows.map(r => ({
    ...r,
    amount: r.amount || 'Rp 0',
    numericAmount: parseInt(r.amount?.replace(/[^0-9]/g, '') || '0'),
    timestamp: r.timestamp ? new Date(r.timestamp).toISOString() : new Date().toISOString()
  }));

  const customerList = resCust.rows;
  const expenseList = resExp.rows.map(r => ({
    ...r,
    amount: Number(r.amount)
  }));

  const extractMonth = (dateVal) => {
    if (!dateVal) return "";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal).slice(0, 7);
      return d.toISOString().slice(0, 7);
    } catch (e) {
      return "";
    }
  };

  const monthsWithData = transactions
    .filter(t => t.status === "Verified" && t.keterangan === "pemasukan")
    .map(t => extractMonth(t.timestamp))
    .filter(m => m.match(/^\d{4}-\d{2}$/))
    .sort();

  const latestMonthStr = monthsWithData.length > 0 ? monthsWithData[monthsWithData.length - 1] : "2026-04";

  console.log("latestMonthStr:", latestMonthStr);

  const monthStr = latestMonthStr;

  const txs = transactions.filter(t => t.status === "Verified" && t.keterangan === "pemasukan" && extractMonth(t.timestamp) === monthStr);
  const rev = txs.reduce((sum, t) => sum + (parseInt(String(t.amount || '0').replace(/[^0-9]/g, '')) || 0), 0);
  
  const newCustsInMonth = customerList.filter(c => extractMonth(c.createdAt) === monthStr).length;
  const exps = expenseList.filter(e => extractMonth(e.date) === monthStr);
  const txExps = transactions.filter(t => t.status === "Verified" && t.keterangan === "pengeluaran" && extractMonth(t.timestamp) === monthStr);
  
  const totalExp = 
    exps.reduce((sum, e) => sum + Math.abs(Number(e.amount) || 0), 0) +
    txExps.reduce((sum, t) => sum + (parseInt(String(t.amount || '0').replace(/[^0-9]/g, '')) || 0), 0);
  
  const cac = newCustsInMonth > 0 ? totalExp / newCustsInMonth : 0;

  console.log("Stats:", {
    rev,
    newCustsInMonth,
    expsCount: exps.length,
    txExpsCount: txExps.length,
    totalExp,
    cac
  });

  await pool.end();
}
test();
