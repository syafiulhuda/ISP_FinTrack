-- FIXED VERSION OF YOUR QUERY
WITH base AS (
    -- INCOME
    SELECT
        c.province,
        c.city,
        DATE_TRUNC('month', t.timestamp) as month_sort,
        SUM(CAST(REPLACE(REPLACE(REPLACE(t.amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) as total_value
    FROM customers c
    LEFT JOIN transactions t 
        ON c.id = split_part(t.id,'-',2)
       AND t.status ILIKE 'verified'
       -- AND t.keterangan != 'pengeluaran' -- Optional, since expenses table already handled below
       AND t.timestamp::date BETWEEN '2026-04-01' AND '2026-04-30'
    WHERE c.status = 'Active'
    GROUP BY 1, 2, 3
    
    UNION ALL
    
    -- EXPENSE
    SELECT
        c.province as province,
        e.city,
        DATE_TRUNC('month', e.date) as month_sort,
        e.amount as total_value
    FROM expenses e
    LEFT JOIN (
        SELECT DISTINCT city, province
        FROM customers
        WHERE status = 'Active'
    ) c
        ON c.city = e.city
    WHERE e.date BETWEEN '2026-04-01' AND '2026-04-30'
),
final AS (
    SELECT
        COALESCE(
            b.province,
            CASE
                WHEN b.city LIKE 'Jakarta%' THEN 'DKI Jakarta'
                WHEN b.city IN ('Bandung') THEN 'Jawa Barat'
                WHEN b.city IN ('Semarang','Solo') THEN 'Jawa Tengah'
                WHEN b.city IN ('Surabaya','Malang') THEN 'Jawa Timur'
                WHEN b.city IN ('Yogyakarta','Sleman') THEN 'DI Yogyakarta'
                WHEN b.city = 'Makassar' THEN 'Sulawesi Selatan'
                WHEN b.city = 'Manado' THEN 'Sulawesi Utara'
                WHEN b.city = 'Medan' THEN 'Sumatera Utara'
                WHEN b.city = 'Pekanbaru' THEN 'Riau'
                WHEN b.city = 'Balikpapan' THEN 'Kalimantan Timur'
                WHEN b.city = 'Banjarmasin' THEN 'Kalimantan Selatan'
                WHEN b.city = 'Tarakan' THEN 'Kalimantan Utara'
                WHEN b.city IN ('Denpasar','Badung') THEN 'Bali'
            END
        ) as province,
        total_value
    FROM base b
)
SELECT
    province,
    SUM(total_value) as total_value
FROM final
GROUP BY province
ORDER BY total_value DESC;
