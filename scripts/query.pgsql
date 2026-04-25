SELECT c.id, c.name, c.status, c.service 
FROM customers c 
LEFT JOIN transactions t ON 'TRX-' || c.id = t.id 
WHERE t.id IS NULL;
