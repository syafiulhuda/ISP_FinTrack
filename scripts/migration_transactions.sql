-- 1. Siapkan tabel transactions baru
DROP TABLE IF EXISTS transactions_new;
CREATE TABLE transactions_new (
    id TEXT PRIMARY KEY,
    method TEXT,
    amount TEXT,
    status TEXT,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    type TEXT,
    customer_id TEXT
);

-- 2. Migrasi data awal (sinkronkan dengan createdAt customer)
-- Kita buat satu transaksi 'Verified' untuk setiap customer berdasarkan tanggal join mereka
-- Menggunakan harga paket dari service_tiers, default ke Rp 150.000 jika tidak ada
INSERT INTO transactions_new (id, method, amount, status, timestamp, type, customer_id)
SELECT 
    'TRX-' || c.id || '-INIT',
    'Initial Payment',
    COALESCE(s.price, 'Rp 150.000'),
    'Verified',
    TO_TIMESTAMP(c."createdAt", 'YYYY-MM-DD'),
    CASE 
        WHEN c.id LIKE '%1%' THEN 'bank'
        ELSE 'qris'
    END,
    c.id
FROM customers c
LEFT JOIN service_tiers s ON 
    LOWER(c.service) = LOWER(s.name) OR 
    (LOWER(s.name) = 'gamers node' AND LOWER(c.service) = 'gamers')
WHERE c."createdAt" IS NOT NULL;

-- 3. Ganti tabel lama
DROP TABLE IF EXISTS transactions CASCADE;
ALTER TABLE transactions_new RENAME TO transactions;

-- 4. Buat index untuk performa
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX idx_transactions_status ON transactions(status);
