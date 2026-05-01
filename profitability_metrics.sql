-- Validasi TOTAL REVENUE (MoM)
-- Logic: ((Revenue April / Revenue Maret) - 1) * 100

WITH MonthlyRevenue AS (
    SELECT
        TO_CHAR(timestamp, 'YYYY-MM') as month,
        SUM(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) as revenue
    FROM transactions
    WHERE status = 'Verified' AND keterangan = 'pemasukan'
    GROUP BY 1
)
SELECT
    cur.revenue as "Revenue April",
    prev.revenue as "Revenue March",
    ROUND(((cur.revenue / NULLIF(prev.revenue, 0)) - 1) * 100, 1) || '%' as "Trend MoM %"
FROM
    (SELECT revenue FROM MonthlyRevenue WHERE month = '2026-04') cur,
    (SELECT revenue FROM MonthlyRevenue WHERE month = '2026-03') prev;


-- Validasi ARPU (MoM)
-- Logic: Total Pendapatan Bulan N / Total Active User (Kumulatif hingga Bulan N)
WITH ARPU_Stats AS (
    SELECT
        '2026-04' as month,
        (SELECT SUM(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) FROM transactions WHERE status = 'Verified' AND keterangan = 'pemasukan' AND TO_CHAR(timestamp, 'YYYY-MM') = '2026-04') /
        NULLIF((SELECT COUNT(*) FROM customers WHERE status = 'Active' AND TO_CHAR("createdAt"::date, 'YYYY-MM') <= '2026-04'), 0) as arpu
    UNION ALL
    SELECT
        '2026-03' as month,
        (SELECT SUM(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) FROM transactions WHERE status = 'Verified' AND keterangan = 'pemasukan' AND TO_CHAR(timestamp, 'YYYY-MM') = '2026-03') /
        NULLIF((SELECT COUNT(*) FROM customers WHERE status = 'Active' AND TO_CHAR("createdAt"::date, 'YYYY-MM') <= '2026-03'), 0) as arpu
)
SELECT
    (SELECT arpu FROM ARPU_Stats WHERE month = '2026-04') as "ARPU April",
    (SELECT arpu FROM ARPU_Stats WHERE month = '2026-03') as "ARPU March",
    ROUND((((SELECT arpu FROM ARPU_Stats WHERE month = '2026-04') / NULLIF((SELECT arpu FROM ARPU_Stats WHERE month = '2026-03'), 0)) - 1) * 100, 1) || '%' as "Trend MoM %";


-- Validasi CAC (MoM)
-- Logic: Menggunakan nilai transactions berstatus pengeluaran bulanan / Total User Baru di bulan tersebut.
WITH CAC_Stats AS (
    SELECT
        '2026-04' as month,
        (SELECT SUM(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) FROM transactions WHERE status = 'Verified' AND keterangan = 'pengeluaran' AND TO_CHAR(timestamp, 'YYYY-MM') = '2026-04') /
        NULLIF((SELECT COUNT(*) FROM customers WHERE TO_CHAR("createdAt"::date, 'YYYY-MM') = '2026-04'), 0) as cac
    UNION ALL
    SELECT
        '2026-03' as month,
        (SELECT SUM(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) FROM transactions WHERE status = 'Verified' AND keterangan = 'pengeluaran' AND TO_CHAR(timestamp, 'YYYY-MM') = '2026-03') /
        NULLIF((SELECT COUNT(*) FROM customers WHERE TO_CHAR("createdAt"::date, 'YYYY-MM') = '2026-03'), 0) as cac
)
SELECT
    (SELECT cac FROM CAC_Stats WHERE month = '2026-04') as "CAC April",
    (SELECT cac FROM CAC_Stats WHERE month = '2026-03') as "CAC March",
    ROUND((((SELECT cac FROM CAC_Stats WHERE month = '2026-04') / NULLIF((SELECT cac FROM CAC_Stats WHERE month = '2026-03'), 0)) - 1) * 100, 1) || '%' as "Trend MoM %";


-- Validasi CHURN RATE (MoM)
-- Logic: Customer Inactive di bulan terkait / Total Customer (Kumulatif hingga bulan tersebut).
WITH Churn_Stats AS (
    SELECT
        '2026-04' as month,
        (SELECT COUNT(*) FROM customers WHERE status = 'Inactive' AND TO_CHAR("createdAt"::date, 'YYYY-MM') = '2026-04')::numeric /
        NULLIF((SELECT COUNT(*) FROM customers WHERE TO_CHAR("createdAt"::date, 'YYYY-MM') <= '2026-04'), 0) * 100 as churn_rate
    UNION ALL
    SELECT
        '2026-03' as month,
        (SELECT COUNT(*) FROM customers WHERE status = 'Inactive' AND TO_CHAR("createdAt"::date, 'YYYY-MM') = '2026-03')::numeric /
        NULLIF((SELECT COUNT(*) FROM customers WHERE TO_CHAR("createdAt"::date, 'YYYY-MM') <= '2026-03'), 0) * 100 as churn_rate
)
SELECT
    (SELECT churn_rate FROM Churn_Stats WHERE month = '2026-04') as "Churn April",
    (SELECT churn_rate FROM Churn_Stats WHERE month = '2026-03') as "Churn March",
    ROUND((((SELECT churn_rate FROM Churn_Stats WHERE month = '2026-04') / NULLIF((SELECT churn_rate FROM Churn_Stats WHERE month = '2026-03'), 0)) - 1) * 100, 1) || '%' as "Trend MoM %";


-- Validasi MRR, EBITDA, & NET PROFIT (Latest Month)
WITH Filters AS (
    SELECT
        '2026-01-01'::date as start_date,
        '2026-12-31'::date as end_date,
        'All Regions' as selected_region -- Ubah untuk tes spesifik region (misal: 'DKI Jakarta')
),
FilteredTransactions AS (
    SELECT t.*, c.province
    FROM transactions t
    LEFT JOIN customers c ON split_part(t.id, '-', 2) = CAST(c.id AS TEXT)
    CROSS JOIN Filters f
    WHERE t.status = 'Verified'
      AND t.timestamp::date >= f.start_date
      AND t.timestamp::date <= f.end_date
      AND (f.selected_region = 'All Regions' OR c.province = f.selected_region)
),
LatestMonth AS (
    SELECT TO_CHAR(MAX(timestamp), 'YYYY-MM') as month_str
    FROM FilteredTransactions
),
LatestMetrics AS (
    SELECT
        (SELECT SUM(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT))
         FROM FilteredTransactions
         WHERE keterangan = 'pemasukan' AND TO_CHAR(timestamp, 'YYYY-MM') = (SELECT month_str FROM LatestMonth)
        ) as mrr_revenue,

        (SELECT SUM(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT))
         FROM FilteredTransactions
         WHERE keterangan = 'pengeluaran' AND TO_CHAR(timestamp, 'YYYY-MM') = (SELECT month_str FROM LatestMonth)
        ) as tx_expenses
)
SELECT
    COALESCE(mrr_revenue, 0) as "MRR (Verified)",
    COALESCE(mrr_revenue, 0) - COALESCE(tx_expenses, 0) as "NET PROFIT",
    ROUND(((COALESCE(mrr_revenue, 0) - COALESCE(tx_expenses, 0))::numeric / NULLIF(mrr_revenue, 0)) * 100, 1) || '%' as "EBITDA MARGIN"
FROM LatestMetrics;


-- Validasi ACTIVE & INACTIVE USERS
WITH Filters AS (
    SELECT '2026-01-01'::date as start_date, '2026-12-31'::date as end_date, 'All Regions' as selected_region
),
ActiveDalamRange AS (
    -- User yg melakukan pembayaran terverifikasi di range tsb
    SELECT DISTINCT split_part(t.id, '-', 2) as cust_id
    FROM transactions t
    CROSS JOIN Filters f
    WHERE t.status = 'Verified' AND t.keterangan = 'pemasukan'
      AND t.timestamp::date >= f.start_date AND t.timestamp::date <= f.end_date
)
SELECT
    (SELECT COUNT(*) FROM customers c CROSS JOIN Filters f
     WHERE (c."createdAt"::date <= f.end_date OR c.registration_date::date <= f.end_date)
       AND (f.selected_region = 'All Regions' OR c.province = f.selected_region)
       AND CAST(c.id AS TEXT) IN (SELECT cust_id FROM ActiveDalamRange)
    ) as "ACTIVE USERS (Paying)",

    (SELECT COUNT(*) FROM customers c CROSS JOIN Filters f
     WHERE (c."createdAt"::date <= f.end_date OR c.registration_date::date <= f.end_date)
       AND (f.selected_region = 'All Regions' OR c.province = f.selected_region)
       AND c.status IN ('Inactive', 'Non-Active')
    ) as "INACTIVE USERS"
;


-- Validasi CHART WATERFALL (Selama Range Terpilih)
WITH Filters AS (
    SELECT '2026-01-01'::date as start_date, '2026-12-31'::date as end_date, 'All Regions' as selected_region
),
TotalCustomers AS (SELECT COUNT(*) as total FROM customers),
RegionCustomers AS (
    SELECT COUNT(*) as total FROM customers c CROSS JOIN Filters f WHERE c.province = f.selected_region OR f.selected_region = 'All Regions'
),
AllocationFactor AS (
    SELECT CASE
        WHEN (SELECT selected_region FROM Filters) = 'All Regions' THEN 1.0
        ELSE (SELECT total FROM RegionCustomers)::numeric / NULLIF((SELECT total FROM TotalCustomers), 0)
    END as factor
)
SELECT
    type as "Component",
    SUM(CAST(REPLACE(REPLACE(REPLACE(t.amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) as "Value (Rp)",
    'Income' as "Type"
FROM transactions t
LEFT JOIN customers c ON split_part(t.id, '-', 2) = CAST(c.id AS TEXT)
CROSS JOIN Filters f
WHERE t.status = 'Verified' AND t.keterangan = 'pemasukan'
  AND t.timestamp::date >= f.start_date AND t.timestamp::date <= f.end_date
  AND (f.selected_region = 'All Regions' OR c.province = f.selected_region)
GROUP BY type

UNION ALL

SELECT
    category as "Component",
    -SUM(ABS(e.amount::numeric) * (SELECT factor FROM AllocationFactor)) as "Value (Rp)",
    'Expense (Allocated)' as "Type"
FROM expenses e
CROSS JOIN Filters f
WHERE e.date::date >= f.start_date AND e.date::date <= f.end_date
GROUP BY category;


-- Validasi SERVICE PLAN MIX
WITH Filters AS (
    SELECT '2026-01-01'::date as start_date, '2026-12-31'::date as end_date, 'All Regions' as selected_region
),
ActiveDalamRange AS (
    SELECT DISTINCT split_part(t.id, '-', 2) as cust_id
    FROM transactions t
    CROSS JOIN Filters f
    WHERE t.status = 'Verified' AND t.keterangan = 'pemasukan'
      AND t.timestamp::date >= f.start_date AND t.timestamp::date <= f.end_date
)
SELECT 
    CASE WHEN service = 'Gamers Node' THEN 'Gamers' ELSE service END as "Plan",
    COUNT(*) as "Total Users",
    ROUND((COUNT(*)::numeric / SUM(COUNT(*)) OVER()) * 100, 1) || '%' as "Distribution %"
FROM customers c
CROSS JOIN Filters f
WHERE CAST(c.id AS TEXT) IN (SELECT cust_id FROM ActiveDalamRange)
  AND (c."createdAt"::date <= f.end_date OR c.registration_date::date <= f.end_date)
  AND (f.selected_region = 'All Regions' OR c.province = f.selected_region)
  AND (service IN ('Premium', 'Standard', 'Basic') OR service = 'Gamers Node')
GROUP BY 1
ORDER BY "Total Users" DESC;


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


-- Kumulatif ARPU, CAC, CHURN RATE, dan TOTAL REVENUE
WITH ExecutiveMetrics AS (
    SELECT
        month,
        -- 1. Total Revenue
        revenue,
        -- Mengeluarkan expense & new_customers ke atas agar bisa dibaca oleh CASE di query utama
        expense,
        new_customers,
        -- 2. ARPU Calculation (Revenue / Total Active Customers)
        ROUND(revenue::numeric / NULLIF(total_active, 0), 0) as arpu,
        -- 3. CAC Calculation (Total Expense / New Customers)
        ROUND(expense::numeric / NULLIF(new_customers, 0), 0) as cac,
        -- 4. Churn Rate Calculation (Inactive this month / Total Customers)
        ROUND((inactive_this_month::numeric / NULLIF(total_customers, 0)) * 100, 1) as churn_rate
    FROM (
        SELECT
            m.month,
            -- Revenue Pemasukan
            COALESCE((SELECT SUM(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT))
             FROM transactions WHERE status = 'Verified' AND keterangan = 'pemasukan' AND TO_CHAR(timestamp, 'YYYY-MM') = m.month), 0) as revenue,
            -- Total Active Users (Kumulatif sampai bulan tsb)
            (SELECT COUNT(*) FROM customers WHERE status = 'Active' AND TO_CHAR("createdAt"::date, 'YYYY-MM') <= m.month) as total_active,
            -- Total Expense Pengeluaran
            COALESCE((SELECT SUM(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT))
             FROM transactions WHERE status = 'Verified' AND keterangan = 'pengeluaran' AND TO_CHAR(timestamp, 'YYYY-MM') = m.month), 0) as expense,
            -- New Customers (Bulan tsb)
            (SELECT COUNT(*) FROM customers WHERE TO_CHAR("createdAt"::date, 'YYYY-MM') = m.month) as new_customers,
            -- Inactive Customers (Bulan tsb)
            (SELECT COUNT(*) FROM inactive_cust WHERE TO_CHAR(inactiveat::date, 'YYYY-MM') = m.month) as inactive_this_month,
            -- Total Customers (Kumulatif)
            (SELECT COUNT(*) FROM customers WHERE status = 'Active' and TO_CHAR("createdAt"::date, 'YYYY-MM') <= m.month) as total_customers
        -- Tambahkan bulan-bulan riwayat yang kamu butuhkan di sini
        FROM (VALUES ('2026-01'), ('2026-02'), ('2026-03'), ('2026-04'), ('2026-05')) as m(month)
    ) base
),
HistoricalAverages AS (
    SELECT
        month as cur_month,
        arpu as cur_arpu,
        cac as cur_cac,
        churn_rate as cur_churn_rate,
        revenue as cur_revenue,
        expense as cur_expense,
        new_customers as cur_new_customers,

        -- Menghitung Rata-rata dari bulan PERTAMA sampai H-1 bulan saat ini
        AVG(arpu) OVER (ORDER BY month ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) as prev_arpu,
        AVG(cac) OVER (ORDER BY month ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) as prev_cac,
        AVG(churn_rate) OVER (ORDER BY month ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) as prev_churn_rate,
        AVG(revenue) OVER (ORDER BY month ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) as prev_revenue,

        -- Bantuan untuk membuat label nama "Period"
        MIN(month) OVER () as first_month,
        LAG(month) OVER (ORDER BY month) as last_prev_month
    FROM ExecutiveMetrics
)
SELECT
    -- Output Label Contoh: "2026-05 vs Avg (2026-01 to 2026-04)"
    cur_month || ' vs Avg (' || first_month || ' to ' || last_prev_month || ')' as "Period",

    -- ARPU & Trend
    'Rp ' || ROUND((cur_arpu / 1000.0), 1) || 'k' as "ARPU",
    ROUND(((cur_arpu::numeric / NULLIF(prev_arpu, 0)) - 1) * 100, 1) || '%' as "ARPU Trend",

    -- CAC & Trend
    CASE
        WHEN cur_new_customers = 0 AND cur_expense > 0 THEN 'N/A'
        WHEN cur_new_customers = 0 THEN 'Rp 0'
        ELSE 'Rp ' || cur_cac
    END as "CAC",
    CASE
        WHEN cur_cac IS NULL OR prev_cac IS NULL THEN '-'
        WHEN prev_cac = 0 AND cur_cac = 0 THEN '0%'
        WHEN prev_cac = 0 THEN '100%'
        ELSE ROUND(((cur_cac::numeric / prev_cac) - 1) * 100, 1) || '%'
    END as "CAC Trend",

    -- Churn Rate & Trend
    COALESCE(cur_churn_rate, 0) || '%' as "Churn Rate",
    CASE
        WHEN COALESCE(cur_churn_rate, 0) - COALESCE(prev_churn_rate, 0) > 0
        THEN '+' || ROUND(COALESCE(cur_churn_rate, 0) - COALESCE(prev_churn_rate, 0), 1) || '%'
        ELSE ROUND(COALESCE(cur_churn_rate, 0) - COALESCE(prev_churn_rate, 0), 1) || '%'
    END as "Churn Rate Trend",

    -- Total Revenue & Trend
    'Rp ' || ROUND((cur_revenue / 1000000.0), 2) || 'M' as "Total Revenue",
    ROUND(((cur_revenue::numeric / NULLIF(prev_revenue, 0)) - 1) * 100, 1) || '%' as "Revenue Trend"
FROM HistoricalAverages
-- Filter untuk membuang bulan pertama (karena bulan 1 tidak memiliki data masa lalu untuk dibandingkan)
WHERE last_prev_month IS NOT NULL
ORDER BY cur_month DESC;