-- 1. Buat tabel utama untuk history (Parent Table)
CREATE TABLE IF NOT EXISTS transaction_history (
    id TEXT,
    method TEXT,
    amount NUMERIC,
    status TEXT,
    timestamp TIMESTAMPTZ,
    type TEXT,
    customer_id TEXT
) PARTITION BY RANGE (timestamp);

-- 2. Fungsi untuk membuat partisi otomatis
CREATE OR REPLACE FUNCTION create_transaction_partition()
RETURNS TRIGGER AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    partition_name := 'transaction_history_' || to_char(NEW.timestamp, 'YYYY_MM');
    start_date := date_trunc('month', NEW.timestamp);
    end_date := start_date + interval '1 month';

    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = partition_name) THEN
        EXECUTE format('CREATE TABLE %I PARTITION OF transaction_history FOR VALUES FROM (%L) TO (%L)', 
                       partition_name, start_date, end_date);
    END IF;

    INSERT INTO transaction_history VALUES (NEW.*);
    RETURN NULL; -- Karena kita sudah memasukkannya ke tabel partisi
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger untuk menyalin setiap transaksi baru ke history
DROP TRIGGER IF EXISTS trg_archive_transaction ON transactions;
CREATE TRIGGER trg_archive_transaction
BEFORE INSERT ON transactions
FOR EACH ROW EXECUTE FUNCTION create_transaction_partition();

-- 4. Inisialisasi data history dari data yang sudah ada
-- Kita konversi harga 'Rp 150.000' ke NUMERIC 150000
INSERT INTO transaction_history
SELECT 
    id, 
    method, 
    CAST(REPLACE(REPLACE(amount, 'Rp ', ''), '.', '') AS NUMERIC), 
    status, 
    timestamp, 
    type, 
    customer_id 
FROM transactions;
