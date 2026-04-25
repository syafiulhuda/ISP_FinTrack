# ISP-FinTrack: Dokumentasi Rumus & Logika Perhitungan

Dokumen ini menjelaskan rumus teknis, logika bisnis, dan sumber data yang digunakan dalam setiap komponen perhitungan di seluruh aplikasi ISP-FinTrack.

---

## 1. Dashboard Utama (`src/app/page.tsx`)

| Komponen | Rumus / Logika | Sumber Data |
| :--- | :--- | :--- |
| **Total Revenue** | $\sum (\text{Active Customers} \times \text{Tier Price})$ | `customers` (Active) $\bowtie$ `service_tiers` |
| **ARPU** | $\frac{\text{Total Revenue}}{\text{Jumlah Pelanggan Aktif}}$ | Kalkulasi Internal |
| **CAC** | $\frac{\text{Total Biaya Marketing (Bulan Berjalan)}}{\text{Jumlah Pelanggan Baru (Bulan Berjalan)}}$ | `expenses` (Marketing) / `customers` (New) |
| **Churn Rate** | $\frac{\text{Jumlah Pelanggan Inactive}}{\text{Total Seluruh Pelanggan}} \times 100$ | `customers` (Inactive vs Total) |
| **Revenue Trend Chart** | Data historis bulanan dari `transactions` (Verified) | `transactions` |

---

## 2. Profitability Analysis (`src/app/profitability/page.tsx`)

| Komponen | Rumus / Logika | Sumber Data |
| :--- | :--- | :--- |
| **MRR** | $\sum (\text{Active Customers in Region} \times \text{Tier Price})$ | `customers` $\bowtie$ `service_tiers` |
| **EBITDA Margin** | $\frac{\text{Net Profit}}{\text{MRR}} \times 100$ | Kalkulasi Internal |
| **Net Profit / User** | $\frac{\text{MRR} - (\text{Infra} + \text{Ops} + \text{Marketing Expenses})}{\text{Jumlah Pelanggan Aktif}}$ | `expenses` (Allocated) |
| **LTV:CAC Ratio** | $\frac{\text{ARPU} \times 24 \text{ bulan}}{\text{CAC}}$ | ARPU $\div$ CAC |
| **Waterfall Chart** | Alokasi biaya per kategori: COGS (Infra), OPEX (Ops + Marketing) | `expenses` (Categorized) |

---

## 3. Report Generator (`src/actions/reports.ts`)

| Jenis Laporan | Komponen | Logika Perhitungan |
| :--- | :--- | :--- |
| **Revenue Report** | **Main Trend** | Agregasi harian: `SUM(price)` berdasarkan `createdAt` pelanggan. |
| | **Breakdown** | Distribusi pendapatan per Provinsi atau Kota. |
| **Inventory Report** | **Asset Mix** | Persentase jumlah aset berdasarkan `type` (Router, OLT, dll). |
| | **Ownership** | Rasio aset 'Dimiliki' vs 'Telah Dijual' (filter `kepemilikan`). |
| **Regional Report** | **Growth** | Hitung jumlah pelanggan baru (`COUNT`) per wilayah dalam rentang tanggal. |

---

## 4. Logika Validasi & Notifikasi (System Logic)

Sistem melakukan pengecekan integritas data secara otomatis setiap kali Dashboard atau Profitability dibuka:

*   **Logic**: `IF (Estimated_MRR != Total_Verified_Transactions)`
*   **Action**: Memicu `createNotification` dengan tipe `warning`.
*   **Tujuan**: Memastikan sinkronisasi antara database operasional (`customers`) dengan database keuangan (`transactions`).

---

## 5. Glosarium Teknis

*   **Active Customer**: Pelanggan dengan `status = 'Active'`.
*   **Verified Transaction**: Transaksi dengan `status = 'Verified'` di tabel `transactions`.
*   **Allocation Factor**: Rasio jumlah pelanggan di wilayah tertentu dibagi total nasional, digunakan untuk membagi biaya tetap (Fixed Costs) secara adil per wilayah.

---

> **Catatan**: Seluruh perhitungan mata uang menggunakan pembersihan string `REPLACE(/[^0-9]/g, '')` sebelum dikonversi ke tipe data `BIGINT` untuk menjamin akurasi angka.
