-- TEST NATIONAL
SELECT TO_CHAR(timestamp, 'Mon YYYY') as name, 
       SUM(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) as value 
FROM transactions 
WHERE status ILIKE 'verified' 
  AND timestamp::date >= '2026-01-01' AND timestamp::date <= '2026-12-31' 
GROUP BY 1, DATE_TRUNC('month', timestamp) 
ORDER BY DATE_TRUNC('month', timestamp);

-- TEST REGIONAL (West Java)
SELECT TO_CHAR(t.timestamp, 'Mon YYYY') as name, 
       SUM(CAST(REPLACE(REPLACE(REPLACE(t.amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) as value 
FROM transactions t
LEFT JOIN customers c ON split_part(t.id,'-',2) = c.id
LEFT JOIN expenses e ON split_part(t.id,'-',2) = e.id::text
WHERE t.status ILIKE 'verified' 
  AND t.timestamp::date >= '2026-01-01' AND t.timestamp::date <= '2026-12-31' 
  AND (c.province = 'Jawa Barat' OR e.province = 'Jawa Barat')
GROUP BY 1, DATE_TRUNC('month', t.timestamp) 
ORDER BY DATE_TRUNC('month', t.timestamp);
