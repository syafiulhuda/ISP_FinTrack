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