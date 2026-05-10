# Implementation Plan: Comprehensive Responsive Design Enhancement

## Goal Description

Melakukan riset dan pengembangan antarmuka (UI) dari project **ISP-FinTrack** agar sepenuhnya responsif pada 4 ukuran layar utama: Monitor (Ultra-wide/Desktop Besar), Laptop (Desktop Standar), Tablet, dan Smartphone. Tujuan utamanya adalah memastikan "Single-Pane-of-Glass" experience tetap optimal tanpa mengorbankan fungsionalitas di perangkat berlayar kecil, serta memaksimalkan ruang di layar besar.

## Research Findings

Berdasarkan analisis arsitektur frontend (`ClientLayout.tsx`, `Sidebar.tsx`, `Topbar.tsx`, dan halaman-halaman utama seperti `page.tsx` dan `finance/page.tsx`):

1. **Current State:** Proyek ini sudah menggunakan framework Tailwind CSS dengan beberapa _breakpoint_ standar (seperti `md:grid-cols-2`, `lg:grid-cols-4`).
2. **Layout Shell:** Konsep Sidebar yang _collapsible_ di layar kecil (`isMobileMenuOpen`) sudah diimplementasikan di `ClientLayout.tsx` dan `Sidebar.tsx`.
3. **Gaps:**
   - Belum ada optimasi khusus untuk layar sangat besar (Monitor/Ultrawide - `2xl:`). Komponen seringkali memiliki `max-w-7xl` yang membuatnya terpusat dengan _whitespace_ berlebih di layar besar.
   - Tabel data (seperti di halaman Finance/Customer) berisiko _clipping_ atau memaksakan _horizontal scroll_ yang kurang intuitif di Smartphone.
   - Ukuran _touch targets_ (tombol, input) di Smartphone perlu diperhatikan.

## Open Questions

> [!IMPORTANT]
> **Klarifikasi Resolusi Layar & Layout**
>
> 1. Untuk tampilan **Monitor**, apakah Anda ingin membiarkan lebar konten maksimum (contoh: melepas limit `max-w-7xl` menjadi _full-width_ dengan _padding_ tertentu) agar tabel dan grafik bisa memanjang penuh?
> 2. Untuk tabel kompleks di **Smartphone** (misal: Finance Transactions), apakah Anda lebih suka tabel tersebut memiliki _horizontal scrollbar_ (bisa digeser ke kanan), atau diubah menjadi desain _Card-based_ (stacking data per transaksi)?

## Proposed Changes

### 1. Global Shell & Layout Configurations

- Update `ClientLayout.tsx` untuk memastikan transisi _padding_ dan _margin_ yang lebih halus di semua _breakpoints_.
- Modifikasi limit lebar maksimum (`max-w-7xl` -> `max-w-screen-2xl` atau kustomisasi di `2xl:`) untuk mengakomodasi ukuran **Monitor**.

### 2. Dashboard (`src/app/page.tsx`)

- **Smartphone (`< 768px`)**: Stack seluruh KPI Cards dan Chart menjadi 1 kolom. Sembunyikan elemen dekoratif yang memakan ruang.
- **Tablet (`md:`)**: KPI Cards menjadi 2 kolom. Chart utama menyesuaikan proporsi lebar.
- **Laptop (`lg:`)**: KPI Cards menjadi 4 kolom. Chart berdampingan (seperti saat ini).
- **Monitor (`2xl:`)**: Perbesar tinggi chart dan perluas area visualisasi agar tidak terlalu banyak _whitespace_ di sisi kanan-kiri.

### 3. Finance & Data Heavy Pages (`src/app/finance/page.tsx`, dll)

- **Smartphone**: Implementasi class `overflow-x-auto` yang konsisten pada semua _table container_ agar bisa di-scroll horizontal tanpa merusak layout luar.
- **Tablet & Laptop**: Penyesuaian _grid_ untuk form input ("Manual Input") dan Preview Struk (50/50 split).
- **Monitor**: Optimasi lebar kolom tabel agar informasi referensi yang panjang tidak terpotong (truncate).

### 4. Navigation (Sidebar & Topbar)

- Peningkatan visibilitas tombol "Hamburger Menu" di **Smartphone** dan **Tablet**.
- Penyempurnaan sistem _backdrop blur_ saat menu terbuka di perangkat mobile agar lebih fokus.

### 5. Documentation Update

- **[NEW/MODIFIED]** Update `GEMINI.md`, `CLAUDE.md`, dan `AGENTS.md` untuk memasukkan pedoman baru terkait resolusi _Responsive Design_ (Tailwind Breakpoints guidelines untuk proyek ini).

## Verification Plan

### Manual Verification

1. **Monitor (>= 1536px)**: Test menggunakan Chrome DevTools (Responsive mode, width 1920px). Pastikan konten tidak terasa "terjepit" di tengah.
2. **Laptop (>= 1024px)**: Test pada width 1366px. Pastikan sidebar berfungsi dengan baik.
3. **Tablet (>= 768px)**: Test pada width 768px (iPad size). Pastikan sidebar tersembunyi dengan benar dan form tidak terpotong.
4. **Smartphone (< 768px)**: Test pada width 375px (iPhone size). Pastikan teks bisa dibaca, tombol mudah ditekan (_touch-friendly_), dan tabel bisa di-scroll secara horizontal.
