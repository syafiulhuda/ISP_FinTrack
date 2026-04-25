SELECT 
    (SELECT COUNT(*) FROM customers WHERE "createdAt" LIKE '2026-01%') as first_month_base,
    (SELECT SUM(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) FROM transactions WHERE status = 'Verified') as annual_revenue,
    (SELECT SUM(ABS(amount)) FROM expenses) as total_expenses,
    (SELECT COUNT(*) FROM customers WHERE status = 'Active') as active_customers,
    (SELECT COUNT(*) FROM customers WHERE status = 'Inactive') as inactive_customers,
    (SELECT COUNT(*) FROM customers) as total_customers;
