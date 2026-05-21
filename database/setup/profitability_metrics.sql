-- 
-- Struktur dan Hierarki dB
-- 
SELECT
    schema_name,
    object_type,
    object_name
FROM (
    -- 1. Get Tables, Views, Materialized Views, and Sequences
    SELECT
        n.nspname AS schema_name,
        CASE c.relkind
            WHEN 'r' THEN 'table'
            WHEN 'v' THEN 'view'
            WHEN 'm' THEN 'materialized_view'
            WHEN 'S' THEN 'sequence'
        END AS object_type,
        c.relname AS object_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r', 'v', 'm', 'S')
      AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    UNION ALL
    -- 2. Get Functions / Procedures
    SELECT
        n.nspname AS schema_name,
        'function' AS object_type,
        p.proname AS object_name
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    UNION ALL
    -- 3. Get Triggers (Excluding internal/system triggers)
    SELECT
        n.nspname AS schema_name,
        'trigger' AS object_type,
        t.tgname AS object_name
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE NOT t.tgisinternal -- Hanya trigger buatan user
      AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
) AS database_objects
ORDER BY
    object_type ASC,
    object_name ASC;


--
-- Page Dashboard
--
WITH month_series AS (
    -- 1. Membuat urutan bulan untuk tren (Juni 2025 - Mei 2026)
    SELECT TO_CHAR(m, 'YYYY-MM') as month
    FROM generate_series('2025-06-01'::date, '2026-05-01'::date, '1 month') as m
),
monthly_revenue AS (
    -- 2. Menghitung Pendapatan per bulan (Pemasukan Verified)
    SELECT
        TO_CHAR(timestamp AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') as month,
        SUM(amount::numeric) as revenue
    FROM transactions
    WHERE keterangan = 'pemasukan' AND status = 'Verified'
    GROUP BY 1
),
monthly_expenses AS (
    -- 3. Menghitung Biaya Operasional per bulan (Pengeluaran Verified)
    SELECT
        TO_CHAR(timestamp AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') as month,
        SUM(amount::numeric) as expenses
    FROM transactions
    WHERE keterangan = 'pengeluaran' AND status = 'Verified'
    GROUP BY 1
),
customer_base_prep AS (
    -- 4a. Menghitung Akuisisi Pelanggan Baru & Pelanggan Aktif per bulan (Pre-aggregation)
    SELECT
        TO_CHAR("createdAt"::date AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') as month,
        COUNT(*) as new_customers,
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active_retained
    FROM customers
    GROUP BY 1
),
customer_base AS (
    -- 4b. Menghitung Basis Kumulatif menggunakan Window Function (Fix Error 42803)
    SELECT
        month,
        new_customers,
        SUM(active_retained) OVER (ORDER BY month ASC) as total_active_snapshot
    FROM customer_base_prep
),
churn_events AS (
    -- 5. Menghitung Pelanggan yang Berhenti (Churn)
    SELECT
        TO_CHAR(inactiveat AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') as month,
        COUNT(*) as churn_count
    FROM inactive_cust
    GROUP BY 1
),
final_metrics AS (
    -- 6. Menggabungkan semua metrik ke dalam satu timeline
    SELECT
        ms.month,
        COALESCE(mr.revenue, 0) as total_revenue,
        COALESCE(me.expenses, 0) as total_expenses,
        COALESCE(cb.new_customers, 0) as new_customers,
        COALESCE(cb.total_active_snapshot, 0) as active_customers,
        COALESCE(ce.churn_count, 0) as churned_customers,
        -- ARPU = Revenue / Total Active
        CASE WHEN COALESCE(cb.total_active_snapshot, 0) > 0
             THEN COALESCE(mr.revenue, 0) / cb.total_active_snapshot
             ELSE 0 END as arpu,
        -- CAC = Expenses / New Customers
        CASE WHEN COALESCE(cb.new_customers, 0) > 0
             THEN COALESCE(me.expenses, 0) / cb.new_customers
             ELSE 0 END as cac,
        -- Churn Rate % = (Churned / Active) * 100
        CASE WHEN COALESCE(cb.total_active_snapshot, 0) > 0
             THEN (COALESCE(ce.churn_count, 0)::numeric / cb.total_active_snapshot) * 100
             ELSE 0 END as churn_rate
    FROM month_series ms
    LEFT JOIN monthly_revenue mr ON ms.month = mr.month
    LEFT JOIN monthly_expenses me ON ms.month = me.month
    LEFT JOIN customer_base cb ON ms.month = cb.month
    LEFT JOIN churn_events ce ON ms.month = ce.month
)
-- 7. Output Final untuk validasi beserta Tren MoM
SELECT
    month,
    total_revenue as "Total Revenue",
    ROUND(arpu, 0) as "ARPU",
    ROUND(cac, 0) as "CAC",
    ROUND(churn_rate, 2) as "Churn Rate (%)",
    active_customers as "Customer Growth (Chart)",
    total_revenue as "Revenue Growth (Chart)",

    -- Tren MoM untuk validasi indikator panah (Up/Down)
    ROUND(((total_revenue - LAG(total_revenue) OVER (ORDER BY month ASC)) / NULLIF(LAG(total_revenue) OVER (ORDER BY month ASC), 0)) * 100, 1) as "Rev Trend %",

    -- Menghitung Tren ARPU (%)
    ROUND(((arpu - LAG(arpu) OVER (ORDER BY month ASC)) / NULLIF(LAG(arpu) OVER (ORDER BY month ASC), 0)) * 100, 1) as "ARPU Trend %",

    -- Menghitung Tren CAC (%)
    ROUND(((cac - LAG(cac) OVER (ORDER BY month ASC)) / NULLIF(LAG(cac) OVER (ORDER BY month ASC), 0)) * 100, 1) as "CAC Trend %",

    -- Menghitung Tren Churn Rate (%)
    ROUND(((churn_rate - LAG(churn_rate) OVER (ORDER BY month ASC)) / NULLIF(LAG(churn_rate) OVER (ORDER BY month ASC), 0)) * 100, 1) as "Churn Trend %"

FROM final_metrics
ORDER BY month DESC;



--
-- Page Profitability
--
-- VALIDASI PROFITABILITY ANALYSIS (FIXED UNION COLUMNS)
-- Target: Revenue (Range), EBITDA Margin, Net Profit, Waterfall & Trend

WITH date_range AS (
    -- 1. Menentukan Range (Default: Juni 2025 - Mei 2026)
    SELECT
        '2026-04-01'::date as start_date,
        '2026-04-30'::date as end_date
),
revenue_range AS (
    -- 2. Menghitung Total Revenue dalam Range
    SELECT
        SUM(amount::numeric) as total_revenue
    FROM transactions, date_range
    WHERE keterangan = 'pemasukan'
      AND status = 'Verified'
      AND (timestamp AT TIME ZONE 'Asia/Jakarta')::date BETWEEN start_date AND end_date
),
expense_components AS (
    -- 3. Menghitung Komponen Pengeluaran
    SELECT
        COALESCE(category, 'General Expense') as category,
        SUM(amount::numeric) as total_amount
    FROM expenses, date_range
    WHERE (date AT TIME ZONE 'Asia/Jakarta')::date BETWEEN start_date AND end_date
    GROUP BY 1
),
total_expenses AS (
    -- 4. Menghitung Total Pengeluaran
    SELECT SUM(total_amount) as total_opex FROM expense_components
),
monthly_trend AS (
    -- 5. Menghitung Tren Laba Bersih Bulanan
    SELECT
        TO_CHAR(ms, 'YYYY-MM') as month,
        COALESCE((
            SELECT SUM(amount::numeric) FROM transactions
            WHERE keterangan = 'pemasukan' AND status = 'Verified'
            AND TO_CHAR(timestamp AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') = TO_CHAR(ms, 'YYYY-MM')
        ), 0) -
        COALESCE((
            SELECT SUM(amount::numeric) FROM expenses
            WHERE TO_CHAR(date AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') = TO_CHAR(ms, 'YYYY-MM')
        ), 0) as net_profit
    FROM generate_series('2025-06-01'::date, '2026-05-01'::date, '1 month') as ms
),
kpi_final AS (
    -- 6. Kalkulasi Metrik Utama
    SELECT
        r.total_revenue as revenue,
        e.total_opex as opex,
        (r.total_revenue - e.total_opex) as profit,
        CASE WHEN r.total_revenue > 0
             THEN ((r.total_revenue - e.total_opex) / r.total_revenue) * 100
             ELSE 0 END as margin
    FROM revenue_range r, total_expenses e
)
-- 7. Output Final (Diselaraskan 4 Kolom: section, label, value, margin_pct)
-- BAGIAN A: KPI CARDS
SELECT '1_KPI_CARDS' as section, 'REVENUE (RANGE)' as label, revenue as value, NULL::numeric as margin_pct FROM kpi_final
UNION ALL
SELECT '1_KPI_CARDS' as section, 'NET PROFIT' as label, profit as value, NULL::numeric as margin_pct FROM kpi_final
UNION ALL
SELECT '1_KPI_CARDS' as section, 'EBITDA MARGIN' as label, margin as value, margin as margin_pct FROM kpi_final

UNION ALL

-- BAGIAN B: REVENUE WATERFALL COMPONENTS
SELECT '2_WATERFALL_CHART' as section, 'Revenue' as label, revenue as value, NULL::numeric as margin_pct FROM kpi_final
UNION ALL
SELECT '2_WATERFALL_CHART' as section, category as label, -total_amount as value, NULL::numeric as margin_pct FROM expense_components

UNION ALL

-- BAGIAN C: PROFITABILITY TREND
SELECT '3_TREND_CHART' as section, month as label, net_profit as value, NULL::numeric as margin_pct FROM monthly_trend

ORDER BY section ASC, label DESC;



--
-- Page Executive Summary
--
-- VALIDASI EXECUTIVE SUMMARY (ISP-FinTrack)
-- Target: Financial, Inventory, Assets, & Regional Analysis

WITH date_range AS (
    -- 1. Menentukan Range (Sesuaikan jika Anda mengubah filter di UI)
    SELECT
        '2025-06-01'::date as start_date,
        '2026-05-31'::date as end_date
),
financial_metrics AS (
    -- 2. Kalkulasi Metrik Finansial (Revenue, Expense, Gross & Net Profit)
    SELECT
        SUM(CASE WHEN keterangan = 'pemasukan' THEN amount::numeric ELSE 0 END) as revenue,
        SUM(CASE WHEN keterangan = 'pengeluaran' THEN amount::numeric ELSE 0 END) as total_expense,
        -- Gross Profit: Revenue - Direct Costs (Server, Maintenance, Listrik, Hardware)
        SUM(CASE WHEN keterangan = 'pemasukan' THEN amount::numeric ELSE 0 END) -
        SUM(CASE
            WHEN keterangan = 'pengeluaran' AND (
                LOWER(type) LIKE '%server%' OR
                LOWER(type) LIKE '%maintenance%' OR
                LOWER(type) LIKE '%listrik%' OR
                LOWER(type) LIKE '%hardware%'
            ) THEN amount::numeric ELSE 0 END) as gross_profit,
        -- Net Profit: Revenue - Total Expense
        SUM(CASE WHEN keterangan = 'pemasukan' THEN amount::numeric ELSE 0 END) -
        SUM(CASE WHEN keterangan = 'pengeluaran' THEN amount::numeric ELSE 0 END) as net_profit
    FROM transactions, date_range
    WHERE status = 'Verified'
      AND (timestamp AT TIME ZONE 'Asia/Jakarta')::date BETWEEN start_date AND end_date
),
asset_valuation AS (
    -- 3. Kalkulasi Valuasi Aset (Deployed & Warehouse)
    SELECT
        SUM(harga_beli) as total_val
    FROM (
        SELECT harga_beli FROM asset_roster
        UNION ALL
        SELECT harga_beli FROM stock_asset_roster
    ) all_assets
),
regional_profit AS (
    -- 4. Profit Bersih tiap Province
    SELECT
        prov,
        SUM(rev) - SUM(exp) as net_profit_prov
    FROM (
        -- Revenue dari Pelanggan di Provinsi tsb
        SELECT
            c.province as prov,
            SUM(t.amount::numeric) as rev,
            0 as exp
        FROM transactions t
        JOIN customers c ON split_part(t.id, '-', 2) = c.id
        WHERE t.keterangan = 'pemasukan' AND t.status = 'Verified'
        GROUP BY 1
        UNION ALL
        -- Expense di Lokasi/Provinsi tsb
        SELECT
            COALESCE(p.province, 'Other') as prov, -- Lokasi expense
            0 as rev,
            SUM(amount::numeric) as exp
        FROM transactions t
        left join regencies r on t.city = r.regency
        left join provinces p on r.province_id = p.id
        WHERE keterangan = 'pengeluaran' AND status = 'Verified'
        GROUP BY 1
    ) combined
    GROUP BY prov
),
monthly_trajectory AS (
    -- 5. Data untuk Chart "Revenue & Net Profit Trajectory"
    SELECT
        TO_CHAR(ms, 'YYYY-MM') as month,
        COALESCE((SELECT SUM(amount::numeric) FROM transactions WHERE keterangan = 'pemasukan' AND status = 'Verified' AND TO_CHAR(timestamp AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') = TO_CHAR(ms, 'YYYY-MM')), 0) as rev,
        COALESCE((SELECT SUM(amount::numeric) FROM transactions WHERE keterangan = 'pengeluaran' AND status = 'Verified' AND TO_CHAR(timestamp AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') = TO_CHAR(ms, 'YYYY-MM')), 0) as exp
    FROM generate_series('2025-06-01'::date, '2026-05-01'::date, '1 month') as ms
)
-- 6. Output Final untuk Validasi
SELECT '1_FINANCIAL' as section, 'Revenue' as label, revenue as value FROM financial_metrics
UNION ALL
SELECT '1_FINANCIAL', 'Gross Profit', gross_profit FROM financial_metrics
UNION ALL
SELECT '1_FINANCIAL', 'Net Profit', net_profit FROM financial_metrics
UNION ALL
SELECT '1_FINANCIAL', 'Total Expense', total_expense FROM financial_metrics
UNION ALL
SELECT '2_INVENTORY', 'Total Asset Valuation', total_val FROM asset_valuation
UNION ALL
SELECT '3_REGIONAL', prov, net_profit_prov FROM regional_profit
UNION ALL
SELECT '4_CHART_TRAJECTORY', month, rev - exp FROM monthly_trajectory -- Net Profit line
ORDER BY section ASC, value DESC;


--
-- Page Service Tiers --> Grace Period
--
-- VALIDASI GRACE PERIOD & BILLING STATUS (ISP-FinTrack)
-- Berdasarkan logika pada src/actions/customers.ts -> getCustomers()
SELECT
    c.id,
    c.name,
    c.service,
    c.status,
    c.city,
    c."createdAt" as join_date,
    EXTRACT(DAY FROM (c."createdAt"::timestamptz AT TIME ZONE 'Asia/Jakarta')) as due_day
FROM customers c
WHERE c.status = 'Active'
  AND (
    -- Kondisi 1: Jatuh tempo BESOK (H-1) berdasarkan waktu Jakarta
    EXTRACT(DAY FROM (c."createdAt"::timestamptz AT TIME ZONE 'Asia/Jakarta')) =
    EXTRACT(DAY FROM (NOW() AT TIME ZONE 'Asia/Jakarta' + INTERVAL '1 day'))
    OR
    -- Kondisi 2: Sudah berlangganan > 1 bulan
    c."createdAt"::timestamptz < (NOW() - INTERVAL '1 month')
  )
  -- Pengecekan Pembayaran (Berlaku untuk Kondisi 1 & 2)
  AND NOT EXISTS (
    SELECT 1 FROM transactions t
    WHERE split_part(t.id, '-', 2) = c.id
      AND t.keterangan = 'pemasukan'
      AND t.status = 'Verified'
      AND EXTRACT(MONTH FROM (t.timestamp AT TIME ZONE 'Asia/Jakarta')) = EXTRACT(MONTH FROM (NOW() AT TIME ZONE 'Asia/Jakarta'))
      AND EXTRACT(YEAR FROM (t.timestamp AT TIME ZONE 'Asia/Jakarta')) = EXTRACT(YEAR FROM (NOW() AT TIME ZONE 'Asia/Jakarta'))
  )
ORDER BY due_day ASC;


--
-- Page Regional Analysis --> AR Aging
--
select * from ar_aging_mv;

--
-- Page Predictive Analysis
--
select * from predictive_metrics_mv;