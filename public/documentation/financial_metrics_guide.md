# ISP-FinTrack Financial & Analytics Documentation

Dokumen ini merincikan rumus bisnis dan query PostgreSQL yang digunakan untuk menghitung metrik utama pada dashboard ISP-FinTrack.

---

## 1. Regional Analysis (`/regional`)
Fokus pada distribusi pelanggan dan penetrasi pasar geografis.

### A. Subscriber Distribution by Province
**Rumus**: Total hitung pelanggan unik per provinsi.
```sql
SELECT 
    province as name, 
    COUNT(*) as value 
FROM customers 
GROUP BY province 
ORDER BY value DESC;
```

### B. Service Tier Penetration
**Rumus**: Distribusi paket layanan (Premium, Standard, dll) di wilayah tertentu.
```sql
SELECT 
    service as name, 
    COUNT(*) as value 
FROM customers 
WHERE province = $1 -- Parameter: 'Jawa Barat', dll
GROUP BY service;
```

---

## 2. Finance Metrics (`/finance`)
Metrik efisiensi biaya dan kesehatan pendapatan rata-rata.

### A. ARPU (Average Revenue Per User)
**Rumus**: Total Revenue (Verified) / Total Active Customers.
```sql
SELECT 
  SUM(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) / 
  NULLIF((SELECT COUNT(*) FROM customers WHERE status = 'Active'), 0) as arpu
FROM transactions 
WHERE status ILIKE 'verified';
```

### B. CAC (Customer Acquisition Cost)
**Rumus**: Total Biaya Marketing / Jumlah Pelanggan Baru.
```sql
SELECT 
  (SELECT SUM(amount) FROM expenses WHERE category = 'Marketing') / 
  NULLIF((SELECT COUNT(*) FROM customers WHERE "createdAt" >= DATE_TRUNC('month', CURRENT_DATE)), 0) as cac;
```

### C. Churn Rate
**Rumus**: (Pelanggan Berhenti / Total Pelanggan) x 100.
```sql
SELECT 
  (SELECT COUNT(*) FROM customers WHERE status = 'Inactive')::float / 
  NULLIF((SELECT COUNT(*) FROM customers), 0) * 100 as churn_rate;
```

---

## 3. Profitability Metrics (`/profitability`)
Metrik kesehatan finansial jangka panjang dan tren pertumbuhan.

### A. MRR (Monthly Recurring Revenue - Verified)
**Rumus**: Akumulasi nilai transaksi berulang yang telah diverifikasi dalam bulan berjalan.
```sql
SELECT SUM(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) as mrr
FROM transactions 
WHERE status ILIKE 'verified' 
  AND timestamp::date >= DATE_TRUNC('month', CURRENT_DATE);
```

### B. EBITDA Margin
**Rumus**: ((Revenue - OPEX) / Revenue) * 100.
```sql
WITH stats AS (
  SELECT 
    (SELECT SUM(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) FROM transactions WHERE status ILIKE 'verified') as revenue,
    (SELECT SUM(amount) FROM expenses) as opex
)
SELECT 
  CASE WHEN revenue > 0 THEN ((revenue - opex) / revenue) * 100 ELSE 0 END as ebitda_margin 
FROM stats;
```

### C. Net Profit
**Rumus**: Total Revenue - Total Expenses.
```sql
SELECT 
  (SELECT SUM(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) FROM transactions WHERE status ILIKE 'verified') - 
  (SELECT SUM(amount) FROM expenses) as net_profit;
```

### D. Revenue Waterfall Logic
**Rumus**: Klasifikasi pendapatan berdasarkan tipe sumber (New, Renewal, Upgrade).
```sql
SELECT 
    type as name, 
    SUM(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) as value 
FROM transactions 
WHERE status ILIKE 'verified'
GROUP BY type;
```

### E. Growth Trend (MoM)
**Rumus**: Perbandingan MRR antar bulan secara berurutan.
```sql
SELECT 
  TO_CHAR(timestamp::date, 'Mon YYYY') as month,
  SUM(CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS BIGINT)) as revenue
FROM transactions
WHERE status ILIKE 'verified'
GROUP BY 1, DATE_TRUNC('month', timestamp::date)
ORDER BY DATE_TRUNC('month', timestamp::date);
```

---
*Dokumen ini dibuat secara otomatis oleh Antigravity AI Assistant.*
