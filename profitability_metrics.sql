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
    (SELECT SUM(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) FROM transactions WHERE status = 'Verified') / 
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
    JOIN customers c ON t.customer_id = c.id
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
