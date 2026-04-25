# Panduan Pengembangan Front-End ISP-FinTrack

Dokumen ini adalah panduan *step-by-step* berstruktur (High-Level) yang ditujukan untuk Junior Programmer atau AI Assistant guna membangun ulang purwarupa HTML statis menjadi aplikasi web modern berbasis React.

## 📌 Informasi Proyek
- **Tech Stack**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Shadcn UI, Lucide React (Icons), Recharts, Framer Motion.
- **Tujuan**: Mengubah desain HTML yang ada di folder `stitch_isp_fintrack_financial_dashboard_FE` menjadi arsitektur komponen React yang rapi dan terstruktur.

---

## 🚀 Fase 1: Inisialisasi Proyek & Konfigurasi Dasar

### 1. Setup Next.js & Dependencies
Buka terminal dan jalankan perintah berikut untuk membuat proyek baru:
```bash
npx create-next-app@latest isp-fintrack-web --typescript --tailwind --eslint --app
cd isp-fintrack-web
```
Install library tambahan yang dibutuhkan:
```bash
npm install recharts framer-motion lucide-react clsx tailwind-merge
```

### 2. Konfigurasi Shadcn UI
Inisialisasi Shadcn UI untuk komponen UI standar:
```bash
npx shadcn-ui@latest init
```
Install komponen dasar yang akan sering digunakan:
```bash
npx shadcn-ui@latest add button card table badge dropdown-menu input
```

### 3. Setup Tema & Tailwind Config
Buka file HTML (contoh: `dashboard_utama/code.html`) dan perhatikan blok `<script id="tailwind-config">`. 
- Pindahkan konfigurasi warna (seperti `primary`, `surface`, `on-surface`, dll.) ke dalam file `tailwind.config.ts`.
- Atur font family ke `Inter` dengan mengimpornya via `next/font/google` di `app/layout.tsx`.

---

## 🏗️ Fase 2: Arsitektur Layout Global (App Shell)

Kita perlu membuat struktur layout yang sama untuk semua halaman (Sidebar + Top Navbar).

### 1. Buat Komponen Sidebar (`components/layout/Sidebar.tsx`)
- Ekstrak tag `<aside>` dari file HTML.
- Jadikan menu navigasi dinamis dengan array object (contoh: `[{ name: 'Dashboard', path: '/', icon: 'dashboard' }, ...]`).
- Gunakan ikon dari `lucide-react` (seperti `LayoutDashboard`, `Layers`, `CreditCard`, `Box`, `Map`, `Clock`) sebagai pengganti Material Symbols.

### 2. Buat Komponen Topbar (`components/layout/Topbar.tsx`)
- Ekstrak tag `<header>` dari file HTML.
- Buat logic untuk toggle Sidebar di mode *mobile* (responsif).
- Sisipkan fitur pencarian dan profil user.

### 3. Terapkan pada Root Layout (`app/layout.tsx`)
Bungkus konten anak (`children`) dengan Sidebar dan Topbar:
```tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-surface text-on-surface flex h-screen overflow-hidden`}>
        <Sidebar />
        <div className="flex-1 flex flex-col w-full h-full relative md:ml-64">
          <Topbar />
          <main className="flex-1 overflow-y-auto pt-24 pb-12 px-6 lg:px-8 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
```

---

## 🗄️ Fase 3: Persiapan Mock Data

Sesuai dengan PRD, buat file `constants/mockData.ts`. Kumpulkan semua data hardcoded dari desain HTML ke dalam struktur JSON ini agar mudah diintegrasikan ke UI komponen.
**Contoh Data:**
- `kpiData`: Data ARPU, CAC, Churn Rate, Total Revenue.
- `serviceTiers`: Daftar paket (Basic, Standard, Premium, Gamers) beserta harga dan speed.
- `inventoryList`: Data perangkat ONT/OLT dengan statusnya.
- `arAgingData`: Data tagihan pelanggan (0-30 hari, >90 hari).

---

## 💻 Fase 4: Implementasi Halaman (Pages)

Kerjakan halaman secara berurutan sesuai prioritas PRD. Ambil struktur HTML/Tailwind dari masing-masing folder referensi, dan ubah menjadi komponen React.

### Step 4.1: Dashboard Utama (`app/page.tsx`)
- **Referensi:** `dashboard_utama/code.html`
- **Tugas:**
  1. Buat grid untuk KPI Cards (ARPU, CAC, dll).
  2. Gunakan `Recharts` untuk membuat *Area Chart* (Monthly Revenue vs Expenses) dan *Pie Chart* (Customer Distribution). Jangan gunakan placeholder HTML bawaan.
  3. Tampilkan indikator margin EBITDA (radial progress).

### Step 4.2: Manajemen Paket Layanan (`app/service-tiers/page.tsx`)
- **Referensi:** `service_tiers/code.html`
- **Tugas:**
  1. Buat layout *Card-based grid* (grid-cols-1 md:grid-cols-2 lg:grid-cols-4).
  2. Petakan data `serviceTiers` dari mock data ke dalam Card.

### Step 4.3: Keuangan & OCR (`app/finance/page.tsx`)
- **Referensi:** `finance_ocr/code.html`
- **Tugas:**
  1. Gunakan komponen Tabel (Shadcn Table) untuk daftar transaksi.
  2. Buat zona *Drag-and-drop* file upload untuk nota fisik (UI saja).
  3. Buat tampilan *Side-by-side* untuk perbandingan gambar nota asli dengan hasil ekstraksi data OCR (Dummy data).

### Step 4.4: Manajemen Perangkat / Inventory (`app/inventory/page.tsx`)
- **Referensi:** `inventory_management/code.html`
- **Tugas:**
  1. Buat baris stat cards di atas (Total perangkat, digunakan, rusak).
  2. Tampilkan Data Table berisi detail perangkat (SN, MAC, Status).
  3. Buat *Badge component* untuk status warna (Hijau = Good, Kuning = Maintenance, Merah = Broken).

### Step 4.5: Analisis Wilayah (`app/regional/page.tsx`) & AR Aging (`app/ar-aging/page.tsx`)
- **Tugas:**
  1. Buat komponen dropdown bertingkat untuk filter area (Provinsi -> Kota -> Kecamatan).
  2. Buat tabel *AR Aging* dengan pengelompokan durasi hari.
  3. Tambahkan tombol "Send WhatsApp" di baris tabel AR Aging (bisa berupa link eksternal `https://wa.me/...`).

---

## ✨ Fase 5: Polish & Animasi

Setelah semua halaman selesai dirakit:
1. **Animasi Dasar**: Gunakan `framer-motion` untuk memberikan efek *fade-in* saat halaman dimuat:
   ```tsx
   <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {konten}
   </motion.div>
   ```
2. **Review Responsivitas**: Uji semua halaman di ukuran layar mobile, tablet, dan desktop. Pastikan tabel bisa digeser (horizontal scroll) pada layar kecil.
3. **Pembersihan**: Hapus komentar yang tidak perlu, pisahkan komponen yang terlalu panjang ke dalam sub-folder `components/features/...`.

---
> [!TIP]
> **Pesan untuk Junior/AI:** Jangan mengerjakan seluruh halaman sekaligus. Selesaikan **Fase 1 dan Fase 2 (Layout & Setup)** terlebih dahulu, lakukan verifikasi, baru kemudian bergerak membangun halaman demi halaman pada **Fase 4**.
