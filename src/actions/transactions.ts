'use server';

import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import * as Mock from '@/lib/mockData';
import { Transaction, OcrData, Invoice } from '@/types';
import { getAdminProfile } from './admin';

export async function getTransactions(): Promise<(Transaction & { numericAmount?: number })[]> {
  try {
    const res = await query(`
      SELECT 
        COALESCE(c.id, e.id::text) as linked_id,
        t.*
      FROM transactions t
      LEFT JOIN customers c ON split_part(t.id, '-', 2) = c.id
      LEFT JOIN expenses e ON split_part(t.id, '-', 2) = e.id::text
      ORDER BY t.timestamp DESC
    `);
    
    const data = res.rows.length > 0 ? res.rows : [...Mock.MOCK_TRANSACTIONS].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return data.map(r => ({
      ...r,
      amount: r.amount !== null ? Number(r.amount) : 0,
      numericAmount: r.amount !== null ? Number(r.amount) : 0,
      timestamp: r.timestamp ? new Date(r.timestamp).toISOString() : new Date().toISOString()
    })) as (Transaction & { numericAmount?: number })[];
  } catch (e) {
    console.error("DB Error: getTransactions", e);
    return Mock.MOCK_TRANSACTIONS.map(r => ({
      ...r,
      numericAmount: Number(String(r.amount).replace(/[^0-9.-]+/g,"")),
    })) as (Transaction & { numericAmount?: number })[];
  }
}

export async function getInvoices(): Promise<Invoice[]> {
  try {
    const res = await query('SELECT * FROM invoices ORDER BY id DESC');
    return res.rows as Invoice[];
  } catch (e) {
    console.error("DB Error: getInvoices", e);
    return [];
  }
}

export async function getExpenses() {
  try {
    const res = await query('SELECT * FROM expenses ORDER BY date DESC');
    return res.rows.length > 0 ? res.rows.map(row => ({
      ...row,
      amount: Number(row.amount)
    })) : Mock.MOCK_EXPENSES;
  } catch (e) {
    console.error("DB Error: getExpenses", e);
    return Mock.MOCK_EXPENSES;
  }
}

export async function getOcrData(): Promise<OcrData> {
  try {
    const res = await query('SELECT * FROM ocr_data LIMIT 1');
    return res.rows[0] as OcrData || Mock.MOCK_OCR as OcrData;
  } catch (e) {
    console.error("DB Error: getOcrData", e);
    return Mock.MOCK_OCR as OcrData;
  }
}

export async function updateOcrData(id: string | number, data: { vendor: string, date: string, amount: string, reference: string }) {
  try {
    const res = await query(`
      UPDATE ocr_data 
      SET vendor = $1, date = $2, amount = $3, reference = $4
      WHERE id = $5
      RETURNING *
    `, [data.vendor, data.date, data.amount, data.reference, id]);
    revalidatePath('/finance');
    return res.rows[0];
  } catch (e) {
    console.error("DB Error: updateOcrData", e);
    return null;
  }
}

export async function postOcrEntry(ocrId: string | number, data: { 
  vendor: string, 
  amount: string, 
  date: string, 
  reference: string, 
  method: string, 
  keterangan?: string,
  purchaseType?: string,
  serialNumber?: string,
  macNumber?: string,
  location?: string
}) {
  try {
    let sanitizedDate = data.date;
    const monthsId: Record<string, string> = {
      'Jan': 'Jan', 'Feb': 'Feb', 'Mar': 'Mar', 'Apr': 'Apr', 'Mei': 'May', 
      'Jun': 'Jun', 'Jul': 'Jul', 'Agu': 'Aug', 'Ags': 'Aug', 'Sep': 'Sep', 
      'Okt': 'Oct', 'Nov': 'Nov', 'Des': 'Dec'
    };
    
    Object.keys(monthsId).forEach(key => {
      sanitizedDate = sanitizedDate.replace(key, monthsId[key]);
    });
    
    const timestamp = isNaN(Date.parse(sanitizedDate)) ? new Date().toISOString() : sanitizedDate;

    try {
      await query(`SELECT setval(pg_get_serial_sequence('notifications', 'id'), (SELECT MAX(id) FROM notifications))`);
    } catch (seqError) {
      console.warn("Sequence sync skipped or failed (might be non-serial):", seqError);
    }

    const cleanNumeric = data.amount.replace(/[^0-9.-]+/g, '');
    const finalAmount = Number(cleanNumeric);

    // Get the current admin for audit trail
    const profile = await getAdminProfile();
    const inputterName = profile.fullName || 'Unknown Admin';

    let trxCity = '';
    const cleanLoc = (data.location || '').replace(/©/g, '').trim();
    if (data.keterangan === 'pengeluaran' && cleanLoc) {
      try {
        const cityRes = await query('SELECT city FROM warehouse_location WHERE location = $1 LIMIT 1', [cleanLoc]);
        if (cityRes.rows.length > 0) {
          trxCity = cityRes.rows[0].city;
        }
      } catch (e) {
        console.warn("City lookup failed:", e);
      }
    }

    let trxId = '';

    if (data.keterangan === 'pengeluaran') {
      const transactionType = data.purchaseType || 'Lainnya';
      const expenseRes = await query(`
        INSERT INTO expenses (category, amount, date, description, city, inputter, inputter_tms)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id
      `, [transactionType, Number(cleanNumeric), timestamp, '', trxCity || null, inputterName]);

      const expenseId = expenseRes.rows[0].id;

      // Derive date suffix from ACTUAL transaction date, not from reference
      const tsDate = isNaN(Date.parse(timestamp)) ? new Date() : new Date(timestamp);
      const datePart = tsDate.getFullYear().toString() +
        String(tsDate.getMonth() + 1).padStart(2, '0') +
        String(tsDate.getDate()).padStart(2, '0');
      trxId = `OUT-${expenseId}-${datePart}`;

      await query('UPDATE expenses SET description = $1 WHERE id = $2', [trxId, expenseId]);

      await query(`
        INSERT INTO transactions (id, method, amount, status, timestamp, type, keterangan, city, inputter, inputter_tms)
        VALUES ($1, $2, $3, 'Verified', $4, $5, $6, $7, $8, NOW())
      `, [trxId, data.method, finalAmount, timestamp, transactionType, 'pengeluaran', trxCity || null, inputterName]);

    } else {
      trxId = data.reference || `TRX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      await query(`
        INSERT INTO transactions (id, method, amount, status, timestamp, type, keterangan, city, inputter, inputter_tms)
        VALUES ($1, $2, $3, 'Verified', $4, $5, $6, $7, $8, NOW())
      `, [trxId, data.method, finalAmount, timestamp, 'Tagihan', 'pemasukan', null, inputterName]);

      // NOTE: Invoice is auto-created by DB trigger insert_invoice_from_transaction
    }

    const equipmentTypes = ['ONT', 'SERVER', 'ODP', 'OLT'];
    if (data.keterangan === 'pengeluaran' && data.purchaseType && equipmentTypes.includes(data.purchaseType.toUpperCase())) {
      const cleanLocation = cleanLoc || 'Warehouse Main';
      const locationCoords: Record<string, { lat: string, long: string }> = {
        'Warehouse Main': { lat: '-6.2088', long: '106.8166' },
        'Warehouse South': { lat: '-8.4095', long: '115.1889' },
        'Warehouse East': { lat: '-3.1317', long: '130.0577' },
        'Warehouse West': { lat: '3.3537', long: '97.5727' },
        'Warehouse North': { lat: '1.8519', long: '106.9461' }
      };

      const coords = locationCoords[cleanLocation] || locationCoords['Warehouse Main'];
      const cleanMac = (data.macNumber || '-').replace(/©/g, '').trim();
      const cleanSn = (data.serialNumber || '-').replace(/©/g, '').trim();

      const now = new Date();
      const tzOffset = '+07';
      const pgTimestamp = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + ' ' +
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0') + ':' +
        String(now.getSeconds()).padStart(2, '0') + '.' +
        String(now.getMilliseconds()).padStart(3, '0') + '000' + tzOffset;

      const stockIdRes = await query('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM stock_asset_roster');
      const nextStockId = stockIdRes.rows[0].next_id;

      await query(`
        INSERT INTO stock_asset_roster (
          id, sn, mac, type, location, condition, status, kepemilikan, is_used, latitude, longitude, tanggal_perubahan, inputter, inputter_tms
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      `, [
        nextStockId, 
        cleanSn,
        cleanMac,
        data.purchaseType, 
        cleanLocation, 
        'Good', 
        'Offline', 
        'Dimiliki', 
        false, 
        coords.lat, 
        coords.long, 
        pgTimestamp,
        inputterName
      ]);
    }

    revalidatePath('/finance');
    revalidatePath('/assets');
    revalidatePath('/inventory');
    return { success: true, trxId };
  } catch (e) {
    console.error("DB Error: postOcrEntry", e);
    return { success: false, error: (e as Error).message };
  }
}

export async function getRevenueGrowthTrend() {
  try {
    const res = await query(`
      WITH MonthlyRevenue AS (
          SELECT 
              TO_CHAR(timestamp, 'YYYY-MM') as month,
              SUM(amount) as revenue
          FROM transactions
          WHERE status = 'Verified' AND keterangan = 'pemasukan'
          GROUP BY 1
      ),
      MonthlyExpenses AS (
          SELECT 
              TO_CHAR(timestamp, 'YYYY-MM') as month,
              SUM(amount) as expense
          FROM transactions
          WHERE status = 'Verified' AND keterangan = 'pengeluaran'
          GROUP BY 1
      ),
      AggregatedExpenses AS (
          SELECT month, SUM(expense) as total_expense
          FROM MonthlyExpenses
          GROUP BY 1
      )
      SELECT 
          COALESCE(r.month, e.month) as "Month",
          COALESCE(r.revenue, 0) as "Revenue",
          COALESCE(e.total_expense, 0) as "Expenses"
      FROM MonthlyRevenue r
      FULL OUTER JOIN AggregatedExpenses e ON r.month = e.month
      ORDER BY "Month" ASC
      LIMIT 6
    `);
    
    if (res.rows.length === 0) return [];

    const rawData = res.rows.map(row => ({
      monthKey: row.Month,
      revenue: Number(row.Revenue),
      expenses: Number(row.Expenses)
    }));

    const filledData = [];
    if (rawData.length > 0) {
      const firstMonth = new Date(rawData[0].monthKey + '-01');
      const lastMonth = new Date(rawData[rawData.length - 1].monthKey + '-01');
      
      let current = new Date(firstMonth);
      while (current <= lastMonth) {
        const monthStr = current.toISOString().slice(0, 7);
        const existing = rawData.find(d => d.monthKey === monthStr);
        
        filledData.push({
          month: current.toLocaleString('default', { month: 'short' }),
          revenue: existing ? existing.revenue : 0,
          expenses: existing ? existing.expenses : 0
        });
        
        current.setMonth(current.getMonth() + 1);
      }
    }

    return filledData;
  } catch (e) {
    console.error("DB Error: getRevenueGrowthTrend", e);
    return [
      { month: 'Oct', revenue: 4800000, expenses: 2500000 },
      { month: 'Nov', revenue: 4200000, expenses: 2100000 },
      { month: 'Dec', revenue: 3500000, expenses: 1800000 },
      { month: 'Jan', revenue: 3800000, expenses: 1900000 },
      { month: 'Feb', revenue: 4100000, expenses: 2000000 },
      { month: 'Mar', revenue: 0, expenses: 0 }
    ];
  }
}

export async function checkTrxExists(reference: string) {
  try {
    const res = await query('SELECT id FROM transactions WHERE id = $1', [reference]);
    return res.rows.length > 0;
  } catch (e) {
    console.error("DB Error: checkTrxExists", e);
    return false;
  }
}

export async function getNextExpenseId(): Promise<string> {
  try {
    const res = await query(`
      SELECT last_value + CASE WHEN is_called THEN 1 ELSE 0 END as next_id 
      FROM expenses_id_seq
    `);
    const nextId = res.rows[0].next_id;
    return `OUT-${nextId}`;
  } catch (e) {
    console.error("DB Error: getNextExpenseId", e);
    try {
      const fallback = await query("SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM expenses");
      return `OUT-${fallback.rows[0].next_id}`;
    } catch {
      return "OUT-1";
    }
  }
}
