-- ============================================================
-- PREDICTIVE METRICS MATERIALIZED VIEW (SIMPLIFIED)
-- ============================================================

DROP MATERIALIZED VIEW IF EXISTS predictive_metrics_mv;

CREATE MATERIALIZED VIEW predictive_metrics_mv AS
WITH MonthSeries AS (
    SELECT TO_CHAR(generate_series(
        DATE_TRUNC('month', (SELECT MIN("createdAt") FROM customers)),
        DATE_TRUNC('month', NOW()),
        INTERVAL '1 month'
    ), 'YYYY-MM') AS month
),
MonthlyRevenue AS (
    SELECT
        TO_CHAR(t.timestamp AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') AS month,
        COALESCE(SUM(t.amount::numeric), 0) AS total_revenue
    FROM transactions t
    WHERE t.keterangan = 'pemasukan'
      AND t.status = 'Verified'
    GROUP BY TO_CHAR(t.timestamp AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM')
),
MonthlyExpenses AS (
    SELECT
        TO_CHAR(t.timestamp AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') AS month,
        COALESCE(SUM(t.amount::numeric), 0) AS total_expenses
    FROM transactions t
    WHERE t.keterangan = 'pengeluaran'
      AND t.status = 'Verified'
    GROUP BY TO_CHAR(t.timestamp AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM')
),
MonthlyCustomerSnapshot AS (
    SELECT
        TO_CHAR(c."createdAt" AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') AS join_month,
        COUNT(*) AS new_customers
    FROM customers c
    GROUP BY TO_CHAR(c."createdAt" AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM')
),
MonthlyChurn AS (
    SELECT
        TO_CHAR(c."createdAt" AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') AS month,
        COUNT(CASE WHEN c.status = 'Inactive' THEN 1 END) AS churned_customers,
        COUNT(*) AS total_customers_that_month
    FROM customers c
    GROUP BY TO_CHAR(c."createdAt" AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM')
),
CumulativeActiveCustomers AS (
    SELECT
        ms.month,
        COALESCE((
            SELECT COUNT(*) 
            FROM customers c 
            WHERE TO_CHAR(c."createdAt" AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') <= ms.month
              AND c.status = 'Active'
        ), 0) AS active_customers,
        COALESCE((
            SELECT COUNT(*) 
            FROM customers c 
            WHERE TO_CHAR(c."createdAt" AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') <= ms.month
        ), 0) AS total_customers
    FROM MonthSeries ms
)
SELECT
    ms.month,
    ROW_NUMBER() OVER (ORDER BY ms.month) AS month_index,
    COALESCE(mr.total_revenue, 0) AS revenue,
    COALESCE(me.total_expenses, 0) AS expenses,
    COALESCE(mr.total_revenue, 0) - COALESCE(me.total_expenses, 0) AS net_profit,
    cac.active_customers,
    cac.total_customers,
    CASE 
        WHEN COALESCE(mch.total_customers_that_month, 0) > 0 
        THEN ROUND((COALESCE(mch.churned_customers, 0)::numeric / mch.total_customers_that_month::numeric) * 100, 2)
        ELSE 0 
    END AS churn_rate,
    COALESCE(mch.churned_customers, 0) AS churned_count,
    COALESCE(mcs.new_customers, 0) AS new_customers,
    NOW() AT TIME ZONE 'Asia/Jakarta' AS last_refreshed_at
FROM MonthSeries ms
LEFT JOIN MonthlyRevenue mr ON ms.month = mr.month
LEFT JOIN MonthlyExpenses me ON ms.month = me.month
LEFT JOIN MonthlyCustomerSnapshot mcs ON ms.month = mcs.join_month
LEFT JOIN MonthlyChurn mch ON ms.month = mch.month
LEFT JOIN CumulativeActiveCustomers cac ON ms.month = cac.month
ORDER BY ms.month ASC;

CREATE UNIQUE INDEX IF NOT EXISTS predictive_metrics_mv_month_idx ON predictive_metrics_mv (month);

CREATE OR REPLACE FUNCTION refresh_predictive_metrics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY predictive_metrics_mv;
END;
$$ LANGUAGE plpgsql;
