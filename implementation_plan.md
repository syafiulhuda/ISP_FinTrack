# Dokumen Analisis & Eksekusi Optimasi Web Vitals (ISP-FinTrack)

## 1. Laporan Metrik Vercel Speed Insights Terkini

Berikut adalah data performa terbaru dari Vercel Speed Insights. Masalah *Interaction to Next Paint* (INP) sudah teratasi, namun masih terdapat masalah kritis pada FCP, LCP, dan CLS:

* **First Contentful Paint (FCP):** Tercatat sangat lambat di angka **2.43s**. Vercel secara spesifik menandai rute `src/app/page.tsx` (Dashboard) dan `src/app/login/page.tsx` sebagai halaman yang membutuhkan perbaikan (Need Improvements).
* **Largest Contentful Paint (LCP):** Metrik ini tertahan oleh dua elemen teks utama. Vercel memberikan exact CSS selector berikut yang menjadi *bottleneck*:
    1.  `div.relative.z-10.max-w-lg>div>h1.text-6xl.font-black.text-white.leading-[1.1].mb-6` (Ini adalah Hero Text di halaman Login).
    2.  `h2.text-2xl.sm:text-3xl.md:text-4xl.font-bold.text-slate-900.dark:text-slate-100.tracking-tight.leading-tight` (Ini adalah judul/header utama halaman).
* **Cumulative Layout Shift (CLS):** Vercel mendeteksi pergeseran layout (layout shift) pada dua kontainer pembungkus utama aplikasi:
    1.  `div.animate-in.fade-in.slide-in-from-bottom-2.duration-300>div.relative`
    2.  `div.w-full.max-w-[2000px].mx-auto>div>div.relative`

---

## 2. Analisa Akar Masalah (Root Cause Analysis)

Dari hasil audit codebase, masalah di atas disebabkan oleh sisa-sisa animasi yang memblokir proses *rendering* awal browser:

1.  **FCP (2.43s) & LCP Blockers:** Teks LCP dan kerangka halaman tidak langsung muncul karena terbungkus oleh komponen Framer Motion dengan `initial={{ opacity: 0 }}`. Browser terpaksa melukis HTML secara transparan (putih kosong) dan harus menunggu seluruh JavaScript selesai diunduh untuk mengubah opacity menjadi 1. Selain itu, konfigurasi font Inter belum diatur untuk menampilkan teks fallback secara instan (`display: 'swap'`).
2.  **CLS Blockers:**
    Pergeseran layout BUKAN disebabkan oleh komponen Toast, melainkan oleh *class* animasi Tailwind `slide-in-from-bottom-2` yang terpasang pada kontainer utama `{children}` di `ClientLayout.tsx`. Setiap kali halaman dimuat, seluruh body dokumen bergeser dari bawah ke atas, memicu pelanggaran CLS masif.

---

## 3. Instruksi Eksekusi untuk AI Agent

Role: Strict Senior Frontend Performance Engineer

Task: We need to fix the lingering FCP (2.43s), LCP, and CLS issues reported by Vercel Speed Insights. You missed removing the animation blockers in the previous step. Apply the exact changes below to the codebase. No deviations.

**1. FIX FCP & LCP (Font Loading) in `src/app/layout.tsx`**
Update the Google Font configuration to explicitly use `display: 'swap'` so text paints instantly before the font fully loads, preventing the Flash of Invisible Text.
*Change to:*
`const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: 'swap' });`

**2. FIX MASSIVE CLS in `src/components/layout/ClientLayout.tsx`**
The root cause of the layout shift is the tailwind class `slide-in-from-bottom-2` on the main children wrapper. Animating the entire document body flow triggers layout shifts.
*Action:* Open `ClientLayout.tsx`. Find `<div className="animate-in fade-in slide-in-from-bottom-2 duration-300">`. Remove `slide-in-from-bottom-2` completely. Change it to just `<div className="w-full">` or `<div className="animate-in fade-in duration-300">`. We only want a pure opacity fade (or static render), absolutely no physical layout movement.

**3. FIX FCP/LCP ANIMATION BLOCKERS in `src/app/login/page.tsx` & `src/app/page.tsx`**
You left `<m.div initial={{ opacity: 0 }}>` wrappers around the main structural and LCP text elements. This forces the browser to paint invisible HTML until JS hydrates, ruining FCP (2.43s).
* **In `login/page.tsx`:** Find the `<m.div>` wrapping the `h1.text-6xl` Hero text ("Empowering ISP Growth"). Change its prop to `initial={{ opacity: 1, y: 0 }}` OR remove the `<m.div>` wrapper around it entirely. Also apply `initial={false}` to the right-side form wrapper `<m.div initial={{ opacity: 0, x: 20 }}>` so the form structure paints instantly from the server.
* **In `page.tsx` (Dashboard):** Find the `<m.div>` wrapping the `h2` "Executive Overview". Change it to `initial={false}` or `initial={{ opacity: 1, y: 0 }}`. Apply this `initial={false}` logic to any structural section wrappers that are hiding content on first load.

Execute these exact changes to guarantee instant FCP paints and 0.00 Layout Shifts.