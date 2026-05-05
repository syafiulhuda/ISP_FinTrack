WITH CombinedData AS (
    -- Data dari Transactions (Revenue & Field Expenses)
    SELECT 
        CASE 
            WHEN c.province = 'Maluku' THEN 'Maluku'
            WHEN t.city ILIKE '%Ambon%' OR t.city ILIKE '%Tual%' OR t.city ILIKE '%Buru%' OR t.city ILIKE '%Maluku%' OR t.city ILIKE '%Seram%' THEN 'Maluku'
            ELSE 'Other'
        END as province_group,
        t.amount as amt,
        CASE WHEN t.keterangan = 'pemasukan' THEN 1 ELSE -1 END as factor
    FROM transactions t
    LEFT JOIN customers c ON split_part(t.id, '-', 2) = c.id::text
    WHERE t.status = 'Verified'
      AND t.timestamp AT TIME ZONE 'Asia/Jakarta' >= '2026-01-01'
      AND t.timestamp AT TIME ZONE 'Asia/Jakarta' <= '2026-12-31'
    
    UNION ALL
    
    -- Data dari Expenses (General Operational Expenses)
    SELECT 
        CASE 
            WHEN e.city ILIKE '%Ambon%' OR e.city ILIKE '%Tual%' OR e.city ILIKE '%Buru%' OR e.city ILIKE '%Maluku%' OR e.city ILIKE '%Seram%' THEN 'Maluku'
            ELSE 'Other'
        END as province_group,
        CAST(e.amount AS NUMERIC) as amt,
        -1 as factor
    FROM expenses e
    WHERE e.date AT TIME ZONE 'Asia/Jakarta' >= '2026-01-01'
      AND e.date AT TIME ZONE 'Asia/Jakarta' <= '2026-12-31'
)
SELECT 
    province_group,
    SUM(amt * factor) as raw_profit_value
FROM CombinedData
WHERE province_group = 'Maluku'
GROUP BY 1;
