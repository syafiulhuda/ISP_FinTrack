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