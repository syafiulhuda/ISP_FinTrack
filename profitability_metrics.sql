-- Daftar pelanggan yang akan jatuh tempo
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


WITH RECURSIVE MonthSeries AS (
    -- 1. Generate month axis for 2026
    SELECT '2026-01' as month
    UNION ALL
    SELECT TO_CHAR((month || '-01')::date + interval '1 month', 'YYYY-MM')
    FROM MonthSeries
    WHERE month < '2026-12'
),
MonthlyRawData AS (
    -- 2. Aggregate raw counts and sums per month matching timezone 'Asia/Jakarta'
    SELECT
        m.month,
        -- Total Revenue (Verified Pemasukan)
        COALESCE((
            SELECT SUM(amount)
            FROM transactions t
            WHERE t.status = 'Verified' AND t.keterangan = 'pemasukan'
              AND TO_CHAR(t.timestamp AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') = m.month
        ), 0) as raw_revenue,

        -- Total Expenses (Verified Pengeluaran)
        COALESCE((
            SELECT SUM(amount)
            FROM transactions t
            WHERE t.status = 'Verified' AND t.keterangan = 'pengeluaran'
              AND TO_CHAR(t.timestamp AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') = m.month
        ), 0) as raw_expenses,

        -- New Customers (for CAC denominator)
        (SELECT COUNT(*) FROM customers c
         WHERE TO_CHAR(c."createdAt" AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') = m.month
        ) as new_customers_this_month,

        -- Cumulative Active Customers (for ARPU and Churn denominator)
        (SELECT COUNT(*) FROM customers c
         WHERE status = 'Active' AND TO_CHAR(c."createdAt" AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') <= m.month
        ) as cumulative_active,

        -- Inactive / Churned Customers
        (SELECT COUNT(*) FROM inactive_cust ic
         WHERE TO_CHAR(ic.inactiveat::date, 'YYYY-MM') = m.month
        ) as churned_this_month
    FROM MonthSeries m
),
DashboardMetrics AS (
    -- 3. Calculate actual KPI values
    SELECT
        month,
        raw_revenue as total_revenue,
        -- ARPU = Revenue / Cumulative Active Customers
        CASE WHEN cumulative_active = 0 THEN 0 ELSE raw_revenue / cumulative_active END as arpu,

        -- CAC = Expenses / New Customers
        CASE WHEN new_customers_this_month = 0 THEN 0 ELSE raw_expenses / new_customers_this_month END as cac,

        -- Churn Rate = (Churned / Cumulative Active Customers) * 100
        CASE WHEN cumulative_active = 0 THEN 0 ELSE (churned_this_month::numeric / cumulative_active) * 100 END as churn_rate,

        -- Active Customer Growth (for Area Chart)
        cumulative_active as customer_growth
    FROM MonthlyRawData
)
-- 4. Calculate Month-over-Month (MoM) Trend Percentages & Format Currency
SELECT
    d.month,

    -- Format Revenue (Rp X.XXX)
    'Rp ' || REPLACE(TO_CHAR(d.total_revenue, 'FM999,999,999,990'), ',', '.') as total_revenue,
    CASE
        WHEN COALESCE(prev.total_revenue, 0) = 0 AND d.total_revenue > 0 THEN '+100%'
        WHEN COALESCE(prev.total_revenue, 0) = 0 THEN '0%'
        ELSE ROUND(((d.total_revenue - prev.total_revenue) / NULLIF(prev.total_revenue, 0)) * 100, 1) || '%'
    END as revenue_trend_pct,

    -- Format ARPU (Rp X.XXX)
    'Rp ' || REPLACE(TO_CHAR(ROUND(d.arpu, 0), 'FM999,999,999,990'), ',', '.') as arpu,
    CASE
        WHEN COALESCE(prev.arpu, 0) = 0 AND d.arpu > 0 THEN '+100%'
        WHEN COALESCE(prev.arpu, 0) = 0 THEN '0%'
        ELSE ROUND(((d.arpu - prev.arpu) / NULLIF(prev.arpu, 0)) * 100, 1) || '%'
    END as arpu_trend_pct,

    -- Format CAC (Rp X.XXX)
    'Rp ' || REPLACE(TO_CHAR(ROUND(d.cac, 0), 'FM999,999,999,990'), ',', '.') as cac,
    CASE
        WHEN COALESCE(prev.cac, 0) = 0 AND d.cac > 0 THEN '+100%'
        WHEN COALESCE(prev.cac, 0) = 0 THEN '0%'
        ELSE ROUND(((d.cac - prev.cac) / NULLIF(prev.cac, 0)) * 100, 1) || '%'
    END as cac_trend_pct,

    -- Format Churn Rate & Trend (%)
    ROUND(d.churn_rate, 1) || '%' as churn_rate,
    CASE WHEN prev.churn_rate IS NULL THEN '-'
         ELSE ROUND((d.churn_rate - COALESCE(prev.churn_rate, 0)), 1) || '%'
    END as churn_trend_pct,

    d.customer_growth
FROM DashboardMetrics d
LEFT JOIN DashboardMetrics prev ON prev.month = TO_CHAR((d.month || '-01')::date - interval '1 month', 'YYYY-MM')
ORDER BY d.month ASC;


WITH Parameters AS (
    -- Parameter Filter Tanggal & Trend (Setara dengan startDate & endDate di UI)
    SELECT
        '2026-01-01'::date as start_date,
        '2026-05-31'::date as end_date,
        '2026-05' as current_month,
        '2026-04' as prev_month
),
BaseTransactions AS (
    -- Membersihkan dan menyiapkan basis transaksi Verified
    SELECT
        status,
        keterangan,
        amount as numeric_amount,
        TO_CHAR(timestamp AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') as tx_date,
        TO_CHAR(timestamp AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') as tx_month
    FROM transactions
    WHERE status = 'Verified'
),
RangeMetrics AS (
    -- Menghitung Metrik berdasarkan Range Tanggal Pilihan
    SELECT
        COALESCE(SUM(numeric_amount) FILTER (WHERE keterangan = 'pemasukan' AND tx_date >= p.start_date::text AND tx_date <= p.end_date::text), 0) as range_revenue,
        COALESCE(SUM(numeric_amount) FILTER (WHERE keterangan = 'pengeluaran' AND tx_date >= p.start_date::text AND tx_date <= p.end_date::text), 0) as range_expenses
    FROM BaseTransactions, Parameters p
),
MonthTrendMetrics AS (
    -- Menghitung Trend Metrik untuk Current vs Previous Month (MoM)
    SELECT
        m.tx_month,
        COALESCE(SUM(numeric_amount) FILTER (WHERE keterangan = 'pemasukan'), 0) as month_revenue,
        COALESCE(SUM(numeric_amount) FILTER (WHERE keterangan = 'pengeluaran'), 0) as month_expenses
    FROM BaseTransactions m
    JOIN Parameters p ON m.tx_month IN (p.current_month, p.prev_month)
    GROUP BY m.tx_month
),
CalculatedTrends AS (
    -- Kalkulasi Persentase Profit & Margin per Bulan untuk mendapatkan Trend
    SELECT
        c.month_revenue as curr_rev,
        c.month_revenue - c.month_expenses as curr_profit,
        CASE WHEN c.month_revenue > 0 THEN ((c.month_revenue - c.month_expenses) / c.month_revenue) * 100 ELSE 0 END as curr_margin,
        p.month_revenue as prev_rev,
        p.month_revenue - p.month_expenses as prev_profit,
        CASE WHEN p.month_revenue > 0 THEN ((p.month_revenue - p.month_expenses) / p.month_revenue) * 100 ELSE 0 END as prev_margin
    FROM (SELECT * FROM MonthTrendMetrics, Parameters WHERE tx_month = current_month) c
    FULL OUTER JOIN (SELECT * FROM MonthTrendMetrics, Parameters WHERE tx_month = prev_month) p ON 1=1
),
CustomerStats AS (
    -- Snapshot Jumlah Pengguna (Cumulative hingga akhir tanggal pilihan)
    SELECT
        (SELECT COUNT(*) FROM customers WHERE status = 'Active' AND TO_CHAR("createdAt" AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') <= p.end_date::text) as active_users,
        (SELECT COUNT(*) FROM customers WHERE status IN ('Inactive', 'Non-Active') AND TO_CHAR("createdAt" AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') <= p.end_date::text) as inactive_users
    FROM Parameters p
),
WaterfallData AS (
    -- Konversi JSON Aggregation untuk Waterfall Chart (Revenue positif vs Expenses negatif)
    SELECT json_agg(json_build_object('name', name, 'value', value)) as waterfall_chart_json
    FROM (
        SELECT 'Revenue' as name, range_revenue as value FROM RangeMetrics
        UNION ALL
        SELECT category as name, -SUM(amount) as value
        FROM expenses, Parameters p
        WHERE TO_CHAR(date AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') >= p.start_date::text
          AND TO_CHAR(date AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') <= p.end_date::text
        GROUP BY category
    ) sub
)
-- Hasil Akhir: KPI Range + Persentase Trend + Data JSON Chart
SELECT
    -- Format Uang IDR (Rp)
    'Rp ' || REPLACE(TO_CHAR(rm.range_revenue, 'FM999,999,999,990'), ',', '.') as "REVENUE (RANGE)",
    'Rp ' || REPLACE(TO_CHAR(rm.range_revenue - rm.range_expenses, 'FM999,999,999,990'), ',', '.') as "NET PROFIT",

    -- Format Persentase (%)
    ROUND(CASE WHEN rm.range_revenue > 0 THEN ((rm.range_revenue - rm.range_expenses) / rm.range_revenue) * 100 ELSE 0 END, 1) || '%' as "EBITDA MARGIN",

    cs.active_users as "ACTIVE USERS",
    cs.inactive_users as "INACTIVE USERS",

    -- Persentase Trend MoM (Dibandingkan akhir bulan yang dipilih)
    CASE
        WHEN COALESCE(ct.prev_rev, 0) = 0 AND ct.curr_rev > 0 THEN '+100%'
        WHEN COALESCE(ct.prev_rev, 0) = 0 THEN '0%'
        ELSE ROUND(((ct.curr_rev - ct.prev_rev) / NULLIF(ct.prev_rev, 0)) * 100, 1) || '%'
    END as revenue_trend_pct,

    CASE
        WHEN COALESCE(ct.prev_profit, 0) = 0 AND ct.curr_profit > 0 THEN '+100%'
        WHEN COALESCE(ct.prev_profit, 0) = 0 THEN '0%'
        ELSE ROUND(((ct.curr_profit - ct.prev_profit) / NULLIF(ABS(ct.prev_profit), 0)) * 100, 1) || '%'
    END as profit_trend_pct,

    ROUND((ct.curr_margin - COALESCE(ct.prev_margin, 0)), 1) || '%' as margin_trend_pct, -- Percentage Points

    -- Chart Data for UI parsing
    w.waterfall_chart_json
FROM RangeMetrics rm
CROSS JOIN CalculatedTrends ct
CROSS JOIN CustomerStats cs
CROSS JOIN WaterfallData w;

WITH Parameters AS (
    SELECT
        '2026-01-01'::date as start_date,
        '2026-04-30'::date as end_date,
        '2026-04' as target_month -- Parameter bulan untuk menghitung MoM Trend
),
BaseCustomers AS (
    -- Mapping city ke province untuk data pelanggan
    SELECT
        id::text as cust_id,
        CASE
            WHEN city IN ('Jakarta Pusat', 'Jakarta Utara', 'Jakarta Selatan', 'Jakarta Timur', 'Jakarta Barat') THEN 'DKI Jakarta'
            WHEN city = 'Bandung' THEN 'Jawa Barat'
            WHEN city = 'Surabaya' THEN 'Jawa Timur'
            WHEN city = 'Makassar' THEN 'Sulawesi Selatan'
            ELSE COALESCE(province, 'Unknown')
        END as province_mapped,
        status,
        ("createdAt" AT TIME ZONE 'Asia/Jakarta')::date AS join_date
    FROM customers
),
BaseTransactions AS (
    -- Sentralisasi mapping city transaksi agar tidak ditulis berulang-ulang
    SELECT
        CASE
            WHEN COALESCE(city, 'Unknown') IN ('Jakarta Pusat', 'Jakarta Utara', 'Jakarta Selatan', 'Jakarta Timur', 'Jakarta Barat') THEN 'DKI Jakarta'
            WHEN COALESCE(city, 'Unknown') = 'Bandung' THEN 'Jawa Barat'
            WHEN COALESCE(city, 'Unknown') = 'Surabaya' THEN 'Jawa Timur'
            WHEN COALESCE(city, 'Unknown') = 'Makassar' THEN 'Sulawesi Selatan'
            ELSE 'Unknown'
        END as province_mapped,
        keterangan,
        amount::numeric as amount_num,
        (timestamp AT TIME ZONE 'Asia/Jakarta')::date as tx_date,
        TO_CHAR((timestamp AT TIME ZONE 'Asia/Jakarta'), 'YYYY-MM') as tx_month
    FROM transactions
    WHERE status = 'Verified'
),
CustomerMetrics AS (
    SELECT
        c.province_mapped,
        COUNT(*) FILTER (WHERE c.status = 'Active' AND c.join_date <= p.end_date) as active_users,
        COUNT(*) FILTER (WHERE c.status IN ('Inactive', 'Non-Active') AND c.join_date <= p.end_date) as inactive_users
    FROM BaseCustomers c
    CROSS JOIN Parameters p
    GROUP BY c.province_mapped
),
TransactionMetrics AS (
    -- Hitung Range Metrics (sesuai start_date & end_date)
    SELECT
        t.province_mapped,
        COALESCE(SUM(t.amount_num) FILTER (WHERE t.keterangan = 'pemasukan'), 0) as range_rev,
        COALESCE(SUM(t.amount_num) FILTER (WHERE t.keterangan = 'pengeluaran'), 0) as range_exp
    FROM BaseTransactions t
    CROSS JOIN Parameters p
    WHERE t.tx_date >= p.start_date AND t.tx_date <= p.end_date
    GROUP BY t.province_mapped
),
MonthlyStats AS (
    -- Agregasi per bulan untuk perhitungan Trend
    SELECT
        province_mapped,
        tx_month as month,
        COALESCE(SUM(amount_num) FILTER (WHERE keterangan = 'pemasukan'), 0) as rev,
        COALESCE(SUM(amount_num) FILTER (WHERE keterangan = 'pengeluaran'), 0) as exp
    FROM BaseTransactions
    GROUP BY 1, 2
),
TrendComparison AS (
    -- Tarik data Current vs Previous Month menggunakan LAG()
    SELECT
        province_mapped,
        month,
        rev as curr_rev,
        exp as curr_exp,
        LAG(rev) OVER (PARTITION BY province_mapped ORDER BY month) as prev_rev,
        LAG(exp) OVER (PARTITION BY province_mapped ORDER BY month) as prev_exp
    FROM MonthlyStats
),
RawCombined AS (
    -- Gabungkan semua metrik mentah (Customer + Range + Trend)
    SELECT
        COALESCE(cm.province_mapped, tm.province_mapped, tc.province_mapped) as province_mapped,
        COALESCE(tm.range_rev, 0) as range_rev,
        COALESCE(tm.range_exp, 0) as range_exp,
        COALESCE(cm.active_users, 0) as active_users,
        COALESCE(cm.inactive_users, 0) as inactive_users,
        COALESCE(tc.curr_rev, 0) as curr_rev,
        COALESCE(tc.curr_exp, 0) as curr_exp,
        COALESCE(tc.prev_rev, 0) as prev_rev,
        COALESCE(tc.prev_exp, 0) as prev_exp
    FROM CustomerMetrics cm
    FULL OUTER JOIN TransactionMetrics tm ON cm.province_mapped = tm.province_mapped
    FULL OUTER JOIN (
        SELECT * FROM TrendComparison CROSS JOIN Parameters p WHERE month = p.target_month
    ) tc ON COALESCE(cm.province_mapped, tm.province_mapped) = tc.province_mapped
),
AggregatedData AS (
    -- Menjumlahkan semua data mentah. Fungsi ROLLUP akan otomatis membuat baris 'All Regions'
    SELECT
        COALESCE(province_mapped, 'All Regions') as province,
        SUM(range_rev) as range_rev,
        SUM(range_exp) as range_exp,
        SUM(active_users) as active_users,
        SUM(inactive_users) as inactive_users,
        SUM(curr_rev) as curr_rev,
        SUM(curr_exp) as curr_exp,
        SUM(prev_rev) as prev_rev,
        SUM(prev_exp) as prev_exp
    FROM RawCombined
    GROUP BY ROLLUP(province_mapped)
)
-- ==============================================================================
-- FINAL SELECT: Terapkan format dan rumus margin/trend secara seragam
-- ==============================================================================
SELECT
    province as "PROVINCE",

    -- 1. Range Metrics
    range_rev as "REVENUE",
    (range_rev - range_exp) as "NET PROFIT",
    ROUND(
        CASE WHEN range_rev > 0 THEN ((range_rev - range_exp) / range_rev) * 100 ELSE 0 END,
    1) || '%' as "EBITDA MARGIN",

    -- 2. Customer Metrics
    active_users as "ACTIVE USERS",
    inactive_users as "INACTIVE USERS",

    -- 3. Trend Metrics
    CASE
        WHEN prev_rev = 0 AND curr_rev > 0 THEN '+100.0%'
        WHEN prev_rev = 0 THEN '0.0%'
        ELSE ROUND(((curr_rev - prev_rev) / NULLIF(prev_rev, 0)) * 100, 1) || '%'
    END as "REV TREND",

    CASE
        WHEN (prev_rev - prev_exp) = 0 AND (curr_rev - curr_exp) > 0 THEN '+100.0%'
        WHEN (prev_rev - prev_exp) = 0 THEN '0.0%'
        ELSE ROUND((((curr_rev - curr_exp) - (prev_rev - prev_exp)) / NULLIF(ABS(prev_rev - prev_exp), 0)) * 100, 1) || '%'
    END as "PROFIT TREND",

    ROUND(
        (CASE WHEN curr_rev > 0 THEN ((curr_rev - curr_exp) / curr_rev) * 100 ELSE 0 END) -
        (CASE WHEN prev_rev > 0 THEN ((prev_rev - prev_exp) / prev_rev) * 100 ELSE 0 END),
    1) || ' pp' as "MARGIN TREND"

FROM AggregatedData
-- Sort: All Regions taruh di paling bawah, sisanya urut berdasarkan Revenue
ORDER BY
    CASE WHEN province = 'All Regions' THEN 1 ELSE 0 END,
    range_rev DESC;


-- 
-- Executive Summary
-- 
-- Financial & Profitability


-- Inventory & Assets


-- Regional Analysis