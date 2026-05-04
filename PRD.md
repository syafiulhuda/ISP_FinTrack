# 📄 Master Product Requirements Document (PRD): ISP-FinTrack

> **Dokumen Acuan Utama (Single Source of Truth)**
> Versi: 2.0 | Terakhir Diperbarui: Mei 2026

---

## 1. Pendahuluan & Latar Belakang (Isi & Konteks)

**ISP-FinTrack** adalah platform *Enterprise Resource Planning* (ERP) mini yang dirancang secara eksklusif untuk penyedia layanan internet (Internet Service Provider / ISP) skala regional dan lokal. 

Berbeda dengan aplikasi *billing* biasa, ISP-FinTrack menjembatani tiga pilar utama operasional ISP:
1.  **Keuangan Eksekutif:** Visibilitas langsung terhadap *Monthly Recurring Revenue* (MRR), *EBITDA*, dan *Churn Rate*.
2.  **Manajemen Infrastruktur Fisik:** Pelacakan titik koordinat geografis dari aset jaringan (OLT, ODP, ONT) hingga status *uptime* dan riwayat pemeliharaan.
3.  **Otomatisasi Penagihan (Billing):** Siklus hidup pelanggan yang berjalan otomatis dari masa aktif, masa tenggang (grace period), hingga penangguhan (suspension).

---

## 2. Tujuan & Target Pencapaian (Goals)

Pengembangan sistem ini difokuskan untuk mencapai target-target terukur berikut:

### 🎯 Tujuan Jangka Pendek (Fase Stabilisasi)
*   **Zero Manual Entry untuk Pengeluaran:** Menggunakan mesin OCR untuk membaca struk/kuitansi fisik dan mengubahnya menjadi entri *ledger* otomatis.
*   **Akurasi Inventaris 100%:** Menghentikan kehilangan perangkat (ONT/Router) di lapangan melalui pelacakan berbasis titik koordinat dan status kepemilikan.
*   **Otomatisasi Penagihan Dasar:** Sistem mampu menangguhkan (suspend) pelanggan yang menunggak lebih dari 25 hari secara otomatis tanpa intervensi admin.

### 🚀 Target Jangka Panjang (Fase Ekspansi)
*   **AI-Driven Forecasting:** Menggunakan data historis transaksi untuk memprediksi pendapatan bulan depan dan mendeteksi pelanggan yang berpotensi *churn* (berhenti berlangganan).
*   **Integrasi Payment Gateway:** Menghubungkan tagihan langsung ke virtual account (Midtrans/Xendit) untuk rekonsiliasi otomatis.
*   **Multi-Tenant Architecture:** Memungkinkan sistem ini dilisensikan atau digunakan oleh banyak kantor cabang ISP yang berbeda dengan basis data terisolasi.

---

## 3. Metodologi Pengembangan

Proyek ini dibangun menggunakan prinsip-prinsip *Modern Software Engineering*:

*   **Component-Driven Development (CDD):** UI dibangun dari komponen terkecil (Atom) seperti tombol dan *badge*, yang dirangkai menjadi komponen kompleks (Organism) seperti `StatCard` dan `DataTable`.
*   **Server-First Architecture:** Memaksimalkan **React Server Components (RSC)** dan **Server Actions** pada Next.js. Hal ini memangkas kebutuhan untuk membuat API *endpoints* terpisah untuk kebutuhan internal, mengurangi *latency*, dan mengamankan logika bisnis di sisi server.
*   **Optimistic UI Updates:** Memanfaatkan fitur bawaan React untuk memberikan umpan balik visual instan kepada pengguna saat melakukan aksi (seperti menyimpan data), sementara proses *backend* berjalan di belakang layar.

---

## 4. Arsitektur Sistem & Tech Stack

Sistem dibangun di atas tumpukan teknologi modern yang berfokus pada kecepatan, keamanan, dan keindahan antarmuka.

### 💻 Frontend & Desain (UI/UX)
*   **Framework:** Next.js 16 (App Router) yang ditenagai oleh Turbopack.
*   **Bahasa Pemrograman:** TypeScript (Strict Mode).
*   **Styling (Desain):** Tailwind CSS. Desain mengusung konsep *"Executive Dashboard"*—penggunaan latar belakang gelap (Dark Mode) elegan, kontras tinggi untuk keterbacaan metrik, dan efek *glassmorphism* tipis.
*   **Animasi:** `framer-motion` digunakan untuk *micro-interactions* (seperti efek *hover* pada kartu, transisi halaman, dan pemuatan elemen secara bertahap).
*   **Visualisasi Data:** `recharts` untuk membuat grafik garis (Trend), grafik batang (Distribusi), dan diagram lingkaran (Service Mix) yang interaktif dan responsif.
*   **Ikonografi:** `lucide-react` untuk ikon yang konsisten dan minimalis.

### ⚙️ Backend & Pengelolaan Data
*   **Database Relasional:** PostgreSQL.
*   **Data Fetching & Caching:** `@tanstack/react-query` mengelola status data di sisi *client*, menyediakan fitur *auto-refetch*, *caching*, dan sinkronisasi data yang mulus.
*   **Mesin OCR:** Tesseract.js (atau integrasi API visi khusus) untuk ekstraksi teks dari gambar.

---

## 5. Detail Implementasi Teknis (Scripts & Codebase)

Bagian ini mendokumentasikan standar penulisan kode dan arsitektur di dalam folder `src/`.

### 🛡️ 5.1 Type Safety & TypeScript Interfaces (`src/types/index.ts`)
Seluruh data yang mengalir dari database ke UI **wajib** memiliki tipe yang jelas. Penggunaan `any` sangat dihindari.
*   **Interface Inti:** `Customer`, `Asset`, `Transaction`, `ServiceTier`, `OcrData`, `Notification`, `Admin`.
*   **Manfaat:** Mencegah aplikasi *crash* (undefined is not an object) dan memberikan *autocompletion* yang akurat bagi *developer*.

### 🧩 5.2 Reusable Components (`src/components/`)
Komponen antarmuka yang dapat digunakan berulang kali:
*   **`DataTable`:** Komponen tabel generik tingkat lanjut yang mendukung *pagination*, pencarian (*search*), pengurutan (*sorting*), dan modifikasi baris data.
*   **`StatCard`:** Kartu Indikator Kinerja Utama (KPI) premium yang terstandarisasi. Mengatur format font secara otomatis agar responsif terhadap level *zoom* browser.
*   **State Management UI:** Komponen standar untuk `<LoadingState />` (indikator memuat), `<EmptyState />` (ketika data kosong), dan `<ErrorBoundary />` (penanganan kesalahan layar).

### 🔢 5.3 Konsistensi Pemformatan Data (`src/lib/utils.ts`)
Seluruh format tampilan angka dan tanggal dikendalikan oleh fungsi utilitas terpusat:
*   **`formatCurrency(amount)`:** Memastikan format Rupiah standar yang konsisten (misal: `Rp 1.000.000`).
*   **`formatNumber(num)`:** Menyederhanakan angka besar (misal: `1.2M`, `85K`) untuk keterbacaan di *dashboard*.
*   **Penanggalan:** Menggunakan `Intl.DateTimeFormat` bawaan JavaScript untuk memastikan tanggal selalu berformat lokal Indonesia secara akurat.

### ⚡ 5.4 Pemisahan Server Actions Modular (`src/actions/`)
Logika *backend* tidak dicampur dalam satu file raksasa, melainkan dipisah berdasarkan domain (Domain-Driven Design logis):
*   **`customers.ts`:** Menangani logika penagihan, masa tenggang (*grace period*), perhitungan tren pertumbuhan, dan CRUD pelanggan.
*   **`transactions.ts`:** Mengelola buku besar keuangan (*ledger*), pemrosesan OCR, dan integrasi pengeluaran ke pencatatan transaksi.
*   **`assets.ts`:** Mencakup inventaris gudang, pelacakan koordinat aset jaringan, dan pencatatan riwayat teknisi.
*   **`admin.ts` / `tiers.ts`:** Manajemen profil pengguna sistem dan definisi paket internet.

### 🔌 5.5 Infrastruktur & Validasi Variabel Lingkungan (`src/lib/db.ts`)
*   **Strict Env Validation:** Sistem akan melakukan pengecekan ketersediaan kredensial sensitif (`DATABASE_URL`, API Keys) saat *startup*. Jika kosong, aplikasi akan menolak berjalan (*fail-fast principle*).
*   **Connection Pooling:** Pool database dioptimalkan (`max: 10`, `idleTimeoutMillis: 30000`) untuk memastikan sistem tidak kehabisan koneksi meskipun diakses oleh banyak manajemen eksekutif secara bersamaan.

---

## 6. Penyelaman Arsitektur Database (Database Deep Dive)

Database `isp-fintrack-web/.env.local` bersandar pada skema PostgreSQL terotomatisasi.

### 📊 6.1 Skema Tabel Utama
| Nama Tabel | Fungsi Utama | Kolom Kunci (Key Columns) |
| :--- | :--- | :--- |
| `admin` | Kredensial akses sistem dan peran (Role). | `id`, `email`, `password`, `role` |
| `customers` | Basis data pelanggan aktif dan riwayat layanan. | `id` (CT00x), `status`, `service`, `createdAt` |
| `transactions` | Buku besar finansial (Pemasukan/Pengeluaran). | `id`, `amount`, `type`, `timestamp` |
| `expenses` | Rincian pengeluaran operasional perusahaan. | `id`, `category`, `amount`, `description` |
| `asset_roster` | Aset yang telah dikerahkan ke lapangan. | `sn`, `mac`, `condition`, `latitude`, `longitude` |
| `stock_asset_roster` | Gudang: Aset yang belum terpakai. | `sn`, `mac`, `type`, `is_used` |
| `notifications` | Sistem peringatan operasional terpusat. | `category`, `message`, `is_unread` |
| `maintenance_history`| Log intervensi teknisi terhadap aset bermasalah. | `asset_id`, `technician_name`, `date` |

### ⚙️ 6.2 Otomatisasi: Functions & Triggers
Database dirancang untuk melakukan tugasnya secara independen tanpa membebani server aplikasi.

#### **PostgreSQL Functions:**
1.  **`notify_asset_condition()`**: Memeriksa status aset. Jika aset berubah menjadi 'Broken' atau 'Warning', fungsi ini menyuntikkan data peringatan baru ke tabel `notifications` untuk penugasan teknisi.
2.  **`notify_new_transaction()`**: Membedah setiap transaksi yang masuk (Pemasukan vs Pengeluaran) dan membuat log notifikasi yang sesuai untuk divisi keuangan.

#### **Database Triggers:**
*   **`trg_asset_notification`**: Bereaksi seketika terhadap perintah `INSERT` atau `UPDATE` pada tabel `asset_roster`.
*   **`trg_new_transaction`**: Bereaksi secara *real-time* saat terjadi perintah `INSERT` pada tabel `transactions`.

---

## 7. Fitur Khusus & Alur Kerja (Workflows)

### 🏦 7.1 Alur Kerja Keuangan & OCR
1.  **Digitalisasi:** Bukti transfer atau kuitansi diunggah.
2.  **Ekstraksi:** Mesin OCR membaca vendor, nominal, dan tanggal.
3.  **Rekonsiliasi Cerdas:** Jika kuitansi diklasifikasikan sebagai "Pembelian Hardware" (seperti ONT/Router), sistem **secara otomatis** mencatat pengeluaran di `expenses` DAN menambahkan item tersebut ke tabel gudang `stock_asset_roster`.

### 💳 7.2 Logika Penagihan & "Masa Tenggang" (Grace Period Audit)
Fungsi `auditCustomerGracePeriod` berjalan secara berkala:
*   Mengecek pola transaksi (`transactions`) untuk menautkan riwayat pembayaran dengan ID pelanggan (`customers.id`).
*   Jika hari jatuh tempo telah lewat dan sistem mendeteksi tidak ada pembayaran tervalidasi dalam **25 hari terakhir**, pelanggan dipindahkan statusnya ke `Inactive` (Suspend).
*   Sistem men-*trigger* peringatan kepada admin mengenai daftar pelanggan yang baru ditangguhkan.

---

## 8. Keamanan & Kepatuhan (Security & Compliance)
1.  **Pencegahan SQL Injection:** Pendekatan *Parameterized Queries* (`$1, $2`) di seluruh `src/actions/` menutup celah manipulasi kueri dari peretas.
2.  **Isolasi Variabel Lingkungan:** String koneksi database hanya ada di sisi server (`.env.local`) dan tidak pernah bocor ke sisi klien (*browser*).
3.  **Role-Based Access Control (RBAC):** Struktur tabel `admin` telah menyiapkan ladang untuk hierarki hak akses (misal: *Superadmin*, *Finance*, *Technician*) guna membatasi mutasi data destruktif (Hapus/Edit).

---
*Dokumen ini merupakan kerangka kerja hidup (living document) yang wajib diperbarui sejalan dengan pengembangan basis kode (codebase) dan perubahan infrastruktur.*
