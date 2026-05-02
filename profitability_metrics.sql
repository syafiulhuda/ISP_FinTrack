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
-- ISP-FinTrack Unified Executive Dashboard Query
-- Location: isp-fintrack-web/scripts/query.pgsql
-- Logic: Single-pass calculation for all KPIs, Trends, and Chart Data.

WITH RECURSIVE MonthSeries AS (
    -- 1. Generate month axis for 2026
    SELECT '2026-01' as month
    UNION ALL
    SELECT TO_CHAR((month || '-01')::date + interval '1 month', 'YYYY-MM')
    FROM MonthSeries
    WHERE month < '2026-12'
),
MonthlyRawData AS (
    -- 2. Aggregate raw counts and verified transaction sums per month
    SELECT 
        m.month,
        -- Revenue (Verified Pemasukan)
        COALESCE((
            SELECT SUM((regexp_replace(amount, '[^0-9]', '', 'g'))::numeric) 
            FROM transactions t
            WHERE t.status = 'Verified' 
              AND t.keterangan = 'pemasukan' 
              AND TO_CHAR(t.timestamp, 'YYYY-MM') = m.month
        ), 0) as raw_revenue,
        
        -- Expenses (Verified Pengeluaran)
        COALESCE((
            SELECT SUM((regexp_replace(amount, '[^0-9]', '', 'g'))::numeric) 
            FROM transactions t
            WHERE t.status = 'Verified' 
              AND t.keterangan = 'pengeluaran' 
              AND TO_CHAR(t.timestamp, 'YYYY-MM') = m.month
        ), 0) as raw_expenses,
        
        -- Customer Metrics
        (SELECT COUNT(*) FROM customers WHERE TO_CHAR("createdAt"::date, 'YYYY-MM') = m.month) as new_customers,
        (SELECT COUNT(*) FROM customers WHERE status = 'Active' AND TO_CHAR("createdAt"::date, 'YYYY-MM') <= m.month) as cumulative_active,
        (SELECT COUNT(*) FROM inactive_cust WHERE TO_CHAR(inactiveat::date, 'YYYY-MM') = m.month) as churned_this_month
    FROM MonthSeries m
),
CalculatedKPIs AS (
    -- 3. Calculate core KPIs (ARPU, CAC, Churn Rate)
    SELECT 
        *,
        CASE WHEN cumulative_active > 0 THEN raw_revenue / cumulative_active ELSE 0 END as arpu,
        CASE WHEN new_customers > 0 THEN raw_expenses / new_customers ELSE 0 END as cac,
        CASE WHEN cumulative_active > 0 THEN (churned_this_month::numeric / cumulative_active) * 100 ELSE 0 END as churn_rate
    FROM MonthlyRawData
),
MetricsWithTrends AS (
    -- 4. Calculate Trends using Window Functions (LAG)
    SELECT 
        *,
        LAG(raw_revenue) OVER (ORDER BY month) as prev_revenue,
        LAG(arpu) OVER (ORDER BY month) as prev_arpu,
        LAG(cac) OVER (ORDER BY month) as prev_cac,
        LAG(churn_rate) OVER (ORDER BY month) as prev_churn_rate
    FROM CalculatedKPIs
)
-- 5. Final Output: Formatted for Dashboard & Raw for Charts
SELECT 
    month as "Period",
    
    -- Formatted Big Numbers
    'Rp ' || CASE 
        WHEN raw_revenue >= 1000000 THEN ROUND(raw_revenue / 1000000.0, 2) || 'M'
        ELSE ROUND(raw_revenue / 1000.0, 0) || 'k'
    END as "Total Revenue",
    
    'Rp ' || ROUND(arpu / 1000.0, 1) || 'k' as "ARPU",
    
    'Rp ' || CASE 
        WHEN cac >= 1000000 THEN ROUND(cac / 1000000.0, 2) || 'M'
        ELSE ROUND(cac / 1000.0, 1) || 'k'
    END as "CAC",
    
    ROUND(churn_rate, 1) || '%' as "Churn Rate",
    
    -- Trend Percentages (MoM)
    CASE 
        WHEN prev_revenue IS NULL OR prev_revenue = 0 THEN '0%'
        ELSE ROUND(((raw_revenue::numeric / prev_revenue) - 1) * 100, 1) || '%'
    END as "Rev Trend",
    
    CASE 
        WHEN prev_arpu IS NULL OR prev_arpu = 0 THEN '0%'
        ELSE ROUND(((arpu::numeric / prev_arpu) - 1) * 100, 1) || '%'
    END as "ARPU Trend",
    
    CASE 
        WHEN prev_cac IS NULL OR prev_cac = 0 THEN '0%'
        ELSE ROUND(((cac::numeric / prev_cac) - 1) * 100, 1) || '%'
    END as "CAC Trend",
    
    CASE 
        WHEN prev_churn_rate IS NULL THEN '0%'
        ELSE (ROUND(churn_rate - prev_churn_rate, 1)) || '%'
    END as "Churn Trend",

    -- Raw Data for Charts (Revenue Growth & Customer Growth)
    raw_revenue as "Chart_Revenue",
    raw_expenses as "Chart_Expenses",
    cumulative_active as "Chart_Customer_Growth"
FROM MetricsWithTrends
ORDER BY month DESC;


-- ============================================================================
-- SECTION 2: PROFITABILITY ANALYSIS (12-Month Time Series - Hybrid YTD & MoM)
-- ============================================================================
WITH RECURSIVE MonthSeries AS (
    -- 1. Generate 12 Bulan di tahun berjalan
    SELECT '2026-01' as month
    UNION ALL
    SELECT TO_CHAR((month || '-01')::date + interval '1 month', 'YYYY-MM')
    FROM MonthSeries WHERE month < '2026-12'
),
Bounds AS (
    -- 2. Siapkan batas waktu Kumulatif (YTD) untuk setiap bulan
    SELECT
        month,
        (SUBSTRING(month, 1, 4) || '-01-01')::date as ytd_start,
        ((month || '-01')::date + interval '1 month - 1 day')::date as ytd_end,

        -- Flag untuk mengecek apakah bulan ini ada di masa depan (melebihi tanggal hari ini)
        CASE WHEN ((month || '-01')::date) > CURRENT_DATE THEN true ELSE false END as is_future_month
    FROM MonthSeries
),
RawData AS (
    -- 3. Tarik data Dua Buku Kas sekaligus (YTD & Bulanan)
    SELECT
        b.month,
        b.is_future_month,

        -- A. BUKU KAS KUMULATIF (YTD)
        -- Jika bulan depan, set NULL. Jika tidak, hitung SUM.
        CASE WHEN b.is_future_month THEN NULL ELSE
            COALESCE((SELECT SUM((regexp_replace(amount, '[^0-9]', '', 'g'))::numeric) FROM transactions WHERE status = 'Verified' AND keterangan = 'pemasukan' AND timestamp::date BETWEEN b.ytd_start AND b.ytd_end), 0)
        END as ytd_mrr,

        CASE WHEN b.is_future_month THEN NULL ELSE
            COALESCE((SELECT SUM((regexp_replace(amount, '[^0-9]', '', 'g'))::numeric) FROM transactions WHERE status = 'Verified' AND keterangan = 'pengeluaran' AND timestamp::date BETWEEN b.ytd_start AND b.ytd_end), 0)
        END as ytd_expenses,

        -- B. BUKU KAS BULANAN (MoM)
        CASE WHEN b.is_future_month THEN NULL ELSE
            COALESCE((SELECT SUM((regexp_replace(amount, '[^0-9]', '', 'g'))::numeric) FROM transactions WHERE status = 'Verified' AND keterangan = 'pemasukan' AND TO_CHAR(timestamp, 'YYYY-MM') = b.month), 0)
        END as monthly_mrr,

        CASE WHEN b.is_future_month THEN NULL ELSE
            COALESCE((SELECT SUM((regexp_replace(amount, '[^0-9]', '', 'g'))::numeric) FROM transactions WHERE status = 'Verified' AND keterangan = 'pengeluaran' AND TO_CHAR(timestamp, 'YYYY-MM') = b.month), 0)
        END as monthly_expenses,

        -- C. Status User Kumulatif
        CASE WHEN b.is_future_month THEN NULL ELSE
            ((SELECT COUNT(*) FROM customers WHERE "createdAt"::date <= b.ytd_end) -
             (SELECT COUNT(*) FROM inactive_cust WHERE inactiveat::date <= b.ytd_end))
        END as active_users,

        CASE WHEN b.is_future_month THEN NULL ELSE
            (SELECT COUNT(*) FROM inactive_cust WHERE inactiveat::date <= b.ytd_end)
        END as inactive_users,

        -- D. JSON Waterfall
        CASE WHEN b.is_future_month THEN '[]'::json ELSE
            COALESCE((
                SELECT json_agg(json_build_object('component', w.category, 'value', w.val))
                FROM (
                    SELECT 'Revenue' as category, COALESCE(SUM((regexp_replace(amount, '[^0-9]', '', 'g'))::numeric), 0) as val
                    FROM transactions WHERE timestamp::date BETWEEN b.ytd_start AND b.ytd_end AND keterangan = 'pemasukan' AND status = 'Verified'
                    HAVING COALESCE(SUM((regexp_replace(amount, '[^0-9]', '', 'g'))::numeric), 0) > 0
                    UNION ALL
                    SELECT category, -SUM(amount::numeric) as val
                    FROM expenses WHERE date::date BETWEEN b.ytd_start AND b.ytd_end GROUP BY category
                ) w
            ), '[]'::json)
        END as waterfall_json,

        -- E. JSON Plan Mix
        CASE WHEN b.is_future_month THEN '[]'::json ELSE
            COALESCE((
                SELECT json_agg(json_build_object('plan', p.plan, 'total', p.total, 'dist', p.dist))
                FROM (
                    SELECT service as plan, COUNT(*) as total, ROUND((COUNT(*)::numeric / NULLIF(SUM(COUNT(*)) OVER(), 0)) * 100, 1) as dist
                    FROM customers
                    WHERE status = 'Active' AND "createdAt"::date <= b.ytd_end
                    GROUP BY service
                ) p
            ), '[]'::json)
        END as planmix_json

    FROM Bounds b
),
KPIs AS (
    -- 4. Kalkulasi Profit & Margin (Biarkan NULL jika bahan bakunya NULL)
    SELECT
        month,
        is_future_month,

        ytd_mrr,
        (ytd_mrr - ytd_expenses) as ytd_net_profit,
        CASE WHEN ytd_mrr > 0 THEN ((ytd_mrr - ytd_expenses) / ytd_mrr) * 100 ELSE 0 END as ytd_margin,

        monthly_mrr,
        (monthly_mrr - monthly_expenses) as monthly_net_profit,
        CASE WHEN monthly_mrr > 0 THEN ((monthly_mrr - monthly_expenses) / monthly_mrr) * 100 ELSE 0 END as monthly_margin,

        coalesce(active_users, 0) as active_users, coalesce(inactive_users, 0) as inactive_users, waterfall_json, planmix_json
    FROM RawData
),
WithTrends AS (
    -- 5. Tarik nilai BULANAN dari baris sebelumnya
    SELECT
        *,
        LAG(monthly_mrr) OVER (ORDER BY month) as prev_monthly_mrr,
        LAG(monthly_margin) OVER (ORDER BY month) as prev_monthly_margin,
        LAG(monthly_net_profit) OVER (ORDER BY month) as prev_monthly_net_profit
    FROM KPIs
)
-- 6. Output Final
SELECT
    month as "Period",

    -- Jika bulan depan, kosongkan (jangan tampilkan Rp 0M atau -)
    CASE WHEN is_future_month THEN 0::text ELSE 'Rp ' || ROUND(ytd_mrr / 1000000.0, 2) || 'M' END as "MRR YTD",
    CASE WHEN is_future_month THEN 0::text
         WHEN prev_monthly_mrr IS NULL OR prev_monthly_mrr = 0 THEN '-'
         ELSE ROUND(((monthly_mrr / prev_monthly_mrr) - 1) * 100, 1) || '%'
    END as "MRR Trend",

    CASE WHEN is_future_month THEN 0::text ELSE ROUND(ytd_margin, 1) || '%' END as "EBITDA Margin YTD",
    CASE WHEN is_future_month THEN 0::text
         WHEN prev_monthly_margin IS NULL THEN '-'
         ELSE ROUND(monthly_margin - prev_monthly_margin, 1) || '%'
    END as "EBITDA Trend",

    CASE WHEN is_future_month THEN 0::text ELSE 'Rp ' || ROUND(ytd_net_profit / 1000000.0, 2) || 'M' END as "Net Profit YTD",
    CASE WHEN is_future_month THEN 0::text
         WHEN prev_monthly_net_profit IS NULL OR prev_monthly_net_profit = 0 THEN '-'
         ELSE ROUND(((monthly_net_profit - prev_monthly_net_profit) / NULLIF(ABS(prev_monthly_net_profit), 0)) * 100, 1) || '%'
    END as "Net Profit Trend",

    -- Untuk integer, kita biarkan NULL. Front-end biasanya me-render NULL sebagai kosong.
    active_users,
    inactive_users,

    waterfall_json as "Waterfall_JSON",
    planmix_json as "PlanMix_JSON"

FROM WithTrends
ORDER BY month DESC;