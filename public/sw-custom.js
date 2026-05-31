// ISP-FinTrack Custom Service Worker Extension
// File ini DITAMBAHKAN ke atas SW yang di-generate Workbox (via customWorkerSrc)
// Workbox sudah handle skipWaiting + clientsClaim via workboxOptions.
// File ini menghandle:
//   1. Mendengarkan pesan SKIP_WAITING dari client (fallback kompatibilitas)
//   2. Membersihkan cache lama saat aktivasi (cache busting)

// ── 1. Handle SKIP_WAITING message dari PwaUpdater ──────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── 2. Cache Purge saat Activate ─────────────────────────────────────────────
// Hapus semua cache yang tidak dikenali (versi lama) saat SW baru aktif.
// Workbox memberi nama cache seperti "workbox-precache-v2-..." dan 
// "next-data", "next-image", dll. Kita hapus semua yang TIDAK mengandung
// versi cache saat ini (Workbox akan membuat ulang yang diperlukan).
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      const currentCaches = [
        'workbox-precache-v2',
        'next-data',
        'next-image',
        'pages',
        'static-js',
        'static-css',
      ];

      await Promise.all(
        cacheNames
          .filter((name) =>
            // Hapus cache yang sama sekali tidak mengandung nama yang kita kenali
            !currentCaches.some((current) => name.includes(current))
          )
          .map((name) => {
            console.log('[SW] Menghapus cache lama:', name);
            return caches.delete(name);
          })
      );

      // Ambil kontrol semua tab yang terbuka tanpa perlu reload manual
      await clients.claim();
    })()
  );
});
