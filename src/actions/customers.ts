'use server';
import { logger } from '@/lib/logger';

import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { Customer } from '@/types';
import { getAdminProfile } from './admin';

export async function getCustomers(page: number = 1, limit: number = 10): Promise<{ customers: Customer[], total: number }> {
  try {
    const offset = (page - 1) * limit;
    const countRes = await query('SELECT COUNT(*) as total FROM customers');
    const total = parseInt(countRes.rows[0].total);

    // Uses idx_transactions_customer_id (functional index on split_part(id,'-',2))
    // Single LEFT JOIN against a pre-aggregated subquery — eliminates N+1 correlated subquery
    const res = await query(`
      SELECT c.*,
        EXTRACT(DAY FROM (c."createdAt" AT TIME ZONE 'Asia/Jakarta')) as due_day,
        CASE
          WHEN c.status = 'Active' AND paid.customer_id IS NULL
          THEN (EXTRACT(DAY FROM (c."createdAt" AT TIME ZONE 'Asia/Jakarta'))::int - EXTRACT(DAY FROM (NOW() AT TIME ZONE 'Asia/Jakarta'))::int)
          ELSE null
        END as grace_days
      FROM customers c
      LEFT JOIN (
        SELECT split_part(id, '-', 2) as customer_id
        FROM transactions
        WHERE keterangan = 'pemasukan'
          AND status = 'Verified'
          AND timestamp >= date_trunc('month', NOW() AT TIME ZONE 'Asia/Jakarta')
          AND timestamp < date_trunc('month', NOW() AT TIME ZONE 'Asia/Jakarta') + INTERVAL '1 month'
        GROUP BY split_part(id, '-', 2)
      ) paid ON paid.customer_id = c.id
      ORDER BY c."createdAt" DESC, c.id DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return {
      customers: res.rows as Customer[],
      total: total || 0
    };
  } catch (e) {
    logger.error({ message: "DB Error: getCustomers", error: e, path: "action" });
    return {
      customers: [],
      total: 0
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
    logger.error({ message: "DB Error: getInactiveCust", error: e, path: "action" });
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
    logger.error({ message: "DB Error: auditCustomerGracePeriod", error: e, path: "action" });
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
    logger.error({ message: "DB Error: getCustomerGrowthTrend", error: e, path: "action" });
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
    return [];
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
    logger.error({ message: "DB Error: createCustomer", error: e, path: "action" });
    return { success: false, error: String(e) };
  }
}

export async function refreshAgingMV() {
  try {
    await query('REFRESH MATERIALIZED VIEW ar_aging_mv');
    return { success: true };
  } catch (e) {
    logger.error({ message: "DB Error: refreshAgingMV", error: e, path: "action" });
    return { success: false, error: String(e) };
  }
}

export async function getAgingMVData() {
  try {
    const res = await query('SELECT * FROM ar_aging_mv');
    return res.rows;
  } catch (e) {
    logger.error({ message: "DB Error: getAgingMVData", error: e, path: "action" });
    return [];
  }
}
export async function getCustomerAnalysis() {
  try {
    // All computation done in PostgreSQL — no JS-side filtering of transactions.
    // Uses idx_transactions_customer_id on split_part(id,'-',2) for the JOIN.
    const res = await query(`
      WITH current_overdue AS (
        -- Detect customers who haven't paid for the current month and are past due date
        SELECT 
          c2.id,
          CASE 
            WHEN NOT EXISTS (
              SELECT 1 FROM transactions t3
              WHERE split_part(t3.id, '-', 2) = c2.id
                AND t3.status = 'Verified'
                AND t3.keterangan = 'pemasukan'
                AND t3.timestamp >= date_trunc('month', NOW() AT TIME ZONE 'Asia/Jakarta')
                AND t3.timestamp < date_trunc('month', NOW() AT TIME ZONE 'Asia/Jakarta') + INTERVAL '1 month'
            )
            AND EXTRACT(DAY FROM (NOW() AT TIME ZONE 'Asia/Jakarta')) > EXTRACT(DAY FROM (c2."createdAt" AT TIME ZONE 'Asia/Jakarta')) + 3
            AND c2.status = 'Active'
            THEN 1 ELSE 0 
          END as current_overdue_penalty
        FROM customers c2
      ),
      tx_stats AS (
        SELECT
          split_part(t2.id, '-', 2)                                           AS customer_id,
          COUNT(*)                                                             AS tx_count,
          COALESCE(SUM(t2.amount), 0)                                          AS ltv,
          MAX(t2.timestamp AT TIME ZONE 'Asia/Jakarta')                       AS last_payment,
          COUNT(*) FILTER (
            WHERE EXTRACT(DAY FROM (t2.timestamp AT TIME ZONE 'Asia/Jakarta')) >
                  EXTRACT(DAY FROM (c2."createdAt" AT TIME ZONE 'Asia/Jakarta')) + 3
          )                                                                    AS late_count
        FROM transactions t2
        JOIN customers c2 ON split_part(t2.id, '-', 2) = c2.id
        WHERE t2.status = 'Verified' AND t2.keterangan = 'pemasukan'
        GROUP BY split_part(t2.id, '-', 2)
      )
      SELECT
        c.id,
        c.name,
        c.service,
        c.status,
        c.is_vip,
        c.province,
        c.city,
        c.district,
        c."createdAt" AT TIME ZONE 'Asia/Jakarta'          AS created_at,
        COALESCE(tx.ltv, 0)                                AS ltv,
        COALESCE(tx.tx_count, 0)                           AS "txCount",
        tx.last_payment                                    AS "lastPayment",
        CASE
          WHEN COALESCE(tx.tx_count, 0) = 0 AND co.current_overdue_penalty = 0 THEN 0
          WHEN COALESCE(tx.tx_count, 0) = 0 AND co.current_overdue_penalty > 0 THEN 100
          ELSE ROUND(((COALESCE(tx.late_count, 0) + co.current_overdue_penalty)::numeric / 
                (tx.tx_count + co.current_overdue_penalty)) * 100, 2)
        END                                                AS "paymentRatio",
        GREATEST(0, LEAST(100,
          70
          + CASE WHEN c.status = 'Active'   THEN 20 ELSE 0 END
          + CASE WHEN c.status = 'Inactive' THEN -40 ELSE 0 END
          - ((COALESCE(tx.late_count, 0) + co.current_overdue_penalty) * 10)
          + CASE WHEN COALESCE(tx.ltv, 0) > 1000000 THEN 10 ELSE 0 END
        ))                                                 AS "healthScore"
      FROM customers c
      LEFT JOIN tx_stats tx ON tx.customer_id = c.id
      LEFT JOIN current_overdue co ON co.id = c.id
      ORDER BY ltv DESC
    `);

    return res.rows;
  } catch (e) {
    logger.error({ message: "DB Error: getCustomerAnalysis", error: e, path: "action" });
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
      const amt = parseInt(String(t.amount || '0').replace(/[^0-9.-]/g, '')) || 0;
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

    // BUSINESS LOGIC UPDATE: Track current month's overdue status even if unpaid
    const now = new Date();
    // Use the same formatting as monthGroups keys (e.g., "May 2026")
    const currentMonthKey = now.toLocaleString('default', { month: 'short', year: 'numeric' });
    
    // If no payment recorded for this month AND we are past the grace period
    if (!monthGroups[currentMonthKey] && now.getDate() > dueDay + 3 && c.status === 'Active') {
      const daysOverdue = now.getDate() - dueDay;
      
      // Add to Late Breakdown
      late_payments.push({
        month: currentMonthKey,
        date: now.toISOString(),
        daysLate: daysOverdue,
        amount: 0, // 0 because unpaid
        isUnpaid: true
      });
      
      // Add to Chart as a "Potential/Late" bar
      payment_history.push({
        month: currentMonthKey,
        ontime: 0,
        late: txs.length > 0 ? ltv / txs.length : 350000, // Use average or default price to make it visible
        total: 0,
        isUnpaid: true
      });
      
      lateCount++;
    }

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
      paymentRatio: txs.length > 0 ? (lateCount / txs.length) * 100 : (lateCount > 0 ? 100 : 0),
      payment_history,
      late_payments
    };
  } catch (e) {
    logger.error({ message: "DB Error: getCustomer360", error: e, path: "action" });
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
    logger.error({ message: "DB Error: toggleVipStatus", error: e, path: "action" });
    return { success: false, error: String(e) };
  }
}

export async function sendPaymentReminder(customerId: string) {
  try {
    const res = await query('SELECT name, no_telp FROM customers WHERE id = $1', [customerId]);
    if (res.rows.length === 0) throw new Error('Customer not found');
    const customer = res.rows[0];

    // Mock WhatsApp/Fonnte integration logic
    if (process.env.NODE_ENV === 'development') console.log(`[WA REMINDER] Sending to ${customer.name} (${customer.no_telp})...`);

    // Record in notifications
    await query(`
      INSERT INTO notifications (type, category, title, message, created_at, is_unread)
      VALUES ('info', 'Billing', 'Reminder Sent', 'Payment reminder sent to ' || $1 || ' (' || $2 || ')', NOW(), true)
    `, [customer.name, customerId]);

    revalidatePath(`/customers/${customerId}`);
    return { success: true };
  } catch (e) {
    logger.error({ message: "DB Error: sendPaymentReminder", error: e, path: "action" });
    return { success: false, error: String(e) };
  }
}

