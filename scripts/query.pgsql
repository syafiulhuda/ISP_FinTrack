-- ============================================================================
-- ISP-FinTrack Unified Query Script
-- Location: isp-fintrack-web/scripts/query.pgsql
-- Description: Consolidated queries for Executive Dashboard & Profitability Analysis.
-- ============================================================================

-- SECTION 1: EXECUTIVE DASHBOARD (KPIs, Trends, & Growth Charts)
-- ----------------------------------------------------------------------------
WITH RECURSIVE MonthSeries AS (
    SELECT '2026-01' as month
    UNION ALL
    SELECT TO_CHAR((month || '-01')::date + interval '1 month', 'YYYY-MM')
    FROM MonthSeries WHERE month < '2026-12'
),
MonthlyRawData AS (
    SELECT 
        m.month,
        COALESCE((SELECT SUM((regexp_replace(amount, '[^0-9]', '', 'g'))::numeric) FROM transactions t WHERE t.status = 'Verified' AND t.keterangan = 'pemasukan' AND TO_CHAR(t.timestamp, 'YYYY-MM') = m.month), 0) as raw_revenue,
        COALESCE((SELECT SUM((regexp_replace(amount, '[^0-9]', '', 'g'))::numeric) FROM transactions t WHERE t.status = 'Verified' AND t.keterangan = 'pengeluaran' AND TO_CHAR(t.timestamp, 'YYYY-MM') = m.month), 0) as raw_expenses,
        (SELECT COUNT(*) FROM customers WHERE TO_CHAR("createdAt"::date, 'YYYY-MM') = m.month) as new_customers,
        (SELECT COUNT(*) FROM customers WHERE status = 'Active' AND TO_CHAR("createdAt"::date, 'YYYY-MM') <= m.month) as cumulative_active,
        (SELECT COUNT(*) FROM inactive_cust WHERE TO_CHAR(inactiveat::date, 'YYYY-MM') = m.month) as churned_this_month
    FROM MonthSeries m
),
DashboardCalculations AS (
    SELECT *,
        CASE WHEN cumulative_active > 0 THEN raw_revenue / cumulative_active ELSE 0 END as arpu,
        CASE WHEN new_customers > 0 THEN raw_expenses / new_customers ELSE 0 END as cac,
        CASE WHEN cumulative_active > 0 THEN (churned_this_month::numeric / cumulative_active) * 100 ELSE 0 END as churn_rate
    FROM MonthlyRawData
),
DashboardFinal AS (
    SELECT *,
        LAG(raw_revenue) OVER (ORDER BY month) as prev_revenue,
        LAG(arpu) OVER (ORDER BY month) as prev_arpu,
        LAG(cac) OVER (ORDER BY month) as prev_cac,
        LAG(churn_rate) OVER (ORDER BY month) as prev_churn_rate
    FROM DashboardCalculations
)
SELECT 
    'DASHBOARD' as "Source", month as "Period",
    'Rp ' || CASE WHEN raw_revenue >= 1000000 THEN ROUND(raw_revenue / 1000000.0, 2) || 'M' ELSE ROUND(raw_revenue / 1000.0, 0) || 'k' END as "Total Revenue",
    'Rp ' || ROUND(arpu / 1000.0, 1) || 'k' as "ARPU",
    'Rp ' || CASE WHEN cac >= 1000000 THEN ROUND(cac / 1000000.0, 2) || 'M' ELSE ROUND(cac / 1000.0, 1) || 'k' END as "CAC",
    ROUND(churn_rate, 1) || '%' as "Churn Rate",
    CASE WHEN prev_revenue IS NULL OR prev_revenue = 0 THEN '0%' ELSE ROUND(((raw_revenue::numeric / prev_revenue) - 1) * 100, 1) || '%' END as "Rev Trend",
    CASE WHEN prev_arpu IS NULL OR prev_arpu = 0 THEN '0%' ELSE ROUND(((arpu::numeric / prev_arpu) - 1) * 100, 1) || '%' END as "ARPU Trend",
    raw_revenue as "Chart_Revenue", cumulative_active as "Chart_Customer_Growth"
FROM DashboardFinal
ORDER BY month DESC;


-- SECTION 2: PROFITABILITY ANALYSIS (Waterfall, Plan Mix, & Profit Trend)
-- ----------------------------------------------------------------------------
-- Note: Set Filters below for specific date range or region audit.
WITH Filters AS (
    SELECT '2026-04-01'::date as start_date, '2026-05-31'::date as end_date, 'All Regions' as selected_region 
),
FilteredTransactions AS (
    SELECT t.*, c.province, c.service FROM transactions t
    LEFT JOIN customers c ON split_part(t.id, '-', 2) = CAST(c.id AS TEXT)
    CROSS JOIN Filters f
    WHERE t.status = 'Verified' AND t.timestamp::date >= f.start_date AND t.timestamp::date <= f.end_date
      AND (f.selected_region = 'All Regions' OR c.province = f.selected_region)
),
FilteredExpenses AS (
    SELECT e.* FROM expenses e CROSS JOIN Filters f WHERE e.date::date >= f.start_date AND e.date::date <= f.end_date
),
ProfitMetrics AS (
    SELECT
        COALESCE(SUM(CASE WHEN keterangan = 'pemasukan' THEN (regexp_replace(amount, '[^0-9]', '', 'g'))::numeric ELSE 0 END), 0) as mrr,
        COALESCE(SUM(CASE WHEN keterangan = 'pengeluaran' THEN (regexp_replace(amount, '[^0-9]', '', 'g'))::numeric ELSE 0 END), 0) as total_expenses
    FROM FilteredTransactions
),
CustomerStats AS (
    SELECT COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_users, COUNT(CASE WHEN status IN ('Inactive', 'Non-Active') THEN 1 END) as inactive_users
    FROM customers c CROSS JOIN Filters f WHERE (f.selected_region = 'All Regions' OR c.province = f.selected_region)
),
Waterfall AS (
    SELECT 'Revenue' as component, SUM((regexp_replace(amount, '[^0-9]', '', 'g'))::numeric) as value FROM FilteredTransactions WHERE keterangan = 'pemasukan'
    UNION ALL
    SELECT category, -SUM(amount::numeric) FROM FilteredExpenses GROUP BY category
),
PlanMix AS (
    SELECT service as plan, COUNT(*) as total, ROUND((COUNT(*)::numeric / SUM(COUNT(*)) OVER()) * 100, 1) as dist
    FROM customers c CROSS JOIN Filters f WHERE (f.selected_region = 'All Regions' OR c.province = f.selected_region) AND status = 'Active' GROUP BY 1
)
SELECT 
    'PROFITABILITY' as "Source",
    'Rp ' || ROUND(m.mrr / 1000000.0, 2) || 'M' as "MRR",
    'Rp ' || ROUND((m.mrr - m.total_expenses) / 1000000.0, 2) || 'M' as "Net Profit",
    ROUND(((m.mrr - m.total_expenses) / NULLIF(m.mrr, 0)) * 100, 1) || '%' as "EBITDA Margin",
    cm.active_users, cm.inactive_users,
    (SELECT json_agg(w) FROM Waterfall w) as "Waterfall_JSON",
    (SELECT json_agg(p) FROM PlanMix p) as "PlanMix_JSON"
FROM ProfitMetrics m, CustomerStats cm;
