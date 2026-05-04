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
          WHEN c.status = 'Active' AND (
            EXTRACT(DAY FROM (c."createdAt" AT TIME ZONE 'Asia/Jakarta')) =
            EXTRACT(DAY FROM (NOW() AT TIME ZONE 'Asia/Jakarta' + INTERVAL '1 day'))
            OR
            EXTRACT(DAY FROM (c."createdAt" AT TIME ZONE 'Asia/Jakarta')) <=
            EXTRACT(DAY FROM (NOW() AT TIME ZONE 'Asia/Jakarta'))
            OR
            date_trunc('month', c."createdAt") < date_trunc('month', NOW())
          )
          AND NOT EXISTS (
            SELECT 1 FROM transactions t
            WHERE split_part(t.id, '-', 2) = c.id
              AND t.keterangan = 'pemasukan'
              AND t.status = 'Verified'
              AND EXTRACT(MONTH FROM (t.timestamp AT TIME ZONE 'Asia/Jakarta')) = EXTRACT(MONTH FROM (NOW() AT TIME ZONE 'Asia/Jakarta'))
              AND EXTRACT(YEAR FROM (t.timestamp AT TIME ZONE 'Asia/Jakarta')) = EXTRACT(YEAR FROM (NOW() AT TIME ZONE 'Asia/Jakarta'))
          )
          THEN true 
          ELSE false 
        END as is_grace_period,
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
          VALUES ('warning', 'billing', 'Customer Suspended', 'Customer ' || $1 || ' has been set to Inactive due to unpaid bill.', NOW(), true)
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
      select
          TO_CHAR("createdAt"::date, 'YYYY-MM') as "Month",
          count(*) as "Growth"
      from customers c
      where status = 'Active'
      group by 1
      order by 1 ASC
    `);
    
    const rawData = (res.rows || []).map(row => ({
      monthKey: row.Month,
      growth: parseInt(row.Growth || '0')
    }));

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth();
    const filledData = [];
    let cumulative = 0;
    for (let i = 0; i < 12; i++) {
      const monthNum = i + 1;
      const monthStr = `${currentYear}-${String(monthNum).padStart(2, '0')}`;
      const existing = rawData.find(d => d.monthKey === monthStr);
      
      if (existing) {
        cumulative += existing.growth;
      }

      const d = new Date(currentYear, i, 1);
      filledData.push({
        month: d.toLocaleString('en-US', { month: 'short' }),
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
