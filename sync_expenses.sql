-- 1. Sinkronisasi data yang belum ada di expenses
INSERT INTO expenses (category, amount, date, description, city)
SELECT 
    type,
    CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS NUMERIC) as num_amount,
    timestamp::date as tx_date,
    id,
    city
FROM transactions t
WHERE t.keterangan = 'pengeluaran'
  AND NOT EXISTS (
      SELECT 1 FROM expenses e 
      WHERE e.amount = CAST(REPLACE(REPLACE(REPLACE(t.amount, 'Rp ', ''), '.', ''), ',', '') AS NUMERIC)
        AND e.date = t.timestamp::date
        AND e.city = t.city
  );

-- 2. Pembuatan Trigger
CREATE OR REPLACE FUNCTION sync_transaction_to_expense()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.keterangan = 'pengeluaran' THEN
        INSERT INTO expenses (category, amount, date, description, city)
        VALUES (
            NEW.type,
            CAST(REPLACE(REPLACE(REPLACE(NEW.amount, 'Rp ', ''), '.', ''), ',', '') AS NUMERIC),
            NEW.timestamp::date,
            NEW.id,
            NEW.city
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_expense ON transactions;

CREATE TRIGGER trg_sync_expense
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION sync_transaction_to_expense();
