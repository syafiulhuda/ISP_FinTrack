-- ==============================================================================
-- ISP-FinTrack: Master Profitability & Business Intelligence Queries
-- ==============================================================================
-- File ini berisi query PostgreSQL yang mensimulasikan logika bisnis yang 
-- diimplementasikan pada Dashboard UI (src/app/page.tsx dan profitability/page.tsx).
-- Digunakan sebagai referensi Audit dan Verifikasi Data Keuangan.
-- ==============================================================================

-- 1. ANALISIS MRR (Monthly Recurring Revenue) & DISCREPANCY
-- Membandingkan kapasitas pendapatan dari pelanggan aktif vs uang yang terverifikasi.
WITH RevenueCapacity AS (
    SELECT 
        SUM(CAST(REPLACE(REPLACE(REPLACE(st.price, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) as estimated_mrr
    FROM customers c
    JOIN service_tiers st ON LOWER(
        CASE 
            WHEN LOWER(c.service) = 'gamers' THEN 'gamers node' 
            ELSE LOWER(c.service) 
        END
    ) = LOWER(st.name)
    WHERE c.status = 'Active'
),
VerifiedIncome AS (
    SELECT 
        SUM(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) as total_verified
    FROM transactions 
    WHERE status = 'Verified' AND keterangan = 'pemasukan'
)
SELECT 
    estimated_mrr as "MRR Capacity (Active Customers)",
    total_verified as "Verified Income (Transactions)",
    (estimated_mrr - total_verified) as "Revenue Discrepancy",
    ROUND(((estimated_mrr - total_verified)::numeric / NULLIF(estimated_mrr, 0)) * 100, 2) as "Discrepancy %"
FROM RevenueCapacity, VerifiedIncome;

-- 2. UNIT ECONOMICS (ARPU, CAC, CHURN)
-- Menghitung metrik performa bisnis utama.
SELECT 
    -- ARPU: Rata-rata pendapatan per pengguna aktif
    (SELECT SUM(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) FROM transactions WHERE status = 'Verified' AND keterangan = 'pemasukan') / 
    NULLIF((SELECT COUNT(*) FROM customers WHERE status = 'Active'), 0) as "ARPU (Verified)",

    -- CAC: Biaya akuisisi pelanggan (Total Expenses / Total Customers)
    (SELECT SUM(ABS(amount::numeric)) FROM expenses) / 
    NULLIF((SELECT COUNT(*) FROM customers), 0) as "CAC (Overall)",

    -- CHURN RATE: Persentase pelanggan yang berhenti
    ROUND(
        (SELECT COUNT(*) FROM customers WHERE status = 'Inactive')::numeric / 
        NULLIF((SELECT COUNT(*) FROM customers), 0) * 100, 2
    ) as "Churn Rate %";

-- 3. REGIONAL PROFITABILITY WITH ALLOCATION FACTOR
-- Simulasi pembagian biaya (Opex) berdasarkan jumlah pelanggan per wilayah.
WITH RegionalStats AS (
    SELECT 
        province,
        COUNT(*) as customer_count,
        (COUNT(*)::numeric / (SELECT COUNT(*) FROM customers)) as allocation_factor
    FROM customers
    GROUP BY province
),
RegionalIncome AS (
    SELECT 
        c.province,
        SUM(CAST(REPLACE(REPLACE(REPLACE(t.amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) as income
    FROM transactions t
    JOIN customers c ON split_part(t.id,'-',2) = c.id
    WHERE t.status = 'Verified' AND t.keterangan = 'pemasukan'
    GROUP BY c.province
)
SELECT 
    rs.province,
    rs.customer_count as "Subscribers",
    COALESCE(ri.income, 0) as "Verified Income",
    -- Alokasi biaya berdasarkan proporsi pelanggan di wilayah tersebut
    ROUND((SELECT SUM(ABS(amount::numeric)) FROM expenses) * rs.allocation_factor, 0) as "Allocated Expenses",
    -- Net Profit per wilayah
    COALESCE(ri.income, 0) - ROUND((SELECT SUM(ABS(amount::numeric)) FROM expenses) * rs.allocation_factor, 0) as "Net Profit"
FROM RegionalStats rs
LEFT JOIN RegionalIncome ri ON rs.province = ri.province
ORDER BY "Net Profit" DESC;

-- 4. INVENTORY VALUATION & UTILIZATION
-- Status aset berdasarkan penggunaan (is_used).
SELECT 
    type,
    COUNT(*) FILTER (WHERE is_used = true) as "In Use",
    COUNT(*) FILTER (WHERE is_used = false) as "In Stock (Ready)",
    COUNT(*) as "Total Assets",
    ROUND((COUNT(*) FILTER (WHERE is_used = true))::numeric / COUNT(*) * 100, 2) as "Utilization %"
FROM (
    SELECT type, true as is_used FROM asset_roster
    UNION ALL
    SELECT type, is_used FROM stock_asset_roster
) all_assets
GROUP BY type;

-- 5. GROWTH TREND (MONTHLY PERFORMANCE)
SELECT 
    TO_CHAR(timestamp, 'YYYY-MM') as "Month",
    COUNT(id) as "Transaction Count",
    SUM(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) as "Monthly Revenue"
FROM transactions
WHERE status = 'Verified' AND keterangan = 'pemasukan'
GROUP BY 1
ORDER BY 1 DESC;

-- 6. REVENUE WATERFALL ANALYSIS
-- Menggabungkan Pemasukan per Tipe dan Pengeluaran per Kategori
(
    -- Bagian 1: Pemasukan (Positif)
    SELECT
        type as "Component",
        SUM(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) as "Value",
        'Income' as "Type"
    FROM transactions
    WHERE status = 'Verified' AND keterangan = 'pemasukan'
    GROUP BY type
)
UNION ALL
(
    -- Bagian 2: Pengeluaran (Negatif)
    SELECT
        category as "Component",
        -SUM(ABS(amount::numeric)) as "Value",
        'Expense' as "Type"
    FROM expenses
    GROUP BY category
)
ORDER BY "Type" ASC, "Value" DESC;

-- 7. GROWTH TREND: AVERAGE MONTHLY REVENUE (TRENDING VALUE)
WITH MonthlyRevenue AS (
    SELECT
        TO_CHAR(timestamp, 'YYYY-MM') as month_key,
        SUM(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) as revenue
    FROM transactions
    WHERE status = 'Verified' AND keterangan = 'pemasukan'
    GROUP BY 1
    order by 1 desc
)
SELECT
    ROUND(AVG(revenue), 0) as "Average Monthly Trending"
FROM MonthlyRevenue;

WITH MonthlyRevenue AS (
    -- Mengambil total pemasukan dari transaksi yang terverifikasi
    SELECT 
        TO_CHAR(timestamp, 'YYYY-MM') as month,
        SUM(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) as revenue
    FROM transactions
    WHERE status = 'Verified' AND keterangan = 'pemasukan'
    GROUP BY 1
),
MonthlyExpenses AS (
    -- Mengambil pengeluaran dari tabel expenses
    SELECT 
        TO_CHAR(date, 'YYYY-MM') as month,
        SUM(ABS(amount::numeric)) as expense
    FROM expenses
    GROUP BY 1
),
AggregatedExpenses AS (
    -- Menggabungkan semua sumber pengeluaran per bulan
    SELECT month, SUM(expense) as total_expense
    FROM MonthlyExpenses
    GROUP BY 1
)
SELECT 
    COALESCE(r.month, e.month) as "Month",
    COALESCE(r.revenue, 0) as "Revenue",
    COALESCE(e.total_expense, 0) as "Expenses"
FROM MonthlyRevenue r
FULL OUTER JOIN AggregatedExpenses e ON r.month = e.month
ORDER BY "Month" ASC
LIMIT 6;

with activeCustomer as (
    select
        TO_CHAR("createdAt"::date, 'YYYY-MM') as month,
        count(*) as tot_cust
    from clients.public.customers c
    group by 1
)
, inactiveCustomer as (
    select
        TO_CHAR("createdAt"::date, 'YYYY-MM') as month,
        count(*) as inactive_cust
    from clients.public.customers c
    where status = 'Inactive'
    group by 1
)
select
    COALESCE(a.month, i.month) as "Month",
    sum(coalesce(a.tot_cust,0)) - sum(coalesce(i.inactive_cust,0)) as "Revenue"
from activeCustomer a
full outer join inactiveCustomer i on a.month = i.month
group by a.month, i.month


-- 8. REGIONAL PROFITABILITY ANALYSIS (MRR, EBITDA, NET PROFIT)
WITH ProvinceStats AS (
    -- Menghitung jumlah pelanggan dan faktor alokasi biaya per provinsi
    SELECT
        province,
        COUNT(*) as customer_count,
        (COUNT(*)::numeric / (SELECT COUNT(*) FROM customers)) as allocation_factor
    FROM customers
    GROUP BY province
),
RegionalIncome AS (
    -- Menghitung pendapatan terverifikasi per provinsi
    SELECT
        c.province,
        SUM(CAST(REPLACE(REPLACE(REPLACE(t.amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) as verified_mrr
    FROM transactions t
    JOIN customers c ON split_part(t.id, '-', 2) = c.id
    WHERE t.status = 'Verified' AND t.keterangan = 'pemasukan'
    GROUP BY c.province
),
TotalExpenses AS (
    -- Menghitung total pengeluaran global
    SELECT SUM(ABS(amount::numeric)) as global_expense FROM expenses
)
SELECT
    ps.province,
    ps.customer_count as "Active Customers",
    COALESCE(ri.verified_mrr, 0) as "MRR (Verified)",
    -- Net Profit = Pendapatan Provinsi - (Total Biaya * Faktor Alokasi)
    ROUND(COALESCE(ri.verified_mrr, 0) - (te.global_expense * ps.allocation_factor), 2) as "Net Profit",
    -- EBITDA Margin = (Net Profit / Pendapatan) * 100
    CASE
        WHEN COALESCE(ri.verified_mrr, 0) > 0
        THEN ROUND(((COALESCE(ri.verified_mrr, 0) - (te.global_expense * ps.allocation_factor)) / ri.verified_mrr) * 100, 2)
        ELSE 0
    END as "EBITDA Margin %"
FROM ProvinceStats ps
LEFT JOIN RegionalIncome ri ON ps.province = ri.province
CROSS JOIN TotalExpenses te
ORDER BY "Net Profit" DESC;



-- persentase total revenue
WITH MonthlyStats AS (
    -- 1. Menghitung statistik dasar per bulan
    SELECT 
        TO_CHAR(timestamp, 'YYYY-MM') as month,
        SUM(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) as revenue,
        COUNT(DISTINCT CASE WHEN status = 'Verified' THEN id END) as tx_count
    FROM transactions 
    WHERE status = 'Verified' AND keterangan = 'pemasukan'
    GROUP BY 1
),
LatestMonth AS (
    -- 2. Mengambil data bulan paling baru (Oktober)
    SELECT * FROM MonthlyStats ORDER BY month DESC LIMIT 1
),
BenchmarkStats AS (
    -- 3. Menghitung rata-rata dari Januari s/d bulan sebelum terakhir (Jan-Sep)
    SELECT 
        AVG(revenue) as avg_revenue
    FROM MonthlyStats
    WHERE month < (SELECT month FROM LatestMonth)
)
-- 4. Menghitung Persentase Tren
SELECT 
    l.month as "Bulan Terbaru",
    l.revenue as "Revenue Oktober",
    b.avg_revenue as "Rata-rata Jan-Sep",
    -- Rumus Persentase: ((Terbaru / Rata-rata) - 1) * 100
    ROUND(
        ((l.revenue / NULLIF(b.avg_revenue, 0)) - 1) * 100, 2
    ) as "Revenue Trend %"
FROM LatestMonth l, BenchmarkStats b;


-- persentase ARPU
WITH MonthlyData AS (
    SELECT
        m.month_date,
        TO_CHAR(m.month_date,'YYYY-MM') AS month,
        m.revenue,
        (
            SELECT COUNT(*)
            FROM customers c
            WHERE c.status = 'Active'
            AND date_trunc('month', c."createdAt"::date)
                <= m.month_date
        ) AS active_customers
    FROM (
        SELECT
            date_trunc('month', t.timestamp) AS month_date,
            SUM(
                CAST(
                    REPLACE(
                        REPLACE(
                            REPLACE(t.amount,'Rp ',''),
                        '.',''),
                    ',','') AS BIGINT
                )
            ) AS revenue
        FROM transactions t
        WHERE t.status='Verified'
          AND t.keterangan='pemasukan'
        GROUP BY 1
    ) m
),
ARPU_Monthly AS (
    SELECT
        month,
        revenue / NULLIF(active_customers,0) AS arpu
    FROM MonthlyData
),
LatestARPU AS (
    SELECT *
    FROM ARPU_Monthly
    ORDER BY month DESC
    LIMIT 1
),
BenchmarkARPU AS (
    SELECT AVG(arpu) AS avg_arpu
    FROM ARPU_Monthly
    WHERE month < (SELECT month FROM LatestARPU)
)
SELECT
    l.month AS "Bulan Terbaru",
    l.arpu AS "ARPU Terbaru",
    b.avg_arpu AS "Rata-rata ARPU Sebelumnya",
    ROUND(
        ((l.arpu / NULLIF(b.avg_arpu,0)) - 1) * 100,
        2
    ) AS "ARPU Trend %"
FROM LatestARPU l
CROSS JOIN BenchmarkARPU b;

-- Persemtase CAC
WITH monthly_expenses AS (
    SELECT
        to_char(date::date, 'YYYY-MM') as month_period,
        SUM(ABS(amount::numeric)) as total_cost
    FROM expenses
    GROUP BY 1
),
monthly_customers AS (
    SELECT
        to_char("createdAt"::date, 'YYYY-MM') as month_period,
        COUNT(*) as total_new_customers
    FROM customers
    GROUP BY 1
)
SELECT
    e.month_period,
    e.total_cost,
    c.total_new_customers,
    (e.total_cost / NULLIF(c.total_new_customers, 0)) as CAC
FROM monthly_expenses e
LEFT JOIN monthly_customers c ON e.month_period = c.month_period
ORDER BY e.month_period;


-- CHURN RATE
WITH ChurnData AS (
    SELECT
        -- 1. Hitung Rasio Churn Jan-Sep (Benchmark)
        (
            SELECT COUNT(*) FROM customers
            WHERE status = 'Inactive'
              AND "createdAt"::date BETWEEN '2026-01-01' AND '2026-09-30'
        )::numeric / NULLIF((SELECT COUNT(*) FROM customers), 0) * 100 as benchmark_rate,

        -- 2. Hitung Rasio Churn Oktober (Latest)
        select (
            SELECT COUNT(*) FROM customers
            WHERE status = 'Inactive'
              AND "createdAt"::date BETWEEN '2026-10-01' AND '2026-10-31'
        )::numeric / NULLIF((SELECT COUNT(*) FROM customers), 0) * 100 as latest_rate,

        -- 3. Hitung Churn Rate Keseluruhan (Untuk Angka Utama)
        (
            SELECT COUNT(*) FROM customers
            WHERE status = 'Inactive'
        )::numeric / NULLIF((SELECT COUNT(*) FROM customers), 0) * 100 as overall_rate
)
SELECT
    -- Angka Utama (Yang tampil besar di dashboard)
    ROUND(overall_rate, 2) || '%' as "Churn Rate (Overall)",

    -- Persentase Tren (Rasio perbandingan)
    -- Jika Oktober (4 orang) vs Jan-Sep (1 orang), hasilnya +400.0%
    '+' || ROUND((latest_rate / NULLIF(benchmark_rate, 0)) * 100, 1) || '%' as "Churn Trend"
FROM ChurnData;



WITH MonthlyRevenue AS (
    -- 1. Hitung pendapatan per bulan
    SELECT
        TO_CHAR(timestamp, 'YYYY-MM') as month,
        SUM(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) as monthly_amount
    FROM transactions
    WHERE status = 'Verified' AND keterangan = 'pemasukan'
    GROUP BY 1
),
RevenueMetrics AS (
    SELECT
        -- Pendapatan Bulan Oktober (Latest)
        (SELECT monthly_amount FROM MonthlyRevenue WHERE month = '2026-10') as october_revenue,

        -- Rata-rata Pendapatan Januari - September (Benchmark)
        (SELECT AVG(monthly_amount) FROM MonthlyRevenue WHERE month < '2026-10') as avg_prev_revenue,

        -- Total Seluruh Pendapatan (Angka Utama)
        (SELECT SUM(monthly_amount) FROM MonthlyRevenue) as total_annual_revenue
)
SELECT
    -- Angka Utama: Total Revenue Tahunan
    'Rp ' || TO_CHAR(total_annual_revenue, 'FM999,999,999,999') as "Total Revenue (Overall)",

    -- Persentase Tren: ((Oktober / Rata-rata Jan-Sep) - 1) * 100
    -- Menghasilkan +1591.4% jika Oktober jauh lebih besar dari rata-rata bulan sebelumnya
    '+' || ROUND(
        ((october_revenue / NULLIF(avg_prev_revenue, 0)) - 1) * 100,
    1) || '%' as "Revenue Trend %"
FROM RevenueMetrics;



WITH MonthlyBase AS (
    -- 1. Kumpulkan Pendapatan & Pengeluaran per Bulan
    SELECT
        TO_CHAR(t.timestamp, 'YYYY-MM') as month,
        SUM(CASE WHEN t.keterangan = 'pemasukan' THEN
            CAST(REPLACE(REPLACE(REPLACE(t.amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT) ELSE 0 END) as revenue,
        (
            SELECT SUM(ABS(amount::numeric))
            FROM expenses e
            WHERE TO_CHAR(e.date, 'YYYY-MM') = TO_CHAR(t.timestamp, 'YYYY-MM')
        ) + SUM(CASE WHEN t.keterangan = 'pengeluaran' THEN
            CAST(REPLACE(REPLACE(REPLACE(t.amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT) ELSE 0 END) as total_exp
    FROM transactions t
    WHERE t.status = 'Verified'
    GROUP BY 1
),
CalculatedMetrics AS (
    -- 2. Hitung Profit & Margin per Bulan
    SELECT
        month,
        revenue as mrr,
        (revenue - total_exp) as net_profit,
        CASE WHEN revenue > 0 THEN ((revenue - total_exp) / revenue::numeric) * 100 ELSE 0 END as ebitda_margin
    FROM MonthlyBase
),
FinalAnalysis AS (
    -- 3. Pisahkan Data Oktober (Latest) vs Rata-rata Jan-Sep (Benchmark)
    SELECT
        -- Data Oktober
        (SELECT mrr FROM CalculatedMetrics WHERE month = '2026-10') as oct_mrr,
        (SELECT ebitda_margin FROM CalculatedMetrics WHERE month = '2026-10') as oct_margin,
        (SELECT net_profit FROM CalculatedMetrics WHERE month = '2026-10') as oct_profit,

        -- Benchmark (Rata-rata Jan - Sep)
        (SELECT AVG(mrr) FROM CalculatedMetrics WHERE month < '2026-10') as avg_prev_mrr,
        (SELECT AVG(ebitda_margin) FROM CalculatedMetrics WHERE month < '2026-10') as avg_prev_margin,
        (SELECT AVG(net_profit) FROM CalculatedMetrics WHERE month < '2026-10') as avg_prev_profit
)
SELECT
    -- MRR & Tren
    'Rp ' || TO_CHAR(oct_mrr, 'FM999,999,999,999') as "MRR (October)",
    '+' || ROUND(((oct_mrr / NULLIF(avg_prev_mrr, 0)) - 1) * 100, 1) || '%' as "MRR Trend",

    -- EBITDA Margin & Tren
    ROUND(oct_margin, 1) || '%' as "EBITDA Margin (October)",
    '+' || ROUND(((oct_margin / NULLIF(avg_prev_margin, 0)) - 1) * 100, 1) || '%' as "EBITDA Margin Trend",

    -- Net Profit & Tren
    'Rp ' || TO_CHAR(oct_profit, 'FM999,999,999,999') as "Net Profit (October)",
    '+' || ROUND(((oct_profit / NULLIF(avg_prev_profit, 0)) - 1) * 100, 1) || '%' as "Net Profit Trend"
FROM FinalAnalysis;



-- Profitability
-- EBITDA
WITH MonthSeries AS (
    SELECT DISTINCT TO_CHAR(date_trunc('month', d), 'YYYY-MM') as month
    FROM (
        SELECT timestamp as d FROM transactions WHERE status = 'Verified'
        UNION
        SELECT date as d FROM expenses
    ) sub
),
MonthlyStats AS (
    SELECT
        m.month,
        -- PENDAPATAN (Harus Positif)
        COALESCE((
            SELECT SUM(ABS(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)))
            FROM transactions t
            WHERE status = 'Verified' AND keterangan = 'pemasukan' AND TO_CHAR(t.timestamp, 'YYYY-MM') = m.month
        ), 0) as revenue,

        -- PENGELUARAN (Kita paksa jadi POSITIF dengan ABS agar bisa dikurangi)
        COALESCE((
            SELECT SUM(ABS(amount::numeric))
            FROM expenses e WHERE TO_CHAR(e.date, 'YYYY-MM') = m.month
        ), 0) +
        COALESCE((
            SELECT SUM(ABS(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)))
            FROM transactions t
            WHERE status = 'Verified' AND keterangan = 'pengeluaran' AND TO_CHAR(t.timestamp, 'YYYY-MM') = m.month
        ), 0) as total_exp
    FROM MonthSeries m
),
CalculatedMonths AS (
    SELECT
        month,
        revenue,
        total_exp,
        (revenue - total_exp) as profit,
        CASE WHEN revenue > 0 THEN ((revenue - total_exp) / revenue::numeric) * 100 ELSE 0 END as margin
    FROM MonthlyStats
),
EbitdaAnalysis AS (
    SELECT
        -- EBITDA Margin Keseluruhan
        ( (SUM(revenue) - SUM(total_exp)) / NULLIF(SUM(revenue), 0) ) * 100 as overall_ebitda,

        -- Data Tren (Oktober vs Jan-Sep)
        (SELECT margin FROM CalculatedMonths WHERE month = '2026-10') as oct_margin,
        (SELECT AVG(margin) FROM CalculatedMonths WHERE month < '2026-10') as benchmark_margin
    FROM CalculatedMonths
)
SELECT
    -- Angka Utama
    ROUND(overall_ebitda, 1) || '%' as "EBITDA Margin (Annual)",

    -- Tren
    '+' || ROUND(((oct_margin / NULLIF(benchmark_margin, 0)) - 1) * 100, 1) || '%' as "EBITDA Trend %"
FROM EbitdaAnalysis;


-- Net Profit
WITH MonthSeries AS (
    SELECT DISTINCT TO_CHAR(date_trunc('month', d), 'YYYY-MM') as month
    FROM (
        SELECT timestamp as d FROM transactions WHERE status = 'Verified'
        UNION
        SELECT date as d FROM expenses
    ) sub
),
MonthlyStats AS (
    SELECT
        m.month,
        -- PENDAPATAN (Hanya yang terkait customer)
        COALESCE((
            SELECT SUM(ABS(CAST(REPLACE(REPLACE(REPLACE(t.amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)))
            FROM transactions t
            JOIN customers c ON CAST(c.id AS TEXT) = CAST(split_part(t.id,'-',2) AS TEXT)
            WHERE t.status = 'Verified' AND t.keterangan = 'pemasukan'
              AND TO_CHAR(t.timestamp, 'YYYY-MM') = m.month
        ), 0) as revenue,

        -- PENGELUARAN (Tabel Expenses + Transaksi Pengeluaran yang HARUS terkait customer agar sinkron Web)
        COALESCE((
            SELECT SUM(ABS(amount::numeric)) FROM expenses e
            WHERE TO_CHAR(e.date, 'YYYY-MM') = m.month
        ), 0) +
        COALESCE((
            SELECT SUM(ABS(CAST(REPLACE(REPLACE(REPLACE(t.amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)))
            FROM transactions t
            JOIN customers c ON CAST(c.id AS TEXT) = CAST(split_part(t.id,'-',2) AS TEXT) -- TAMBAHKAN JOIN INI
            WHERE t.status = 'Verified' AND t.keterangan = 'pengeluaran'
              AND TO_CHAR(t.timestamp, 'YYYY-MM') = m.month
        ), 0) as total_exp
    FROM MonthSeries m
),
CalculatedMonths AS (
    SELECT
        month,
        (revenue - total_exp) as monthly_net_profit
    FROM MonthlyStats
),
NetProfitAnalysis AS (
    SELECT
        SUM(monthly_net_profit) as annual_net_profit,
        (SELECT monthly_net_profit FROM CalculatedMonths WHERE month = '2026-10') as oct_profit,
        (SELECT AVG(monthly_net_profit) FROM CalculatedMonths WHERE month < '2026-10') as benchmark_profit
    FROM CalculatedMonths
)
SELECT
    'Rp ' || TO_CHAR(annual_net_profit / 1000000.0, 'FM999,999.90') || 'M' as "Net Profit (Annual Total)",
    '+' || ROUND(((oct_profit / NULLIF(benchmark_profit, 0)) - 1) * 100, 1) || '%' as "Net Profit Trend %"
FROM NetProfitAnalysis;