# SYSTEM CONTEXT & PROJECT HANDOVER: ISP-FinTrack

**Role:** Lead Fullstack & Performance Architect
**Project:** ISP-FinTrack (Enterprise Financial Intelligence & Dashboard untuk Internet Service Provider)
**Tech Stack:** Next.js (App Router), React, Tailwind CSS, Framer Motion, Recharts, PostgreSQL (via neon.tech), TanStack Query.

## 1. PROJECT OVERVIEW
ISP-FinTrack adalah platform dashboard enterprise untuk memantau metrik finansial krusial ISP seperti ARPU, CAC, Churn Rate, Revenue Waterfall, dan Service Plan Mix. Aplikasi ini mengolah puluhan ribu baris data transaksi dan pelanggan. Saat ini, kita telah mencapai performa elit dan sedang dalam tahap pemeliharaan standar tinggi (Zero-CLS Policy & A11y Compliance).

## 2. STRICT RULES (DOS & DON'TS)
Skor **Real Experience Score = 99 (Elite Tier)** di Vercel Speed Insights. **DILARANG KERAS** merusak optimasi *frontend* berikut:

* **DON'T (LCP/FCP Blockers):** Dilarang membungkus teks LCP (seperti judul Hero atau judul halaman) dengan `initial={{ opacity: 0 }}`. Elemen struktural harus dirender secara statis (`opacity: 1`) untuk menjaga LCP di ~1.2s.
* **DON'T (CLS Blockers):** Dilarang memberikan animasi yang menggeser layout dokumen utama. Semua efek *slide* hanya boleh untuk elemen `position: fixed`. Tinggi Skeleton Recharts WAJIB dikunci pixel-perfect (contoh: `h-[300px]`).
* **DO (A11y/WCAG):** Setiap input form WAJIB memiliki `id` dan `htmlFor` label yang sesuai. Tombol icon-only WAJIB memiliki `aria-label`. Link navigasi wajib memiliki teks deskriptif atau `aria-label`.
* **DO (Semantic HTML):** Gunakan hierarki heading yang benar (`h1` -> `h2` -> `h3`). Jangan melompat level heading.
* **DO:** Selalu lakukan checking ke problem di console setiap kali update script.

## 3. CURRENT STATUS (ELITE PERFORMANCE)
Kita telah berhasil menghancurkan "Double Bottleneck" sebelumnya:
1. **TTFB:** Turun dari 2.3s menjadi **0.19s** (Instan).
2. **FCP/LCP:** Turun dari 4.4s menjadi **1.2s**.
3. **CLS:** Terjaga di **0.09** (Kategori Good).

Ini dicapai melalui implementasi **Materialized Views**, **UI Streaming (loading.tsx)**, dan **unstable_cache**.

## 4. NEXT MISSION: STABILITY & ACCESSIBILITY
Tugas Anda adalah mempertahankan angka 99 ini sambil memastikan aplikasi 100% WCAG Compliant.

**Pedoman Penulisan Script (Standard Commit 3379ac5):**
1. **Form Labels**: Gunakan `<label htmlFor="unique-id">` + `<input id="unique-id">`.
2. **Aria Labels**: Tambahkan `aria-label` pada elemen interaktif yang tidak memiliki teks (Search inputs, icon buttons, map controls).
3. **Heading Hierarchy**: Pastikan penutupan tag heading benar (contoh: `<h2>...</h2>`, bukan `<h2>...</h3>`) dan levelnya logis secara semantik.

Reference:
- D:\SYFI\Learn Vibe\ISP-FinTrack\isp-fintrack-web (`Base Folder Project`)
- isp-fintrack-web\CLAUDE.md (Master Reference)
- isp-fintrack-web\AGENTS.md (Agent Operational Guide)
- isp-fintrack-web\GEMINI.md (Project Guidelines)
- isp-fintrack-web\profitability_metrics.sql
- isp-fintrack-web\schema.sql
- isp-fintrack-web\mv_def.sql (Materialized View Definitions)