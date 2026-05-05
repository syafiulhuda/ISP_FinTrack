WITH RegionMapping AS (
    -- Map Transactions to Regions
    SELECT 
        t.id as ref_id,
        'transaction' as source,
        CASE 
            WHEN c.province IS NOT NULL THEN c.province
            WHEN t.city ILIKE '%Jakarta%' THEN 'DKI Jakarta'
            WHEN t.city ILIKE '%Bandung%' OR t.city ILIKE '%Bogor%' OR t.city ILIKE '%Depok%' OR t.city ILIKE '%Bekasi%' OR t.city ILIKE '%Cimahi%' OR t.city ILIKE '%Tasikmalaya%' OR t.city ILIKE '%BDO%' THEN 'Jawa Barat'
            WHEN t.city ILIKE '%Surabaya%' OR t.city ILIKE '%Malang%' OR t.city ILIKE '%Sidoarjo%' OR t.city ILIKE '%Gresik%' OR t.city ILIKE '%Gubeng%' THEN 'Jawa Timur'
            WHEN t.city ILIKE '%Ambon%' OR t.city ILIKE '%Tual%' OR t.city ILIKE '%Buru%' OR t.city ILIKE '%Maluku%' THEN 'Maluku'
            WHEN t.city ILIKE '%Makassar%' OR t.city ILIKE '%Panakkukang%' THEN 'Sulawesi Selatan'
            ELSE 'Other'
        END as region,
        t.amount as value,
        CASE WHEN t.keterangan = 'pemasukan' THEN 1 ELSE -1 END as factor
    FROM transactions t
    LEFT JOIN customers c ON split_part(t.id, '-', 2) = c.id::text
    WHERE t.status = 'Verified'
      AND t.timestamp AT TIME ZONE 'Asia/Jakarta' >= '2026-01-01'
      AND t.timestamp AT TIME ZONE 'Asia/Jakarta' <= '2026-05-31'

    UNION ALL

    -- Map Expenses to Regions
    SELECT 
        id::text as ref_id,
        'expense' as source,
        CASE 
            WHEN e.city ILIKE '%Jakarta%' THEN 'DKI Jakarta'
            WHEN e.city ILIKE '%Bandung%' OR e.city ILIKE '%Bogor%' OR e.city ILIKE '%Depok%' OR e.city ILIKE '%Bekasi%' OR e.city ILIKE '%Cimahi%' OR e.city ILIKE '%BDO%' THEN 'Jawa Barat'
            WHEN e.city ILIKE '%Surabaya%' OR e.city ILIKE '%Malang%' OR e.city ILIKE '%Sidoarjo%' OR e.city ILIKE '%Gresik%' OR e.city ILIKE '%Gubeng%' THEN 'Jawa Timur'
            WHEN e.city ILIKE '%Ambon%' OR e.city ILIKE '%Tual%' OR e.city ILIKE '%Buru%' OR e.city ILIKE '%Maluku%' THEN 'Maluku'
            WHEN e.city ILIKE '%Makassar%' OR e.city ILIKE '%Panakkukang%' THEN 'Sulawesi Selatan'
            ELSE 'Other'
        END as region,
        CAST(e.amount AS NUMERIC) as value,
        -1 as factor
    FROM expenses e
    WHERE e.date AT TIME ZONE 'Asia/Jakarta' >= '2026-01-01'
      AND e.date AT TIME ZONE 'Asia/Jakarta' <= '2026-05-31'
),
InventoryStats AS (
    -- Map Assets to Regions
    SELECT 
        CASE 
            WHEN location ILIKE '%Jakarta%' THEN 'DKI Jakarta'
            WHEN location ILIKE '%Bandung%' OR location ILIKE '%Cimahi%' OR location ILIKE '%BDO%' THEN 'Jawa Barat'
            WHEN location ILIKE '%Surabaya%' OR location ILIKE '%Gubeng%' THEN 'Jawa Timur'
            WHEN location ILIKE '%Ambon%' OR location ILIKE '%Maluku%' THEN 'Maluku'
            WHEN location ILIKE '%Makassar%' OR location ILIKE '%Panakkukang%' THEN 'Sulawesi Selatan'
            ELSE 'Other'
        END as region,
        COUNT(*) as asset_count,
        SUM(COALESCE(CAST(harga_beli AS NUMERIC), 0)) as valuation
    FROM asset_roster
    GROUP BY 1
)
SELECT 
    COALESCE(r.region, i.region) as region,
    SUM(CASE WHEN r.factor = 1 THEN r.value ELSE 0 END) as revenue,
    SUM(CASE WHEN r.factor = -1 THEN r.value ELSE 0 END) as expenses,
    SUM(COALESCE(r.value * r.factor, 0)) as net_profit,
    COALESCE(i.asset_count, 0) as total_assets,
    COALESCE(i.valuation, 0) as valuation
FROM RegionMapping r
FULL OUTER JOIN InventoryStats i ON r.region = i.region
GROUP BY 1, i.asset_count, i.valuation
ORDER BY net_profit DESC;
