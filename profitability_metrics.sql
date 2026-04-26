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