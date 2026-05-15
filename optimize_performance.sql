-- =============================================================================
-- ISP-FinTrack: Performance Optimization Script
-- Author: Lead Fullstack & Performance Architect
-- Purpose: Create Materialized Views + Indexes untuk menghancurkan
--          double bottleneck TTFB 2.3s dan DB Overload
-- =============================================================================

-- =============================================================================
-- SECTION 1: INDEXES (Run these on Neon.tech Console)
-- Paste dan jalankan query-query berikut secara manual di Neon SQL Editor
-- =============================================================================

-- Index 1: Mempercepat getTransactions() — split_part JOIN + filter keterangan/status
-- Menghilangkan Seq Scan pada tabel transactions yang besar
CREATE INDEX IF NOT EXISTS idx_transactions_keterangan_status_ts
  ON transactions (keterangan, status, timestamp DESC);

-- Index 2: Mempercepat getCustomers() pagination + status filter
CREATE INDEX IF NOT EXISTS idx_customers_status_created
  ON customers (status, "createdAt" DESC);

-- Index 3: BRIN index untuk timestamp (efisien untuk data time-series insert-order)
-- BRIN jauh lebih kecil dari B-Tree tapi sangat efektif untuk range scans pada kolom monotonic
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp_brin
  ON transactions USING BRIN (timestamp);

-- Index 4: Mempercepat split_part(id, '-', 2) yang dipakai di JOIN customers ↔ transactions
-- Functional index agar PostgreSQL bisa menggunakan index untuk ekspresi ini
CREATE INDEX IF NOT EXISTS idx_transactions_customer_split
  ON transactions (split_part(id, '-', 2));

-- Index 5: Mempercepat filter pelanggan aktif per province (dipakai di executive + regional)
CREATE INDEX IF NOT EXISTS idx_customers_province_status
  ON customers (province, status);

-- =============================================================================
-- SECTION 2: MATERIALIZED VIEW — dashboard_summary_mv
-- Pre-kalkulasi KPI bulanan: Revenue, Expenses, ARPU, CAC, Churn Rate
-- Menggantikan: getRevenueGrowthTrend() CTE berat + on-the-fly kalkulasi di getDashboardData()
-- Refresh: Harian oleh instrumentation.ts
-- =============================================================================

DROP MATERIALIZED VIEW IF EXISTS dashboard_summary_mv;

CREATE MATERIALIZED VIEW dashboard_summary_mv AS
WITH
  -- 1. Generate bulan dari awal data hingga sekarang
  month_series AS (
    SELECT TO_CHAR(m, 'YYYY-MM') AS month
    FROM generate_series(
      DATE_TRUNC('month', (SELECT MIN("createdAt" AT TIME ZONE 'Asia/Jakarta') FROM customers)),
      DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Jakarta'),
      '1 month'::interval
    ) AS m
  ),

  -- 2. Revenue per bulan (pemasukan verified)
  monthly_revenue AS (
    SELECT
      TO_CHAR(timestamp AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') AS month,
      SUM(amount)                                                AS revenue
    FROM transactions
    WHERE keterangan = 'pemasukan' AND status = 'Verified'
    GROUP BY 1
  ),

  -- 3. Expenses per bulan (pengeluaran verified)
  monthly_expenses AS (
    SELECT
      TO_CHAR(timestamp AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') AS month,
      SUM(amount)                                                AS expenses
    FROM transactions
    WHERE keterangan = 'pengeluaran' AND status = 'Verified'
    GROUP BY 1
  ),

  -- 4. Akuisisi pelanggan baru per bulan
  monthly_new_customers AS (
    SELECT
      TO_CHAR("createdAt" AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') AS month,
      COUNT(*)                                                      AS new_customers
    FROM customers
    GROUP BY 1
  ),

  -- 5. Pelanggan aktif kumulatif per bulan (snapshot akhir bulan)
  -- Active = pelanggan dengan status 'Active' yang JOIN-nya <= bulan tersebut
  cumulative_active AS (
    SELECT
      ms.month,
      COALESCE((
        SELECT COUNT(*)
        FROM customers c
        WHERE c.status = 'Active'
          AND TO_CHAR(c."createdAt" AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') <= ms.month
      ), 0) AS active_customers
    FROM month_series ms
  ),

  -- 6. Churn per bulan (pelanggan yang menjadi Inactive)
  monthly_churn AS (
    SELECT
      TO_CHAR(inactiveat AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') AS month,
      COUNT(*)                                                     AS churned_count
    FROM inactive_cust
    WHERE inactiveat IS NOT NULL
    GROUP BY 1
  )

SELECT
  ms.month,
  ROW_NUMBER() OVER (ORDER BY ms.month) AS month_index,

  -- Financial KPIs
  COALESCE(mr.revenue,  0)                                           AS revenue,
  COALESCE(me.expenses, 0)                                           AS expenses,
  COALESCE(mr.revenue,  0) - COALESCE(me.expenses, 0)               AS net_profit,

  -- Customer KPIs
  COALESCE(ca.active_customers, 0)                                   AS active_customers,
  COALESCE(mnc.new_customers,   0)                                   AS new_customers,
  COALESCE(mch.churned_count,   0)                                   AS churned_count,

  -- ARPU = Revenue / Active Customers (match business definition)
  CASE
    WHEN COALESCE(ca.active_customers, 0) > 0
    THEN ROUND(COALESCE(mr.revenue, 0) / ca.active_customers, 2)
    ELSE 0
  END AS arpu,

  -- CAC = Total Expenses / New Customers acquired this month
  CASE
    WHEN COALESCE(mnc.new_customers, 0) > 0
    THEN ROUND(COALESCE(me.expenses, 0) / mnc.new_customers, 2)
    ELSE 0
  END AS cac,

  -- Churn Rate % = (Churned / Active at start of month) * 100
  CASE
    WHEN COALESCE(ca.active_customers, 0) > 0
    THEN ROUND((COALESCE(mch.churned_count, 0)::numeric / ca.active_customers) * 100, 2)
    ELSE 0
  END AS churn_rate,

  -- Metadata
  (NOW() AT TIME ZONE 'Asia/Jakarta') AS last_refreshed_at

FROM month_series ms
LEFT JOIN monthly_revenue       mr  ON ms.month = mr.month
LEFT JOIN monthly_expenses      me  ON ms.month = me.month
LEFT JOIN monthly_new_customers mnc ON ms.month = mnc.month
LEFT JOIN cumulative_active     ca  ON ms.month = ca.month
LEFT JOIN monthly_churn         mch ON ms.month = mch.month

ORDER BY ms.month ASC;

-- Index unik diperlukan agar REFRESH CONCURRENTLY bisa dijalankan
CREATE UNIQUE INDEX idx_dashboard_summary_mv_month
  ON dashboard_summary_mv (month);

-- =============================================================================
-- SECTION 3: MATERIALIZED VIEW — profitability_summary_mv
-- Pre-kalkulasi profitabilitas: Revenue, Expenses, Gross Profit, Net Profit,
-- Waterfall Components, dan Tren Bulanan per date range
-- Menggantikan: CTE berlapis di getProfitabilityData() + getTransactions(24)
-- =============================================================================

DROP MATERIALIZED VIEW IF EXISTS profitability_summary_mv;

CREATE MATERIALIZED VIEW profitability_summary_mv AS
WITH
  -- 1. Monthly revenue (pemasukan verified)
  monthly_revenue AS (
    SELECT
      TO_CHAR(timestamp AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') AS month,
      SUM(amount)                                                AS revenue
    FROM transactions
    WHERE keterangan = 'pemasukan' AND status = 'Verified'
    GROUP BY 1
  ),

  -- 2. Monthly expenses per category (pengeluaran verified)
  monthly_expenses AS (
    SELECT
      TO_CHAR(timestamp AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') AS month,
      COALESCE(type, 'General Expense')                          AS category,
      SUM(amount)                                                AS expense_amount
    FROM transactions
    WHERE keterangan = 'pengeluaran' AND status = 'Verified'
    GROUP BY 1, 2
  ),

  -- 3. Monthly expenses total
  monthly_expense_total AS (
    SELECT
      month,
      SUM(expense_amount) AS total_expenses
    FROM monthly_expenses
    GROUP BY month
  ),

  -- 4. Direct costs (COGS) per bulan
  -- Business definition: Server, Maintenance, Listrik, Hardware adalah Direct Cost
  monthly_direct_costs AS (
    SELECT
      TO_CHAR(timestamp AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') AS month,
      SUM(amount) AS direct_costs
    FROM transactions
    WHERE keterangan = 'pengeluaran'
      AND status = 'Verified'
      AND (
        LOWER(type) LIKE '%server%'
        OR LOWER(type) LIKE '%maintenance%'
        OR LOWER(type) LIKE '%listrik%'
        OR LOWER(type) LIKE '%hardware%'
        OR LOWER(type) LIKE '%ont%'
        OR LOWER(type) LIKE '%odp%'
        OR LOWER(type) LIKE '%olt%'
      )
    GROUP BY 1
  ),

  -- 5. Expense waterfall components (all-time, untuk filter client-side)
  expense_categories AS (
    SELECT
      COALESCE(type, 'General Expense') AS category,
      SUM(amount)                        AS total_amount
    FROM transactions
    WHERE keterangan = 'pengeluaran' AND status = 'Verified'
    GROUP BY 1
  ),

  -- 6. Generate bulan dari awal data hingga sekarang
  month_series AS (
    SELECT TO_CHAR(m, 'YYYY-MM') AS month
    FROM generate_series(
      DATE_TRUNC('month', (SELECT MIN("createdAt" AT TIME ZONE 'Asia/Jakarta') FROM customers)),
      DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Jakarta'),
      '1 month'::interval
    ) AS m
  )

SELECT
  ms.month,

  -- Revenue, Expenses, Net Profit per bulan
  COALESCE(mr.revenue,       0)                                AS revenue,
  COALESCE(met.total_expenses, 0)                              AS expenses,
  COALESCE(mdc.direct_costs,  0)                              AS direct_costs,
  COALESCE(mr.revenue, 0) - COALESCE(mdc.direct_costs, 0)    AS gross_profit,
  COALESCE(mr.revenue, 0) - COALESCE(met.total_expenses, 0)  AS net_profit,

  -- EBITDA Margin %
  CASE
    WHEN COALESCE(mr.revenue, 0) > 0
    THEN ROUND(
      ((COALESCE(mr.revenue, 0) - COALESCE(met.total_expenses, 0))::numeric
       / mr.revenue) * 100, 2
    )
    ELSE 0
  END AS ebitda_margin,

  -- MoM Revenue Trend %
  ROUND(
    (
      (COALESCE(mr.revenue, 0)
       - LAG(COALESCE(mr.revenue, 0)) OVER (ORDER BY ms.month ASC))
      / NULLIF(LAG(COALESCE(mr.revenue, 0)) OVER (ORDER BY ms.month ASC), 0)
    ) * 100, 1
  ) AS revenue_trend_pct,

  -- MoM Net Profit Trend %
  ROUND(
    (
      (COALESCE(mr.revenue, 0) - COALESCE(met.total_expenses, 0)
       - LAG(COALESCE(mr.revenue, 0) - COALESCE(met.total_expenses, 0)) OVER (ORDER BY ms.month ASC))
      / NULLIF(
          ABS(LAG(COALESCE(mr.revenue, 0) - COALESCE(met.total_expenses, 0)) OVER (ORDER BY ms.month ASC)),
          0
        )
    ) * 100, 1
  ) AS net_profit_trend_pct,

  -- Metadata
  (NOW() AT TIME ZONE 'Asia/Jakarta') AS last_refreshed_at

FROM month_series ms
LEFT JOIN monthly_revenue      mr  ON ms.month = mr.month
LEFT JOIN monthly_expense_total met ON ms.month = met.month
LEFT JOIN monthly_direct_costs  mdc ON ms.month = mdc.month

ORDER BY ms.month ASC;

-- Index unik untuk REFRESH CONCURRENTLY
CREATE UNIQUE INDEX idx_profitability_summary_mv_month
  ON profitability_summary_mv (month);

-- =============================================================================
-- SECTION 4: MATERIALIZED VIEW — executive_summary_mv
-- Pre-kalkulasi untuk halaman Executive Summary (3 Tab):
--   Tab 1: Financial & Profitability (Revenue, Gross Profit, Net Profit, Expense)
--   Tab 2: Inventory & Assets (stats dari asset_roster + stock_asset_roster)
--   Tab 3: Regional Analytics (profit & subscriber per province)
-- Menggantikan: getExecutiveReport() yang memuat 7 roundtrip DB + 
--               heavy JS-side aggregation di processedData useMemo
-- =============================================================================

DROP MATERIALIZED VIEW IF EXISTS executive_summary_mv;

CREATE MATERIALIZED VIEW executive_summary_mv AS
WITH
  -- =====================================================================
  -- FINANCIAL BLOCK
  -- =====================================================================

  -- 1. Monthly revenue & expenses (untuk tren chart)
  monthly_financials AS (
    SELECT
      TO_CHAR(timestamp AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') AS month,
      SUM(CASE WHEN keterangan = 'pemasukan'  THEN amount ELSE 0 END) AS revenue,
      SUM(CASE WHEN keterangan = 'pengeluaran' THEN amount ELSE 0 END) AS expenses
    FROM transactions
    WHERE status = 'Verified'
    GROUP BY 1
  ),

  -- 2. Direct costs (COGS) — used for Gross Profit
  monthly_direct_costs AS (
    SELECT
      TO_CHAR(timestamp AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') AS month,
      SUM(amount) AS direct_costs
    FROM transactions
    WHERE keterangan = 'pengeluaran'
      AND status = 'Verified'
      AND (
        LOWER(type) LIKE '%server%'
        OR LOWER(type) LIKE '%maintenance%'
        OR LOWER(type) LIKE '%listrik%'
        OR LOWER(type) LIKE '%hardware%'
        OR LOWER(type) LIKE '%ont%'
        OR LOWER(type) LIKE '%odp%'
        OR LOWER(type) LIKE '%olt%'
      )
    GROUP BY 1
  ),

  -- 3. Province-level revenue (dari customers JOIN transactions)
  province_revenue AS (
    SELECT
      INITCAP(TRIM(c.province))     AS province,
      SUM(t.amount)                 AS revenue
    FROM transactions t
    JOIN customers c ON split_part(t.id, '-', 2) = c.id
    WHERE t.keterangan = 'pemasukan'
      AND t.status = 'Verified'
      AND c.province IS NOT NULL
    GROUP BY 1
  ),

  -- 4. Province-level expenses (dari transactions.city → regencies → provinces)
  province_expenses AS (
    SELECT
      INITCAP(TRIM(p.province))    AS province,
      SUM(t.amount)                AS expenses
    FROM transactions t
    LEFT JOIN regencies r ON LOWER(TRIM(t.city)) = LOWER(TRIM(r.regency))
    LEFT JOIN provinces p ON r.province_id = p.id
    WHERE t.keterangan = 'pengeluaran'
      AND t.status = 'Verified'
    GROUP BY 1
  ),

  -- 5. Active customers per province
  province_customers AS (
    SELECT
      INITCAP(TRIM(province))  AS province,
      COUNT(*)                 AS active_customers
    FROM customers
    WHERE status = 'Active' AND province IS NOT NULL
    GROUP BY 1
  ),

  -- =====================================================================
  -- INVENTORY BLOCK (pre-aggregate dari asset_roster + stock_asset_roster)
  -- =====================================================================

  -- 6. Total asset counts + valuation per condition
  asset_stats AS (
    SELECT
      'deployed'              AS asset_pool,
      type,
      INITCAP(TRIM(COALESCE(province, 'Unknown'))) AS province,
      LOWER(TRIM(condition)) AS condition,
      kepemilikan,
      COUNT(*)               AS asset_count,
      SUM(COALESCE(harga_beli, 0)) AS total_value
    FROM asset_roster
    WHERE type IS NOT NULL
    GROUP BY 1, 2, 3, 4, 5

    UNION ALL

    SELECT
      'stock'                AS asset_pool,
      type,
      INITCAP(TRIM(COALESCE(province, 'Unknown'))) AS province,
      LOWER(TRIM(condition)) AS condition,
      kepemilikan,
      COUNT(*)               AS asset_count,
      SUM(COALESCE(harga_beli, 0)) AS total_value
    FROM stock_asset_roster
    WHERE type IS NOT NULL
    GROUP BY 1, 2, 3, 4, 5
  ),

  -- 7. All-time financial totals (untuk KPI Cards di Tab Financial)
  all_time_financial AS (
    SELECT
      SUM(CASE WHEN keterangan = 'pemasukan'  THEN amount ELSE 0 END) AS total_revenue,
      SUM(CASE WHEN keterangan = 'pengeluaran' THEN amount ELSE 0 END) AS total_expenses
    FROM transactions
    WHERE status = 'Verified'
  ),

  all_time_direct_costs AS (
    SELECT SUM(amount) AS total_direct_costs
    FROM transactions
    WHERE keterangan = 'pengeluaran'
      AND status = 'Verified'
      AND (
        LOWER(type) LIKE '%server%'
        OR LOWER(type) LIKE '%maintenance%'
        OR LOWER(type) LIKE '%listrik%'
        OR LOWER(type) LIKE '%hardware%'
        OR LOWER(type) LIKE '%ont%'
        OR LOWER(type) LIKE '%odp%'
        OR LOWER(type) LIKE '%olt%'
      )
  ),

  -- 8. Generate month series
  month_series AS (
    SELECT TO_CHAR(m, 'YYYY-MM') AS month
    FROM generate_series(
      DATE_TRUNC('month', (SELECT MIN("createdAt" AT TIME ZONE 'Asia/Jakarta') FROM customers)),
      DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Jakarta'),
      '1 month'::interval
    ) AS m
  )

-- =====================================================================
-- OUTPUT: Multi-section JSON-ready rows
-- section codes:
--   '1_monthly_financials'  → Tab Financial tren chart
--   '2_province_profit'     → Tab Regional: profit per province
--   '3_province_customers'  → Tab Regional: subscriber per province
--   '4_asset_stats'         → Tab Inventory: asset breakdown
--   '5_kpi_totals'          → Tab Financial: all-time KPI cards
-- =====================================================================

-- 1. Monthly Financials (tren bulanan)
SELECT
  '1_monthly_financials'              AS section,
  ms.month                            AS dimension,
  ms.month                            AS month,
  COALESCE(mf.revenue, 0)             AS revenue,
  COALESCE(mf.expenses, 0)            AS expenses,
  COALESCE(mdc.direct_costs, 0)       AS direct_costs,
  COALESCE(mf.revenue, 0) - COALESCE(mdc.direct_costs, 0)  AS gross_profit,
  COALESCE(mf.revenue, 0) - COALESCE(mf.expenses, 0)        AS net_profit,
  NULL::text                          AS province,
  NULL::text                          AS asset_pool,
  NULL::text                          AS asset_type,
  NULL::text                          AS condition,
  NULL::text                          AS kepemilikan,
  0::bigint                           AS asset_count,
  0::numeric                          AS total_asset_value,
  0::bigint                           AS subscriber_count,
  (NOW() AT TIME ZONE 'Asia/Jakarta') AS last_refreshed_at
FROM month_series ms
LEFT JOIN monthly_financials   mf  ON ms.month = mf.month
LEFT JOIN monthly_direct_costs mdc ON ms.month = mdc.month

UNION ALL

-- 2. Province Profit (Regional Tab)
SELECT
  '2_province_profit'                 AS section,
  COALESCE(pr.province, pe.province, 'Unknown') AS dimension,
  NULL::text                          AS month,
  COALESCE(pr.revenue, 0)            AS revenue,
  COALESCE(pe.expenses, 0)           AS expenses,
  0                                   AS direct_costs,
  0                                   AS gross_profit,
  COALESCE(pr.revenue, 0) - COALESCE(pe.expenses, 0) AS net_profit,
  COALESCE(pr.province, pe.province, 'Unknown') AS province,
  NULL::text                          AS asset_pool,
  NULL::text                          AS asset_type,
  NULL::text                          AS condition,
  NULL::text                          AS kepemilikan,
  0::bigint                           AS asset_count,
  0::numeric                          AS total_asset_value,
  0::bigint                           AS subscriber_count,
  (NOW() AT TIME ZONE 'Asia/Jakarta') AS last_refreshed_at
FROM province_revenue pr
FULL OUTER JOIN province_expenses pe
  ON LOWER(TRIM(pr.province)) = LOWER(TRIM(pe.province))

UNION ALL

-- 3. Province Subscribers (Regional Tab)
SELECT
  '3_province_customers'              AS section,
  pc.province                         AS dimension,
  NULL::text                          AS month,
  0                                   AS revenue,
  0                                   AS expenses,
  0                                   AS direct_costs,
  0                                   AS gross_profit,
  0                                   AS net_profit,
  pc.province                         AS province,
  NULL::text                          AS asset_pool,
  NULL::text                          AS asset_type,
  NULL::text                          AS condition,
  NULL::text                          AS kepemilikan,
  0::bigint                           AS asset_count,
  0::numeric                          AS total_asset_value,
  pc.active_customers                 AS subscriber_count,
  (NOW() AT TIME ZONE 'Asia/Jakarta') AS last_refreshed_at
FROM province_customers pc

UNION ALL

-- 4. Asset Stats (Inventory Tab)
SELECT
  '4_asset_stats'                     AS section,
  ast.asset_pool || '_' || ast.type   AS dimension,
  NULL::text                          AS month,
  0                                   AS revenue,
  0                                   AS expenses,
  0                                   AS direct_costs,
  0                                   AS gross_profit,
  0                                   AS net_profit,
  ast.province                        AS province,
  ast.asset_pool                      AS asset_pool,
  ast.type                            AS asset_type,
  ast.condition                       AS condition,
  ast.kepemilikan                     AS kepemilikan,
  ast.asset_count                     AS asset_count,
  ast.total_value                     AS total_asset_value,
  0::bigint                           AS subscriber_count,
  (NOW() AT TIME ZONE 'Asia/Jakarta') AS last_refreshed_at
FROM asset_stats ast

UNION ALL

-- 5. KPI Totals (Financial Tab - All-time cards)
SELECT
  '5_kpi_totals'                      AS section,
  'all_time'                          AS dimension,
  NULL::text                          AS month,
  atf.total_revenue                   AS revenue,
  atf.total_expenses                  AS expenses,
  COALESCE(atdc.total_direct_costs, 0) AS direct_costs,
  atf.total_revenue - COALESCE(atdc.total_direct_costs, 0) AS gross_profit,
  atf.total_revenue - atf.total_expenses                   AS net_profit,
  NULL::text                          AS province,
  NULL::text                          AS asset_pool,
  NULL::text                          AS asset_type,
  NULL::text                          AS condition,
  NULL::text                          AS kepemilikan,
  0::bigint                           AS asset_count,
  0::numeric                          AS total_asset_value,
  (SELECT COUNT(*) FROM customers WHERE status = 'Active')::bigint AS subscriber_count,
  (NOW() AT TIME ZONE 'Asia/Jakarta') AS last_refreshed_at
FROM all_time_financial atf
CROSS JOIN all_time_direct_costs atdc;

-- Composite index untuk query cepat per section
CREATE INDEX idx_executive_summary_mv_section
  ON executive_summary_mv (section, dimension);

-- =============================================================================
-- SECTION 5: INITIAL REFRESH (Run after creating views)
-- =============================================================================

REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_summary_mv;
REFRESH MATERIALIZED VIEW CONCURRENTLY profitability_summary_mv;
REFRESH MATERIALIZED VIEW executive_summary_mv;

-- =============================================================================
-- SECTION 6: VERIFICATION QUERIES
-- Run these to confirm data accuracy
-- =============================================================================

-- Cek dashboard_summary_mv berisi data
SELECT month, revenue, expenses, net_profit, active_customers, arpu, churn_rate
FROM dashboard_summary_mv
ORDER BY month DESC
LIMIT 6;

-- Cek profitability_summary_mv berisi data
SELECT month, revenue, expenses, gross_profit, net_profit, ebitda_margin, revenue_trend_pct
FROM profitability_summary_mv
ORDER BY month DESC
LIMIT 6;

-- Cek executive_summary_mv per section
SELECT section, COUNT(*) as row_count
FROM executive_summary_mv
GROUP BY section
ORDER BY section;

-- Benchmark query performance (target < 5ms setelah MV populated)
EXPLAIN ANALYZE SELECT * FROM dashboard_summary_mv ORDER BY month DESC LIMIT 12;
EXPLAIN ANALYZE SELECT * FROM profitability_summary_mv ORDER BY month DESC LIMIT 24;
EXPLAIN ANALYZE SELECT * FROM executive_summary_mv WHERE section = '1_monthly_financials';
