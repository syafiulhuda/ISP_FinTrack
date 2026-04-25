-- 1. Bersihkan data lama (opsional, tapi disarankan agar ID TRX tidak bentrok)
DELETE FROM transactions;

-- 2. Ubah tipe data timestamp menjadi TIMESTAMPTZ (otomatis)
-- Karena sebelumnya 'text', kita harus menghapus data (sudah dilakukan di atas) atau konversi.
ALTER TABLE transactions 
ALTER COLUMN timestamp TYPE TIMESTAMPTZ 
USING CURRENT_TIMESTAMP;

ALTER TABLE transactions 
ALTER COLUMN timestamp SET DEFAULT CURRENT_TIMESTAMP;

-- 3. Tambahkan data baru berdasarkan relasi customers dan service_tiers
INSERT INTO transactions (id, amount, status, type, method, timestamp)
SELECT 
    'TRX-' || c.id, 
    st.price, 
    'Verified',
    (ARRAY['bank', 'qris', 'e-wallet'])[floor(random() * 3 + 1)], -- Random type
    CASE 
        WHEN random() < 0.33 THEN 'Bank Transfer'
        WHEN random() < 0.66 THEN 'QRIS Dynamic'
        ELSE 'E-Wallet Payment'
    END, -- Random method matching type
    CURRENT_TIMESTAMP
FROM customers c
JOIN service_tiers st ON c.service = st.name
WHERE c.status = 'Active';

-- 4. Verifikasi & Compare Total
-- Perbandingan 1: Total dari Customers * Service Tiers
SELECT 'CUSTOMERS_TOTAL' as category, SUM(CAST(REPLACE(REPLACE(st.price, 'Rp ', ''), '.', '') AS BIGINT)) as total_value
FROM customers c
JOIN service_tiers st ON c.service = st.name
WHERE c.status = 'Active'

UNION ALL

-- Perbandingan 2: Total dari Tabel Transactions Baru
SELECT 'TRANSACTIONS_TOTAL' as category, SUM(CAST(REPLACE(REPLACE(amount, 'Rp ', ''), '.', '') AS BIGINT)) as total_value
FROM transactions;
