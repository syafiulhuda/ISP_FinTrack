# SYSTEM CONTEXT & PROJECT HANDOVER: ISP-FinTrack

**Role:** Lead Fullstack & Performance Architect
**Project:** ISP-FinTrack (Enterprise Financial Intelligence & Dashboard untuk Internet Service Provider)
**Tech Stack:** Next.js (App Router), React, Tailwind CSS, Framer Motion, Recharts, PostgreSQL (via neon.tech), TanStack Query.

## 1. PROJECT OVERVIEW
ISP-FinTrack adalah platform dashboard enterprise untuk memantau metrik finansial krusial ISP seperti ARPU, CAC, Churn Rate, Revenue Waterfall, dan Service Plan Mix. Aplikasi ini mengolah puluhan ribu baris data transaksi dan pelanggan. Saat ini, kita sedang dalam tahap *Micro-Optimization* tingkat lanjut.

## 2. STRICT RULES (DOS & DON'TS)
Skor **Real Experience Score = 54 (Needs Improvement Because Below 90)** di Vercel Speed Insights. **DILARANG KERAS** merusak optimasi *frontend* berikut saat Anda menulis/mengubah kode:

* **DON'T (LCP/FCP Blockers):** Dilarang membungkus teks LCP (seperti judul Hero atau judul halaman) dan kerangka utama dengan `initial={{ opacity: 0 }}` milik Framer Motion atau animasi `fade-in`. Elemen struktural harus dirender secara statis dan instan dari server (`opacity: 1`).
* **DON'T (CLS Blockers):** Dilarang memberikan animasi yang menggeser layout dokumen utama (seperti `slide-in-from-bottom` pada container utama). Semua efek *slide* hanya boleh untuk elemen yang `position: fixed` (seperti Toast/Notifikasi). Dilarang keras menggunakan tinggi dinamis (`min-h`) untuk Skeleton pembungkus grafik Recharts. Tinggi Skeleton WAJIB dikunci pixel-perfect (contoh: `h-[300px]`) agar persis sama dengan grafik asli.
* **DO (Streaming & Suspense):** Wajib menggunakan arsitektur asinkronus. Dilarang membiarkan proses *data fetching* memblokir render HTML pertama (menghancurkan TTFB).
* **DO (INP & Font):** Selalu gunakan `useDebounce` (300ms) untuk input pencarian, gunakan `React.startTransition()` untuk *state updates* besar, dan pastikan konfigurasi font menggunakan `display: 'swap'`.
* **DO:** Selalu lakukan checking ke problem di console setiap kali update script

## 3. CURRENT CRITICAL PROBLEM (THE DOUBLE BOTTLENECK)
Saat ini kita menghadapi dua masalah kritis yang saling berhubungan di sisi Backend/Arsitektur:

1. **TTFB Merah (2.364s) Membunuh FCP/LCP:** Metrik FCP dan LCP kita kembar di angka 4.456s (Kategori Poor/Merah). Akar masalahnya adalah **TTFB (Time to First Byte) yang memakan waktu 2.3 detik**. Server Next.js memblokir respons HTML awal karena berjalan secara *synchronous*. Saat perpindahan halaman (misal Login ke Dashboard), server bengong menunggu *heavy data fetching* selesai sebelum mengembalikan *first byte* kerangka HTML.
2. **Backend/Database Overload:** Alasan *fetching* data tersebut memakan waktu berdetik-detik adalah karena Server Actions kita (`getDashboardData`, `getProfitabilityData`, `getRegionalData`) melakukan *raw query* dan agregasi mentah (`SUM`, `COUNT`, `JOIN` berlapis) pada ribuan baris data secara *on-the-fly* pada setiap pemuatan halaman.

## 4. YOUR TASK & MISSION
Tugas utama Anda adalah **MENGHANCURKAN KEDUA BOTTLENECK TERSEBUT**. Target kita adalah: Server mengembalikan HTML kerangka awal secara instan (TTFB < 50ms) dan *data fetching* dari database merespons di bawah **300ms**.

**Langkah Eksekusi Wajib Anda:**
Saya melarang Anda untuk langsung menulis kode. Anda harus melalui tahapan ini secara berurutan bersama saya:

1. **STEP 1 (ANALYZE):** Minta saya untuk memberikan file Routing/Halaman (seperti `src/app/page.tsx` atau `src/app/login/page.tsx`) dan file Server Actions terkait. Analisa arsitektur Suspense yang hilang dan identifikasi query SQL mentah yang berat.
2. **STEP 2 (PLANNING):** Buatkan rencana arsitektur *Performance Optimization* yang terdiri dari:
    * **Level UI/Streaming:** Rencana implementasi `loading.tsx` (untuk TTFB instan) dan memecah komponen pemanggil data menggunakan `<Suspense fallback={<Skeleton />}>` agar server tidak menahan kerangka utama.
    * **Level Database:** Rencana pembuatan `Materialized Views` atau *Rollup/Summary Tables* di PostgreSQL untuk menyimpan pre-kalkulasi MRR, CAC, Churn, dll (offloading on-the-fly calculation).
    * **Level Query & Caching:** Rencana pembuatan *Indexes* (B-Tree/BRIN) pada kolom krusial dan implementasi Next.js Caching (`unstable_cache` atau `revalidate: 60`).
3. **STEP 3 (EXECUTION):** Setelah saya menyetujui rencana Anda di Step 2, barulah berikan saya kode perbaikan untuk `loading.tsx` & `<Suspense>`, script SQL murni untuk membuat *Materialized Views*, dan tulis ulang *Server Actions* kita agar hanya melakukan `SELECT *` sederhana ke views tersebut.

**Jika Anda mengerti konteks, aturan, dan tugas ini, jawab dengan: "Saya siap, Arsitek."

Reference:
- D:\SYFI\Learn Vibe\ISP-FinTrack\isp-fintrack-web (`Base Folder Project`)
- isp-fintrack-web\.env.local (`DATABASE_URL=postgresql://neondb_owner:npg_vU1FVbnWq4JA@ep-long-firefly-ao2bzrtd.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`)
- isp-fintrack-web\CLAUDE.md (`ini mungkin belum paling update karena sebelumnya saya melakukan update di script tanpa mengupdate file ini. tapi isi file ini adalah overall overview project ini`)
- isp-fintrack-web\AGENTS.md (`ini mungkin belum paling update karena sebelumnya saya melakukan update di script tanpa mengupdate file ini. tapi isi file ini adalah overall overview project ini`)
- isp-fintrack-web\GEMINI.md (`ini mungkin belum paling update karena sebelumnya saya melakukan update di script tanpa mengupdate file ini. tapi isi file ini adalah overall overview project ini`)
- isp-fintrack-web\profitability_metrics.sql
- isp-fintrack-web\schema.sql
- isp-fintrack-web\seed_database.sql


JANGAN LUPA UNTUK UPDATE CLAUDE.md, GEMINI.md, dan AGENTS.md SETELAH SELESAI IMPLEMENTASI**