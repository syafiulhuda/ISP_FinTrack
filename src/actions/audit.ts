'use server';

import { query } from '@/lib/db';

export async function getAuditLogs() {
  try {
    // Run all queries in parallel for performance
    const [loginRes, stockRes, assetRes, expRes, invRes, mainRes, custRes, trxRes] = await Promise.all([
      // 1. Login Logs (no inputter field - use nickname)
      query(`
        SELECT id::text, nickname as user, login_timestamp as timestamp, 
               'System Login' as action, 
               'IP: ' || COALESCE(ip_address, 'Unknown') as details
        FROM login_logs
        ORDER BY login_timestamp DESC
        LIMIT 50
      `),

      // 2. Stock Asset Roster (Registration via Inventory page or OCR)
      query(`
        SELECT 'STOCK-' || id::text as id, inputter as user, inputter_tms as timestamp, 
               'Asset Registered' as action, 
               'SN: ' || sn || ' (' || type || ') at ' || location as details
        FROM stock_asset_roster
        WHERE inputter IS NOT NULL AND inputter_tms IS NOT NULL
        ORDER BY inputter_tms DESC
        LIMIT 50
      `),

      // 3. Asset Roster (Deployed hardware)
      query(`
        SELECT 'ASSET-' || id::text as id, inputter as user, inputter_tms as timestamp, 
               'Hardware Deployed' as action, 
               'SN: ' || sn || ' (' || type || ') at ' || location as details
        FROM asset_roster
        WHERE inputter IS NOT NULL AND inputter_tms IS NOT NULL
        ORDER BY inputter_tms DESC
        LIMIT 50
      `),

      // 4. Expenses (OCR pengeluaran)
      query(`
        SELECT 'EXP-' || id::text as id, inputter as user, inputter_tms as timestamp, 
               'Expense Created' as action, 
               COALESCE(description, category) || ' (Rp ' || amount::text || ')' as details
        FROM expenses
        WHERE inputter IS NOT NULL AND inputter_tms IS NOT NULL
        ORDER BY inputter_tms DESC
        LIMIT 50
      `),

      // 5. Invoices (OCR pemasukan)
      query(`
        SELECT 'INV-' || id::text as id, inputter as user, inputter_tms as timestamp, 
               'Invoice Generated' as action, 
               'Invoice #' || id::text || ' — Customer: ' || COALESCE(customer_id, 'N/A') || ' (Rp ' || amount::text || ')' as details
        FROM invoices
        WHERE inputter IS NOT NULL AND inputter_tms IS NOT NULL
        ORDER BY inputter_tms DESC
        LIMIT 50
      `),

      // 6. Maintenance History
      query(`
        SELECT 'MAIN-' || id::text as id, inputter as user, inputter_tms as timestamp, 
               'Maintenance Record' as action, 
               COALESCE(description, 'Maintenance') || ' (Asset ID: ' || asset_id::text || ')' as details
        FROM maintenance_history
        WHERE inputter IS NOT NULL AND inputter_tms IS NOT NULL
        ORDER BY inputter_tms DESC
        LIMIT 50
      `),

      // 7. Customers (New customer registration)
      query(`
        SELECT 'CUST-' || id as id, inputter as user, inputter_tms as timestamp, 
               'Customer Added' as action, 
               'New customer: ' || name || ' (ID: ' || id || ', Service: ' || COALESCE(service, 'N/A') || ')' as details
        FROM customers
        WHERE inputter IS NOT NULL AND inputter_tms IS NOT NULL
        ORDER BY inputter_tms DESC
        LIMIT 50
      `),

      // 8. Transactions (Pemasukan & Pengeluaran posted)
      query(`
        SELECT id, inputter as user, inputter_tms as timestamp, 
               CASE WHEN keterangan = 'pemasukan' THEN 'Income Posted' ELSE 'Expense Posted' END as action,
               'TRX: ' || id || ' via ' || method || ' (Rp ' || amount::text || ')' as details
        FROM transactions
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
      ...invRes.rows, 
      ...mainRes.rows,
      ...custRes.rows,
      ...trxRes.rows,
    ].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    return combined;
  } catch (e) {
    console.error("DB Error: getAuditLogs", e);
    return [];
  }
}
