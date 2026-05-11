# Strategi Go-Live: ISP_FinTrack (Vercel Free Tier)

Dokumen ini adalah panduan teknis implementasi dan deployment **ISP_FinTrack** ke **Vercel (Free Tier)**. Vercel sangat cocok untuk fase awal karena setup instan dan skalabilitas otomatis. Namun, kita harus menyesuaikan beberapa aspek dari sistem saat ini agar bisa berjalan optimal di lingkungan *Serverless*.

## 1. Persiapan Database (Eksternal)

Vercel bersifat *Serverless Computing*, sehingga database PostgreSQL tidak bisa berada di *localhost*. Kita butuh layanan database cloud gratis.

**Rekomendasi Layanan DB (Gratis):**
- **Neon.tech** (Sangat disarankan karena memiliki fitur Serverless Connection Pooling bawaan).
- **Supabase** (Tersedia Supavisor untuk connection pooling).

> [!IMPORTANT]
> **Tugas Anda:** Silakan buat akun di [Neon.tech](https://neon.tech/) atau [Supabase](https://supabase.com/), buat proyek PostgreSQL baru, dan dapatkan `DATABASE_URL` (Connection String). Pilih yang versi **Pooled Connection** (contoh: port 6543 atau ditandai sebagai pooler).

## 2. Refactor Node-Cron ke Vercel Cron

Di Vercel, *background job* seperti `node-cron` yang berjalan terus-menerus di `instrumentation.ts` tidak akan bekerja karena instance Vercel akan otomatis "tertidur" saat tidak ada trafik.

**Solusi yang akan saya kerjakan:**
1. Membuat API Route khusus: `src/app/api/cron/route.ts` yang bertugas menjalankan fungsi `refreshAgingMV()` dan `refreshPredictions()`.
2. Mendaftarkan jadwal di `vercel.json` untuk menjalankan endpoint `/api/cron` secara otomatis (misal: setiap hari jam 00:00).
3. Menonaktifkan `node-cron` di lingkungan produksi (`instrumentation.ts`).

## 3. Penanganan Timeout (OCR Tesseract)

Pada Vercel Hobby (Free Tier), batas maksimal waktu eksekusi *Serverless Function* adalah **10 detik** (bisa dinaikkan maksimal hingga **60 detik**). Ekstraksi teks gambar struk (OCR) bisa memakan waktu lama.

**Solusi yang akan saya kerjakan:**
- Mengatur konfigurasi khusus di fungsi Server Actions yang memproses OCR agar menggunakan `maxDuration: 60` untuk meminimalisir risiko Error 504 (Timeout).

## 4. Persiapan Deployment (Vercel CLI / GitHub)

Deployment paling direkomendasikan adalah dengan menghubungkan *repository* GitHub Anda langsung ke Vercel Dashboard.

**Langkah Deployment:**
1. Login ke [vercel.com](https://vercel.com/)
2. Klik **Add New Project** -> **Import dari GitHub**.
3. Pilih repository `ISP_FinTrack`.
4. Di bagian **Environment Variables**, tambahkan:
   - `DATABASE_USER`, `DATABASE_HOST`, `DATABASE_NAME`, `DATABASE_PASSWORD`, `DATABASE_PORT`
   - **ATAU** gunakan satu variabel `DATABASE_URL` sesuai connection string cloud.
   - Variabel SMTP (`GMAIL_USER`, `GMAIL_APP_PASSWORD`).
5. Klik **Deploy**.

---

## Proposed Changes (Kode yang harus diubah)

### [MODIFY] `src/instrumentation.ts`
Menonaktifkan `node-cron` untuk *production* agar tidak memicu error atau konsumsi RAM berlebih di Vercel.

### [NEW] `src/app/api/cron/route.ts`
Membuat endpoint REST API yang aman (diproteksi dengan *Cron Secret*) untuk memicu pembaruan *Materialized Views* dan metrik prediktif.

### [NEW] `vercel.json`
Mendeklarasikan Vercel Cron Job yang menembak `/api/cron` setiap hari pukul 00:00 WIB.

### [MODIFY] `src/lib/db.ts`
(Opsional) Memastikan konfigurasi `pg` (Pool) mendukung koneksi dari Vercel via `DATABASE_URL` (misal penambahan `ssl: { rejectUnauthorized: false }`).

---

## User Review Required

> [!WARNING]
> **Klarifikasi Database:** Apakah Anda sudah membuat database PostgreSQL online (Neon/Supabase) dan memiliki Connection String-nya? Jika belum, saya sarankan membuatnya terlebih dahulu karena Vercel butuh ini agar sistem berfungsi.

Jika Anda menyetujui langkah-langkah penyesuaian kode di atas (Cron Job & Timeout Config), beritahu saya untuk mulai merombak kodenya.
