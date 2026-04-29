'use server';

import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import * as Mock from '@/lib/mockData';

export async function getServiceTiers() {
  try {
    const res = await query('SELECT * FROM service_tiers ORDER BY id ASC');
    return res.rows.length > 0 ? res.rows : Mock.MOCK_SERVICE_TIERS;
  } catch (e) {
    console.error("DB Error: getServiceTiers", e);
    return Mock.MOCK_SERVICE_TIERS;
  }
}

export async function getAssetRoster() {
  try {
    const res = await query('SELECT * FROM asset_roster ORDER BY id ASC');
    return res.rows.length > 0 ? res.rows : Mock.MOCK_ASSETS;
  } catch (e) {
    console.error("DB Error: getAssetRoster", e);
    return Mock.MOCK_ASSETS;
  }
}

export async function getStockAssets() {
  try {
    const res = await query('SELECT *, is_used::boolean as is_used FROM stock_asset_roster ORDER BY id ASC');
    return res.rows.length > 0 ? res.rows : Mock.MOCK_STOCK;
  } catch (e) {
    console.error("DB Error: getStockAssets", e);
    return Mock.MOCK_STOCK;
  }
}

export async function getCustomers() {
  try {
    const res = await query(`
      SELECT *,
        CASE 
          WHEN status = 'Active' AND 
               EXTRACT(DAY FROM "createdAt"::timestamp) = EXTRACT(DAY FROM (NOW() + INTERVAL '1 day'))
          THEN true ELSE false 
        END as is_grace_period,
        EXTRACT(DAY FROM "createdAt"::timestamp) as due_day
      FROM customers 
      ORDER BY id ASC
    `);
    return res.rows.length > 0 ? res.rows : Mock.MOCK_CUSTOMERS;
  } catch (e) {
    console.error("DB Error: getCustomers", e);
    return Mock.MOCK_CUSTOMERS;
  }
}

export async function auditCustomerGracePeriod() {
  try {
    // 1. Mark as Inactive if TODAY is their due date and no payment in last 25 days
    // We use 25 days as a buffer for monthly payments
    const res = await query(`
      UPDATE customers
      SET status = 'Inactive'
      WHERE status = 'Active'
        AND EXTRACT(DAY FROM "createdAt"::timestamp) = EXTRACT(DAY FROM NOW())
        AND NOT EXISTS (
          SELECT 1 FROM transactions t
          WHERE t.status = 'Verified'
            AND split_part(t.id, '-', 2) = customers.id
            AND t.timestamp::timestamp >= NOW() - INTERVAL '25 days'
        )
      RETURNING id
    `);
    
    if (res.rows.length > 0) {
      // Create notification for disconnected customers
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

export async function getTransactions() {
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
    
    const data = res.rows.length > 0 ? res.rows : Mock.MOCK_TRANSACTIONS;
    return data.map(r => ({
      ...r,
      amount: r.amount || 'Rp 0',
      numericAmount: parseInt(r.amount?.replace(/[^0-9]/g, '') || '0'),
      timestamp: r.timestamp ? new Date(r.timestamp).toISOString() : new Date().toISOString()
    }));
  } catch (e) {
    console.error("DB Error: getTransactions", e);
    return Mock.MOCK_TRANSACTIONS.map(r => ({
      ...r,
      numericAmount: parseInt(r.amount.replace(/[^0-9]/g, '')),
    }));
  }
}

export async function getOcrData() {
  try {
    const res = await query('SELECT * FROM ocr_data LIMIT 1');
    return res.rows[0] || Mock.MOCK_OCR;
  } catch (e) {
    console.error("DB Error: getOcrData", e);
    return Mock.MOCK_OCR;
  }
}

export async function getAdminProfile() {
  try {
    const res = await query('SELECT id, nama as "fullName", email, role, department, image FROM admin LIMIT 1');
    return res.rows[0] || Mock.MOCK_ADMIN;
  } catch (e) {
    console.error("DB Error: getAdminProfile", e);
    return Mock.MOCK_ADMIN;
  }
}

export async function updateAdminProfile(data: { fullName: string, email: string, role: string, department: string, image: string }) {
  try {
    const res = await query(`
      UPDATE admin 
      SET nama = $1, email = $2, role = $3, department = $4, image = $5
      WHERE id = (SELECT id FROM admin LIMIT 1)
      RETURNING id, nama as "fullName", email, role, department, image
    `, [data.fullName, data.email, data.role, data.department, data.image]);
    return res.rows[0];
  } catch (e) {
    console.error("DB Error: updateAdminProfile", e);
    return { ...Mock.MOCK_ADMIN, ...data };
  }
}

export async function getAdminList() {
  try {
    const res = await query('SELECT id, nama, email, role, department, image, nickname FROM admin ORDER BY id ASC');
    return res.rows;
  } catch (e) {
    console.error("DB Error: getAdminList", e);
    // Map fallback to match DB column names
    return [{
      id: 1,
      nama: Mock.MOCK_ADMIN.fullName,
      email: Mock.MOCK_ADMIN.email,
      role: Mock.MOCK_ADMIN.role,
      department: Mock.MOCK_ADMIN.department,
      image: Mock.MOCK_ADMIN.image
    }];
  }
}

export async function createAdmin(data: { nama: string, email: string, role: string, department: string, image: string }) {
  try {
    const res = await query(`
      INSERT INTO admin (nama, email, role, department, image, password)
      VALUES ($1, $2, $3, $4, $5, 'admin123')
      RETURNING id, nama, email, role, department, image
    `, [data.nama, data.email, data.role, data.department, data.image]);
    return res.rows[0];
  } catch (e) {
    console.error("DB Error: createAdmin", e);
    throw e;
  }
}

export async function createNotification(data: { category: string, title: string, message: string, type: string, action_label?: string }) {
  try {
    const res = await query(`
      INSERT INTO notifications (category, title, message, type, is_unread, action_label, created_at)
      VALUES ($1, $2, $3, $4, true, $5, NOW())
      RETURNING *
    `, [data.category, data.title, data.message, data.type, data.action_label || null]);
    return res.rows[0];
  } catch (e) {
    console.error("DB Error: createNotification", e);
    throw e;
  }
}

export async function deleteNotification(id: number) {
  try {
    await query('UPDATE notifications SET is_hidden = true WHERE id = $1', [id]);
    return { success: true };
  } catch (e) {
    console.error("DB Error: deleteNotification", e);
    throw e;
  }
}

export async function hideAllNotifications() {
  try {
    await query('UPDATE notifications SET is_hidden = true');
    return { success: true };
  } catch (e) {
    console.error("DB Error: hideAllNotifications", e);
    throw e;
  }
}

export async function getNotifications() {
  try {
    const res = await query('SELECT *, is_unread::boolean as is_unread FROM notifications WHERE is_hidden = false OR is_hidden IS NULL ORDER BY id DESC');
    const data = res.rows.length > 0 ? res.rows : Mock.MOCK_NOTIFICATIONS;
    return data.map(row => ({
      ...row,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : null
    }));
  } catch (e) {
    console.error("DB Error: getNotifications", e);
    return Mock.MOCK_NOTIFICATIONS;
  }
}

export async function markNotificationAsRead(id: number) {
  try {
    await query('UPDATE notifications SET is_unread = false WHERE id = $1', [id]);
  } catch (e) {
    console.error("DB Error: markNotificationAsRead", e);
  }
  return { success: true };
}

export async function markAllNotificationsAsRead() {
  try {
    await query('UPDATE notifications SET is_unread = false');
  } catch (e) {
    console.error("DB Error: markAllNotificationsAsRead", e);
  }
  return { success: true };
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


export async function updateOcrData(id: number, data: { vendor: string, date: string, amount: string, reference: string }) {
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

export async function postOcrEntry(ocrId: number, data: { vendor: string, amount: string, date: string, reference: string, method: string }) {
  try {
    // 1. Sanitize Date (Convert Indonesian months to English for PostgreSQL)
    let sanitizedDate = data.date;
    const monthsId: Record<string, string> = {
      'Jan': 'Jan', 'Feb': 'Feb', 'Mar': 'Mar', 'Apr': 'Apr', 'Mei': 'May', 
      'Jun': 'Jun', 'Jul': 'Jul', 'Agu': 'Aug', 'Ags': 'Aug', 'Sep': 'Sep', 
      'Okt': 'Oct', 'Nov': 'Nov', 'Des': 'Dec'
    };
    
    Object.keys(monthsId).forEach(key => {
      sanitizedDate = sanitizedDate.replace(key, monthsId[key]);
    });

    // Fallback to NOW if parsing still fails
    const timestamp = isNaN(Date.parse(sanitizedDate)) ? new Date().toISOString() : sanitizedDate;

    // 2. Fix Sequence (Prevent Duplicate Key Errors in Trigger)
    // Ini akan mensinkronkan sekuens ID agar trigger tidak bentrok.
    try {
      await query(`SELECT setval(pg_get_serial_sequence('notifications', 'id'), (SELECT MAX(id) FROM notifications))`);
    } catch (seqError) {
      console.warn("Sequence sync skipped or failed (might be non-serial):", seqError);
    }

    // 3. Insert into transactions
    // Menggunakan data.reference sebagai ID sesuai ketentuan (misal: TRX-CT113)
    const trxId = data.reference || `TRX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    await query(`
      INSERT INTO transactions (id, method, amount, status, timestamp, type, keterangan)
      VALUES ($1, $2, $3, 'Verified', $4, 'bank', 'pemasukan')
    `, [trxId, data.method, `Rp ${data.amount}`, timestamp]);

    revalidatePath('/finance');
    revalidatePath('/notifications');
    return { success: true, trxId };
  } catch (e) {
    console.error("DB Error: postOcrEntry", e);
    return { success: false, error: String(e) };
  }
}

export async function getRevenueGrowthTrend() {
  try {
    const res = await query(`
      WITH MonthlyRevenue AS (
          SELECT 
              TO_CHAR(timestamp, 'YYYY-MM') as month,
              SUM(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) as revenue
          FROM transactions
          WHERE status = 'Verified' AND keterangan = 'pemasukan'
          GROUP BY 1
      ),
      MonthlyExpenses AS (
          SELECT 
              TO_CHAR(timestamp, 'YYYY-MM') as month,
              SUM(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) as expense
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

    // Map to ensure we handle case-sensitive keys and fill potential gaps if needed
    const rawData = res.rows.map(row => ({
      monthKey: row.Month,
      revenue: Number(row.Revenue),
      expenses: Number(row.Expenses)
    }));

    // Logic to fill gaps in the timeline for linear visualization
    const filledData = [];
    if (rawData.length > 0) {
      const firstMonth = new Date(rawData[0].monthKey + '-01');
      const lastMonth = new Date(rawData[rawData.length - 1].monthKey + '-01');
      
      let current = new Date(firstMonth);
      while (current <= lastMonth) {
        const monthStr = current.toISOString().slice(0, 7); // YYYY-MM
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
    // Fallback to verified historical data
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

export async function getServiceMix(province?: string) {
  try {
    // 1. Get all available tiers from DB
    const tiersRes = await query('SELECT name FROM service_tiers');
    const tierNames = tiersRes.rows.length > 0 
      ? tiersRes.rows.map(r => r.name)
      : ['Premium', 'Standard', 'Basic', 'Gamers'];

    // 2. Aggregate customers by service name
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
    
    // 3. Return all tiers, filling 0 for those with no customers
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

export async function createServiceTier(data: { 
  name: string, 
  speed: string, 
  unit: string, 
  price: string, 
  fup: string, 
  type: string, 
  icon: string 
}) {
  try {
    const res = await query(`
      INSERT INTO service_tiers (name, speed, unit, price, fup, type, icon)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [data.name, data.speed, data.unit, data.price, data.fup, data.type, data.icon]);
    revalidatePath('/service-tiers');
    revalidatePath('/profitability');
    return { success: true, tier: res.rows[0] };
  } catch (e) {
    console.error("DB Error: createServiceTier", e);
    return { success: false, error: String(e) };
  }
}

export async function getCustomerGrowthTrend() {
  try {
    const res = await query(`
      with activeCustomer as (
          select
              TO_CHAR("createdAt"::timestamp, 'YYYY-MM') as month,
              count(*) as tot_cust
          from customers c
          where status = 'Active'
          group by 1
      )
      , inactiveCustomer as (
          select
              TO_CHAR("createdAt"::timestamp, 'YYYY-MM') as month,
              count(*) as inactive_cust
          from customers c
          where status = 'Inactive'
          group by 1
      )
      select
          COALESCE(a.month, i.month) as "Month",
          sum(coalesce(a.tot_cust,0)) - sum(coalesce(i.inactive_cust,0)) as "Growth"
      from activeCustomer a
      full outer join inactiveCustomer i on a.month = i.month
      group by 1
      order by 1 ASC
    `);
    
    const rawData = (res.rows || []).map(row => ({
      monthKey: row.Month,
      growth: parseInt(row.Growth || '0')
    }));

    const filledData = [];
    const currentYear = 2026; // Hardcoded to match seed data for now or use new Date().getFullYear()
    const currentMonthIdx = 3; // April (matching system time in prompt)
    
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
        growth: i <= currentMonthIdx ? cumulative : null
      });
    }

    return filledData;
  } catch (e) {
    console.error("DB Error: getCustomerGrowthTrend", e);
    return [];
  }
}

export async function getWarehouses() {
  try {
    const res = await query(`
      select distinct
          split_part(location,',',1) as warehouse_name,
          split_part(location,',',2) as city_name,
          split_part(location,',',3) as province_name,
          latitude,
          longitude
      from asset_roster
      where split_part(location,',',2) in (' Yogyakarta',' DKI Jakarta',' Bali',' Surabaya')
      order by split_part(location,',',1) asc
    `);
    return res.rows;
  } catch (e) {
    console.error("DB Error: getWarehouses", e);
    return [
      { warehouse_name: 'Warehouse Main', city_name: ' DKI Jakarta', province_name: '', latitude: -6.2088, longitude: 106.8456 },
      { warehouse_name: 'Warehouse East', city_name: ' Yogyakarta', province_name: ' DI Yogyakarta', latitude: -7.7956, longitude: 110.3695 },
      { warehouse_name: 'Warehouse South', city_name: ' Bali', province_name: '', latitude: -8.4095, longitude: 115.1889 },
      { warehouse_name: 'Warehouse West', city_name: ' Surabaya', province_name: ' Jawa Timur', latitude: -7.2575, longitude: 112.7521 }
    ];
  }
}

export async function createAsset(data: { 
  sn: string, 
  mac: string, 
  type: string, 
  location: string, 
  condition: string, 
  kepemilikan?: string,
  latitude?: number,
  longitude?: number
}) {
  try {
    const res = await query(`
      INSERT INTO stock_asset_roster (sn, mac, type, location, condition, color, latitude, longitude, status, kepemilikan, tanggal_perubahan, is_used)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11)
      RETURNING *
    `, [
      data.sn, 
      data.mac, 
      data.type, 
      data.location, 
      data.condition, 
      'White',
      data.latitude ?? -6.2088,   // Use provided lat or default to Main Warehouse
      data.longitude ?? 106.8456, // Use provided lng or default to Main Warehouse
      'Offline',
      data.kepemilikan || 'Dimiliki',
      false
    ]);
    revalidatePath('/inventory');
    return { success: true, asset: res.rows[0] };
  } catch (e) {
    console.error("DB Error: createAsset", e);
    return { success: false, error: String(e) };
  }
}

export async function updateAssetCondition(sn: string, condition: string) {
  try {
    await query(`UPDATE asset_roster SET condition = $1, tanggal_perubahan = NOW() WHERE sn = $2`, [condition, sn]);
    revalidatePath('/inventory');
    return { success: true };
  } catch (e) {
    console.error("DB Error: updateAssetCondition", e);
    return { success: false };
  }
}

export async function deleteAsset(sn: string) {
  try {
    await query(`DELETE FROM asset_roster WHERE sn = $1`, [sn]);
    revalidatePath('/inventory');
    return { success: true };
  } catch (e) {
    console.error("DB Error: deleteAsset", e);
    return { success: false };
  }
}
export async function deployAsset(sn: string, data: { location: string, latitude: number, longitude: number }) {
  try {
    await query(`
      WITH deleted AS (
        DELETE FROM stock_asset_roster WHERE sn = $1 RETURNING *
      )
      INSERT INTO asset_roster (sn, mac, type, location, condition, color, latitude, longitude, status, kepemilikan, tanggal_perubahan)
      SELECT sn, mac, type, $2, condition, color, $3, $4, 'Online', kepemilikan, NOW()
      FROM deleted
    `, [sn, data.location, data.latitude, data.longitude]);
    
    revalidatePath('/inventory');
    return { success: true };
  } catch (e) {
    console.error("DB Error: deployAsset", e);
    return { success: false, error: String(e) };
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
    // 1. Generate ID (CTxxx) based on MAX existing ID
    const maxIdRes = await query("SELECT id FROM customers WHERE id LIKE 'CT%' ORDER BY id DESC LIMIT 1");
    let nextNum = 1;
    if (maxIdRes.rows.length > 0) {
      const lastId = maxIdRes.rows[0].id; // e.g. "CT114"
      const lastNum = parseInt(lastId.replace('CT', ''));
      nextNum = lastNum + 1;
    }
    const nextId = `CT${String(nextNum).padStart(3, '0')}`;

    // 2. Insert
    await query(`
      INSERT INTO customers (id, name, no_telp, service, province, city, district, village, address, status, "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Active', NOW())
    `, [nextId, data.name, data.no_telp, data.service, data.province, data.city, data.district, data.village, data.address]);

    revalidatePath('/service-tiers');
    revalidatePath('/regional');
    return { success: true, id: nextId };
  } catch (e) {
    console.error("DB Error: createCustomer", e);
    return { success: false, error: String(e) };
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
