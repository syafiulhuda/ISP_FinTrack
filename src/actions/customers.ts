'use server';

import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import * as Mock from '@/lib/mockData';
import { Customer } from '@/types';
import { getAdminProfile } from './admin';

export async function getCustomers(page: number = 1, limit: number = 10): Promise<{ customers: Customer[], total: number }> {
  try {
    const offset = (page - 1) * limit;
    const countRes = await query('SELECT COUNT(*) as total FROM customers');
    const total = parseInt(countRes.rows[0].total);

    const res = await query(`
      SELECT c.*,
        CASE 
          WHEN c.status = 'Active' AND NOT EXISTS (
            SELECT 1 FROM transactions t
            WHERE split_part(t.id, '-', 2) = c.id
              AND t.keterangan = 'pemasukan'
              AND t.status = 'Verified'
              AND EXTRACT(MONTH FROM (t.timestamp AT TIME ZONE 'Asia/Jakarta')) = EXTRACT(MONTH FROM (NOW() AT TIME ZONE 'Asia/Jakarta'))
              AND EXTRACT(YEAR FROM (t.timestamp AT TIME ZONE 'Asia/Jakarta')) = EXTRACT(YEAR FROM (NOW() AT TIME ZONE 'Asia/Jakarta'))
          )
          THEN (EXTRACT(DAY FROM (c."createdAt" AT TIME ZONE 'Asia/Jakarta'))::int - EXTRACT(DAY FROM (NOW() AT TIME ZONE 'Asia/Jakarta'))::int)
          ELSE null
        END as grace_days,
        EXTRACT(DAY FROM (c."createdAt" AT TIME ZONE 'Asia/Jakarta')) as due_day
      FROM customers c
      ORDER BY c."createdAt" DESC, c.id DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    return {
      customers: res.rows.length > 0 ? res.rows as Customer[] : (page === 1 ? [...Mock.MOCK_CUSTOMERS].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) as Customer[] : []),
      total: total || (page === 1 ? Mock.MOCK_CUSTOMERS.length : 0)
    };
  } catch (e) {
    console.error("DB Error: getCustomers", e);
    return {
      customers: page === 1 ? Mock.MOCK_CUSTOMERS as Customer[] : [],
      total: page === 1 ? Mock.MOCK_CUSTOMERS.length : 0
    };
  }
}

export async function getInactiveCust() {
  try {
    const res = await query(`
      SELECT 
        id, name, no_telp, service, address, village, district, city, province, status,
        TO_CHAR(createdat AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as createdat_str,
        TO_CHAR(inactiveat AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as inactiveat_str,
        TO_CHAR(inactiveat::date, 'YYYY-MM') as inactive_month 
      FROM inactive_cust 
      ORDER BY inactiveat DESC
    `);
    
    // Strictly format response to ensure safe React Flight serialization to Client Components
    return res.rows.map(r => ({
      ...r,
      createdAt: r.createdat_str,
      inactiveat: r.inactiveat_str
    }));
  } catch (e) {
    console.error("DB Error: getInactiveCust", e);
    return [];
  }
}

export async function auditCustomerGracePeriod() {
  try {
    const res = await query(`
      UPDATE customers
      SET status = 'Inactive'
      WHERE status = 'Active'
        AND EXTRACT(DAY FROM "createdAt" AT TIME ZONE 'Asia/Jakarta') = EXTRACT(DAY FROM NOW() AT TIME ZONE 'Asia/Jakarta')
        AND NOT EXISTS (
          SELECT 1 FROM transactions t
          WHERE t.status = 'Verified'
            AND split_part(t.id, '-', 2) = customers.id
            AND t.timestamp::timestamp >= NOW() - INTERVAL '25 days'
        )
      RETURNING id
    `);
    
    if (res.rows.length > 0) {
      for (const row of res.rows) {
        await query(`
          INSERT INTO notifications (type, category, title, message, created_at, is_unread)
          VALUES ('warning', 'Billing', 'Customer Suspended', 'Customer ' || $1 || ' has been set to Inactive due to unpaid bill.', NOW(), true)
        `, [row.id]);
      }
    }

    revalidatePath('/service-tiers');
    return { success: true, count: res.rows.length };
  } catch (e) {
    console.error("DB Error: auditCustomerGracePeriod", e);
    return { success: false, error: String(e) };
  }
}

export async function getCustomerGrowthTrend() {
  try {
    const res = await query(`
      SELECT
          TO_CHAR("createdAt" AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') as "Month",
          count(*) as "Growth"
      FROM customers c
      WHERE status = 'Active'
      GROUP BY 1
      ORDER BY 1 ASC
    `);
    
    const rawData = (res.rows || []).map(row => ({
      monthKey: row.Month,
      growth: parseInt(row.Growth || '0')
    }));

    // Use UTC+7 math to determine current WIB year & month
    const now = new Date();
    const wibMs = now.getTime() + 7 * 60 * 60 * 1000;
    const wibNow = new Date(wibMs);
    const currentYear = wibNow.getUTCFullYear();
    const currentMonthIdx = wibNow.getUTCMonth(); // 0-based

    const filledData = [];
    let cumulative = 0;
    for (let i = 0; i < 12; i++) {
      const monthNum = i + 1;
      const monthStr = `${currentYear}-${String(monthNum).padStart(2, '0')}`;
      const existing = rawData.find(d => d.monthKey === monthStr);
      
      if (existing) {
        cumulative += existing.growth;
      }

      // Build month label using UTC to avoid timezone shift
      const d = new Date(Date.UTC(currentYear, i, 1));
      filledData.push({
        month: d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
        growth: cumulative
      });
    }

    const lastDataMonthIdx = rawData.reduce((max, item) => {
      const m = parseInt(item.monthKey.split('-')[1]) - 1;
      return m > max ? m : max;
    }, -1);

    const displayUntilIdx = Math.max(currentMonthIdx, lastDataMonthIdx);

    const finalData = filledData.map((item, i) => ({
      ...item,
      growth: i <= displayUntilIdx ? item.growth : null
    }));

    return finalData;
  } catch (e) {
    console.error("DB Error: getCustomerGrowthTrend", e);
    return [];
  }
}


export async function getServiceMix(province?: string) {
  try {
    const tiersRes = await query('SELECT name FROM service_tiers');
    const tierNames = tiersRes.rows.length > 0 
      ? tiersRes.rows.map(r => r.name)
      : ['Premium', 'Standard', 'Basic', 'Gamers'];

    let sql = `
      SELECT 
        CASE 
          WHEN TRIM(service) ILIKE 'Gamers%' THEN 'Gamers'
          ELSE TRIM(service) 
        END as service_name, 
        COUNT(*) as count 
      FROM customers
      WHERE 1=1
    `;
    const params = [];
    
    if (province && province !== "All Regions") {
      sql += ' AND province = $1';
      params.push(province);
    }
    
    sql += ' GROUP BY service_name';
    
    const res = await query(sql, params);
    
    return tierNames.map(name => {
      const row = res.rows.find(r => r.service_name.toLowerCase() === name.toLowerCase());
      return {
        name,
        value: row ? parseInt(row.count) : 0
      };
    });
  } catch (e) {
    console.error("DB Error: getServiceMix", e);
    return Mock.MOCK_SERVICE_TIERS.map(t => ({ name: t.name, value: 0 }));
  }
}

export async function createCustomer(data: { 
  name: string, 
  no_telp: string, 
  service: string, 
  province: string, 
  city: string, 
  district: string, 
  village: string, 
  address: string 
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const maxIdRes = await query("SELECT id FROM customers WHERE id LIKE 'CT%' ORDER BY id DESC LIMIT 1");
    let nextNum = 1;
    if (maxIdRes.rows.length > 0) {
      const lastId = maxIdRes.rows[0].id;
      const lastNum = parseInt(lastId.replace('CT', ''));
      nextNum = lastNum + 1;
    }
    const nextId = `CT${String(nextNum).padStart(3, '0')}`;

    const profile = await getAdminProfile();
    const inputter = profile.fullName || 'Unknown Admin';
    
    await query(`
      INSERT INTO customers (id, name, no_telp, service, province, city, district, village, address, status, "createdAt", inputter, inputter_tms)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Active', NOW(), $10, NOW())
    `, [nextId, data.name, data.no_telp, data.service, data.province, data.city, data.district, data.village, data.address, inputter]);

    revalidatePath('/service-tiers');
    revalidatePath('/regional');
    return { success: true, id: nextId };
  } catch (e) {
    console.error("DB Error: createCustomer", e);
    return { success: false, error: String(e) };
  }
}

export async function refreshAgingMV() {
  try {
    await query('REFRESH MATERIALIZED VIEW ar_aging_mv');
    return { success: true };
  } catch (e) {
    console.error("DB Error: refreshAgingMV", e);
    return { success: false, error: String(e) };
  }
}

export async function getAgingMVData() {
  try {
    const res = await query('SELECT * FROM ar_aging_mv');
    return res.rows;
  } catch (e) {
    console.error("DB Error: getAgingMVData", e);
    return [];
  }
}
export async function getCustomerAnalysis() {
  try {
    const customersRes = await query('SELECT id, name, service, status, is_vip, "createdAt" AT TIME ZONE \'Asia/Jakarta\' as created_at FROM customers');
    const transactionsRes = await query(`
      SELECT split_part(id, '-', 2) as customer_id, amount, timestamp AT TIME ZONE 'Asia/Jakarta' as tx_date, status, keterangan
      FROM transactions
      WHERE status = 'Verified' AND keterangan = 'pemasukan'
    `);

    const customers = customersRes.rows;
    const transactions = transactionsRes.rows;

    const analysis = customers.map((c: any) => {
      const customerTxs = transactions.filter((t: any) => t.customer_id === c.id);
      
      // Calculate LTV
      const ltv = customerTxs.reduce((sum: number, t: any) => sum + (parseInt(String(t.amount).replace(/[^0-9]/g, '')) || 0), 0);
      
      // Calculate Late Payment Ratio
      // Due day is the day of registration
      const regDate = new Date(c.created_at);
      const dueDay = regDate.getDate();
      
      let lateCount = 0;
      customerTxs.forEach((t: any) => {
        const txDate = new Date(t.tx_date);
        if (txDate.getDate() > dueDay + 3) { // 3 days grace period
          lateCount++;
        }
      });
      
      const paymentRatio = customerTxs.length > 0 ? (lateCount / customerTxs.length) * 100 : 0;
      
      // Calculate Health Score (0-100)
      let score = 70; // Baseline
      if (c.status === 'Active') score += 20;
      if (c.status === 'Inactive') score -= 40;
      
      score -= (lateCount * 10); // Deduct for each late payment
      if (ltv > 1000000) score += 10; // Bonus for high value
      
      const healthScore = Math.max(0, Math.min(100, score));

      return {
        ...c,
        ltv,
        paymentRatio,
        healthScore,
        txCount: customerTxs.length,
        lastPayment: customerTxs.length > 0 ? customerTxs.sort((a: any, b: any) => new Date(b.tx_date).getTime() - new Date(a.tx_date).getTime())[0].tx_date : null
      };
    });

    return analysis;
  } catch (e) {
    console.error("DB Error: getCustomerAnalysis", e);
    return [];
  }
}

export async function getCustomer360(customerId: string) {
  try {
    const customerRes = await query('SELECT id, name, service, status, is_vip, no_telp, city, province, "createdAt" AT TIME ZONE \'Asia/Jakarta\' as created_at FROM customers WHERE id = $1', [customerId]);
    if (customerRes.rows.length === 0) return null;
    const c = customerRes.rows[0];

    const txRes = await query(`
      SELECT amount, timestamp AT TIME ZONE 'Asia/Jakarta' as tx_date, status, keterangan
      FROM transactions
      WHERE split_part(id, '-', 2) = $1 AND status = 'Verified' AND keterangan = 'pemasukan'
      ORDER BY tx_date ASC
    `, [customerId]);

    const txs = txRes.rows;
    
    const regDate = new Date(c.created_at);
    const dueDay = regDate.getDate();

    let ltv = 0;
    let lateCount = 0;
    const payment_history: any[] = [];
    const late_payments: any[] = [];

    // Group by month for timeline chart
    const monthGroups: Record<string, { ontime: number, late: number, total: number }> = {};

    txs.forEach((t: any) => {
      const amt = Number(t.amount) || 0;
      ltv += amt;
      const txDate = new Date(t.tx_date);
      const isLate = txDate.getDate() > dueDay + 3;
      
      const monthKey = txDate.toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!monthGroups[monthKey]) {
        monthGroups[monthKey] = { ontime: 0, late: 0, total: 0 };
      }
      monthGroups[monthKey].total += amt;

      if (isLate) {
        lateCount++;
        monthGroups[monthKey].late += amt;
        const daysLate = txDate.getDate() - dueDay;
        late_payments.push({
          month: monthKey,
          date: txDate.toISOString(),
          daysLate,
          amount: amt
        });
      } else {
        monthGroups[monthKey].ontime += amt;
      }
    });

    Object.keys(monthGroups).forEach(key => {
      payment_history.push({
        month: key,
        ...monthGroups[key]
      });
    });

    let score = 70;
    if (c.status === 'Active') score += 20;
    if (c.status === 'Inactive') score -= 40;
    score -= (lateCount * 10);
    if (ltv > 1000000) score += 10;
    const healthScore = Math.max(0, Math.min(100, score));

    return {
      ...c,
      ltv,
      healthScore,
      txCount: txs.length,
      paymentRatio: txs.length > 0 ? (lateCount / txs.length) * 100 : 0,
      payment_history,
      late_payments
    };
  } catch (e) {
    console.error("DB Error: getCustomer360", e);
    return null;
  }
}

export async function toggleVipStatus(customerId: string, status: boolean) {
  try {
    await query('UPDATE customers SET is_vip = $1 WHERE id = $2', [status, customerId]);

    revalidatePath('/customers');
    revalidatePath(`/customers/${customerId}`);
    revalidatePath('/service-tiers');
    return { success: true };
  } catch (e) {
    console.error("DB Error: toggleVipStatus", e);
    return { success: false, error: String(e) };
  }
}

export async function sendPaymentReminder(customerId: string) {
  try {
    const res = await query('SELECT name, no_telp FROM customers WHERE id = $1', [customerId]);
    if (res.rows.length === 0) throw new Error('Customer not found');
    const customer = res.rows[0];

    // Mock WhatsApp/Fonnte integration logic
    console.log(`[WA REMINDER] Sending to ${customer.name} (${customer.no_telp})...`);
    
    // Record in notifications
    await query(`
      INSERT INTO notifications (type, category, title, message, created_at, is_unread)
      VALUES ('info', 'Billing', 'Reminder Sent', 'Payment reminder sent to ' || $1 || ' (' || $2 || ')', NOW(), true)
    `, [customer.name, customerId]);

    revalidatePath(`/customers/${customerId}`);
    return { success: true };
  } catch (e) {
    console.error("DB Error: sendPaymentReminder", e);
    return { success: false, error: String(e) };
  }
}

