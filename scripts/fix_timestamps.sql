-- Perbaiki timestamp transaksi berdasarkan createdAt customer
UPDATE public.transactions t
SET timestamp = TO_TIMESTAMP(c."createdAt", 'YYYY-MM-DD')
FROM public.customers c
WHERE t.customer_id = c.id;

-- Tambahkan waktu acak sedikit (jam, menit) agar tidak tepat jam 00:00:00 semua (opsional tapi lebih bagus)
UPDATE public.transactions
SET timestamp = timestamp + (random() * interval '23 hours') + (random() * interval '59 minutes');

-- Lihat hasil perbaikan
SELECT id, customer_id, timestamp 
FROM public.transactions 
WHERE customer_id IS NOT NULL 
LIMIT 10;
