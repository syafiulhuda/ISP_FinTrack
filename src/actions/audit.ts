'use server';
import { logger } from '@/lib/logger';

import { query } from '@/lib/db';

export async function getAuditLogs() {
  try {
    // Run all queries in parallel for performance
    const [loginRes, stockRes, assetRes, expRes, mainRes, custRes, trxRes, passRes, userRes] = await Promise.all([
      // 1. Login Logs (no inputter field - use nickname)
      query(`
        SELECT id::text, nickname as user, login_timestamp AT TIME ZONE 'Asia/Jakarta' as timestamp, 
               'System Login' as action, 
               'IP: ' || COALESCE(ip_address, 'Unknown') as details
        FROM login_logs
        ORDER BY login_timestamp DESC
        LIMIT 50
      `),

      // 2. Stock Asset Roster (Registration via Inventory page or OCR)
      query(`
        SELECT 'STOCK-' || id::text as id, inputter as user, inputter_tms AT TIME ZONE 'Asia/Jakarta' as timestamp, 
               'Asset Registered' as action, 
               'SN: ' || sn || ' (' || type || ') at ' || location as details
        FROM stock_asset_roster
        WHERE inputter IS NOT NULL AND inputter_tms IS NOT NULL
        ORDER BY inputter_tms DESC
        LIMIT 50
      `),

      // 3. Asset Roster (Deployed hardware)
      query(`
        SELECT 'ASSET-' || id::text as id, inputter as user, inputter_tms AT TIME ZONE 'Asia/Jakarta' as timestamp, 
               'Hardware Deployed' as action, 
               'SN: ' || sn || ' (' || type || ') at ' || location as details
        FROM asset_roster
        WHERE inputter IS NOT NULL AND inputter_tms IS NOT NULL
        ORDER BY inputter_tms DESC
        LIMIT 50
      `),

      // 4. Expenses (OCR pengeluaran)
      query(`
        SELECT 'EXP-' || id::text as id, inputter as user, inputter_tms AT TIME ZONE 'Asia/Jakarta' as timestamp, 
               'Expense Created' as action, 
               COALESCE(description, category) || ' (Rp ' || amount::text || ')' as details
        FROM expenses
        WHERE inputter IS NOT NULL AND inputter_tms IS NOT NULL
        ORDER BY inputter_tms DESC
        LIMIT 50
      `),

      // 5. Maintenance History
      query(`
        SELECT 'MAIN-' || id::text as id, inputter as user, inputter_tms AT TIME ZONE 'Asia/Jakarta' as timestamp, 
               'Maintenance Record' as action, 
               COALESCE(description, 'Maintenance') || ' (Asset ID: ' || asset_id::text || ')' as details
        FROM maintenance_history
        WHERE inputter IS NOT NULL AND inputter_tms IS NOT NULL
        ORDER BY inputter_tms DESC
        LIMIT 50
      `),

      // 6. Customers (New customer registration)
      query(`
        SELECT 'CUST-' || id as id, inputter as user, inputter_tms AT TIME ZONE 'Asia/Jakarta' as timestamp, 
               'Customer Added' as action, 
               'New customer: ' || name || ' (ID: ' || id || ', Service: ' || COALESCE(service, 'N/A') || ')' as details
        FROM customers
        WHERE inputter IS NOT NULL AND inputter_tms IS NOT NULL
        ORDER BY inputter_tms DESC
        LIMIT 50
      `),

      // 7. Transactions (Pemasukan & Pengeluaran posted)
      query(`
        SELECT id, inputter as user, inputter_tms AT TIME ZONE 'Asia/Jakarta' as timestamp, 
               CASE WHEN keterangan = 'pemasukan' THEN 'Income Posted' ELSE 'Expense Posted' END as action,
               'TRX: ' || id || ' via ' || method || ' (Rp ' || amount::text || ')' as details
        FROM transactions
        WHERE inputter IS NOT NULL AND inputter_tms IS NOT NULL
        ORDER BY inputter_tms DESC
        LIMIT 50
      `),

      // 8. Password Change History
      query(`
        SELECT id::text, actor_email as user, timestamp AT TIME ZONE 'Asia/Jakarta' as timestamp, 
               action_type as action, 
               'Target: ' || target_email || ' | IP: ' || COALESCE(ip_address, 'Unknown') as details
        FROM change_pass_history
        ORDER BY timestamp DESC
        LIMIT 50
      `),

      // 9. Admin/User Creation
      query(`
        SELECT 'USR-' || id::text as id, inputter as user, inputter_tms AT TIME ZONE 'Asia/Jakarta' as timestamp, 
               'User Created' as action, 
               'New user: ' || nama || ' (' || email || ' - ' || role || ')' as details
        FROM admin
        WHERE inputter IS NOT NULL AND inputter_tms IS NOT NULL
        ORDER BY inputter_tms DESC
        LIMIT 50
      `),
    ]);

    // Combine all and sort chronologically
    const combined = [
      ...loginRes.rows,
      ...stockRes.rows,
      ...assetRes.rows,
      ...expRes.rows,
      ...mainRes.rows,
      ...custRes.rows,
      ...trxRes.rows,
      ...passRes.rows,
      ...userRes.rows, // admin/user creations
    ].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return combined;
  } catch (e) {
    logger.error({ message: "DB Error: getAuditLogs", error: e, path: "action" });
    return [];
  }
}
