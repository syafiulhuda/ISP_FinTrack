import Link from "next/link";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link 
          href="/login" 
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 mb-8 transition-colors"
        >
          <span className="mr-2 text-lg leading-none">&larr;</span>
          Kembali ke Halaman Login
        </Link>
        
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 sm:p-12">
          <h1 className="text-3xl font-bold mb-2">Syarat dan Ketentuan</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8">Pembaruan Terakhir: 25 Mei 2026</p>
          
          <div className="space-y-8 text-slate-600 dark:text-slate-300 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">1. Penerimaan Ketentuan</h2>
              <p>
                Dengan mengakses dan menggunakan platform perangkat lunak ISP FinTrack ("Layanan"), Anda menyetujui untuk tunduk pada Syarat dan Ketentuan ini. Jika Anda tidak menyetujui bagian mana pun dari ketentuan ini, Anda dilarang untuk menggunakan platform ini.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">2. Deskripsi Layanan</h2>
              <p>
                ISP FinTrack adalah platform Software as a Service (SaaS) yang berfokus pada manajemen keuangan, penagihan, analisis pelanggan, dan pengelolaan inventaris untuk penyedia layanan internet (ISP). Kami terus berupaya memperbarui dan meningkatkan layanan, namun kami tidak dapat menjamin ketersediaan fitur tertentu tanpa modifikasi atau penyesuaian dari waktu ke waktu.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">3. Akun dan Keamanan Pengguna</h2>
              <p className="mb-2">Sebagai pengguna platform, Anda setuju bahwa:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Anda bertanggung jawab atas kerahasiaan kata sandi dan aktivitas yang terjadi di bawah akun Anda.</li>
                <li>Setiap aktivitas mencurigakan atau pelanggaran keamanan harus segera dilaporkan kepada administrator sistem.</li>
                <li>Penyalahgunaan akses data untuk keuntungan pribadi atau niat merusak sangat dilarang dan dapat berujung pada penonaktifan akun secara permanen.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">4. Batasan Tanggung Jawab (SLA)</h2>
              <p>
                Platform kami bergantung pada infrastruktur pihak ketiga (misalnya, penyedia server, basis data, dan payment gateway). Kami berusaha untuk menyediakan tingkat uptime yang optimal (seperti 99.9%), namun kami tidak bertanggung jawab atas kerugian bisnis, kehilangan pendapatan, atau kerusakan tidak langsung lainnya yang mungkin timbul akibat penghentian layanan yang tidak terduga atau Force Majeure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">5. Pengelolaan Data Finansial</h2>
              <p>
                Pengguna bertanggung jawab untuk memverifikasi entri manual dan hasil pindai (*scan*) pembayaran sebelum divalidasi ke dalam sistem. Meskipun algoritma kami didesain untuk akurasi tinggi, kelalaian dalam validasi faktur, pembayaran, dan tagihan bulanan tidak menjadi tanggung jawab pihak ISP FinTrack.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">6. Pemutusan Akses</h2>
              <p>
                Kami berhak menangguhkan atau mengakhiri akses Anda ke Layanan setiap saat apabila terbukti ada pelanggaran yang merugikan stabilitas sistem atau kebijakan penyalahgunaan informasi.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">7. Perubahan Ketentuan</h2>
              <p>
                Ketentuan ini dapat kami perbarui dari waktu ke waktu. Kami menyarankan Anda secara berkala meninjau halaman ini. Penggunaan platform Anda secara berkelanjutan menandakan persetujuan Anda atas Syarat dan Ketentuan yang telah diperbarui.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
