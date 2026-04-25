# ISP-FinTrack: Dokumentasi Rumus & Logika Bisnis (Master Reference)

Dokumen ini adalah referensi otoritatif untuk seluruh perhitungan metrik finansial, operasional, dan analitik di aplikasi ISP-FinTrack. Dokumentasi ini disinkronkan dengan logika yang diimplementasikan pada kode sumber (`src/app/**`) dan query database.

---

## 1. Metrik Pendapatan (Revenue Metrics)

### 1.1. Monthly Recurring Revenue (MRR)
Sistem menggunakan dua metode perhitungan MRR untuk memastikan akurasi data:
*   **Estimated MRR (Kapasitas)**: Dihitung berdasarkan jumlah pelanggan aktif dikalikan harga paket mereka.
    *   **Rumus**: `SUM(service_tiers.price)` WHERE `customers.status = 'Active'`
    *   **Kode**: `src/app/page.tsx` (Logic di `estimatedRevenue`)
*   **Verified MRR (Realita)**: Dihitung berdasarkan total uang yang benar-benar masuk dan telah diverifikasi.
    *   **Rumus**: `SUM(transactions.amount)` WHERE `status = 'Verified'` AND `keterangan = 'pemasukan'`
    *   **Kode**: `src/app/profitability/page.tsx` (Logic di `mrrVerified`)

> **Logika Fallback**: Di Dashboard Utama, jika `estimatedRevenue` bernilai 0 (data pelanggan belum lengkap), sistem akan menggunakan `totalVerifiedRevenue` sebagai cadangan tampilan.

### 1.2. Average Revenue Per User (ARPU)
Mengukur nilai rata-rata kontribusi pendapatan dari setiap pelanggan aktif.
*   **Rumus**: `Verified MRR / Jumlah Pelanggan Aktif`
*   **File**: `src/app/page.tsx` (Logic di `currentARPU`)

---

## 2. Metrik Efisiensi & Pertumbuhan (Efficiency & Growth)

### 2.1. Customer Acquisition Cost (CAC)
Dalam sistem FinTrack, CAC dihitung secara agregat mencakup seluruh biaya operasional dibagi total basis pelanggan untuk mendapatkan gambaran biaya "pemeliharaan" per akun.
*   **Rumus**: `Total Absolute Expense / Total Seluruh Pelanggan`
*   **File**: `src/app/page.tsx` (Logic di `cacVal`)
*   **Catatan**: Menggunakan `Math.abs()` pada nilai `amount` di tabel `expenses` untuk memastikan pengeluaran negatif tetap terhitung sebagai biaya positif dalam rasio.

### 2.2. Churn Rate
Persentase kehilangan pelanggan dibandingkan dengan total basis pelanggan.
*   **Rumus**: `(Jumlah Pelanggan Inactive / Total Seluruh Pelanggan) * 100`
*   **File**: `src/app/page.tsx` (Logic di `churnRateVal`)

---

## 3. Analisis Profitabilitas Wilayah (Regional Profitability)

### 3.1. Allocation Factor (Faktor Alokasi Biaya)
Karena biaya operasional (`expenses`) seringkali bersifat global (pusat), sistem membagi biaya tersebut ke tiap wilayah secara proporsional berdasarkan jumlah pelanggan di wilayah tersebut.
*   **Rumus**: `Jumlah Pelanggan di Provinsi X / Total Seluruh Pelanggan`
*   **File**: `src/app/profitability/page.tsx` (Logic di `allocationFactor`)

### 3.2. Regional Net Profit
*   **Rumus**: `Verified Income Wilayah - (Total Pengeluaran Global * Allocation Factor)`
*   **File**: `src/app/profitability/page.tsx` (Logic di `netProfit`)

---

## 4. Manajemen Aset & Inventaris (Inventory Logic)

### 4.1. Status Penggunaan Aset (`is_used`)
Status aset ditentukan berdasarkan lokasi keberadaannya:
*   **Aset di Lapangan (`asset_roster`)**: Otomatis dianggap `is_used = true` (In Use).
*   **Aset di Gudang (`stock_asset_roster`)**: Status mengikuti field `is_used` di database.
    *   `true` = In Use (Sedang dipinjam/disiapkan).
    *   `false` = In Stock (Ready).
*   **File**: `src/app/inventory/page.tsx` (Logic di `allAssets` & `usageMatch`)

---

## 5. Pembersihan & Integritas Data (Data Integrity)

### 5.1. Konversi Mata Uang
Seluruh data mata uang yang disimpan sebagai string (misal: "Rp 150.000") dibersihkan secara otomatis sebelum perhitungan aritmatika.
*   **Regex**: `amount.replace(/[^0-9]/g, '')`
*   **Tipe Data**: Dikonversi ke `parseInt` atau `Number` (BigInt di SQL).

### 5.2. Sinkronisasi Detektor (Mismatch Detection)
Sistem melakukan audit *on-the-fly* setiap kali data dimuat. Jika terdapat perbedaan antara **Estimated MRR** dan **Verified MRR**, sistem akan mencatat *discrepancy* tersebut.
*   **Threshold**: Perbedaan ± 1 Rupiah akan memicu logika peringatan (saat ini fitur notifikasi otomatis untuk ini sedang dalam mode *silent* untuk menghindari *flood*).

---

## 6. Visualisasi Data (Charts Logic)

*   **Waterfall Chart**: Pendapatan ditampilkan sebagai bar hijau (positif), sedangkan pengeluaran kategori ditampilkan sebagai bar merah (negatif) setelah dikalikan dengan `allocationFactor`.
*   **Growth Trend**: Data dikelompokkan berdasarkan `YYYY-MM` dari `timestamp` transaksi yang terverifikasi.

---

> **Update Terakhir**: 25 April 2026
> **Oleh**: Antigravity AI Coding Assistant
