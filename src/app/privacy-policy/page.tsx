import Link from"next/link";

export default function PrivacyPolicyPage() {
 return (
 <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
 <div className="max-w-3xl mx-auto">
 <Link 
 href="/login"
 className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground dark:hover:text-slate-100 mb-8 transition-colors"
 >
 <span className="mr-2 text-lg leading-none">&larr;</span>
 Kembali ke Halaman Login
 </Link>
 
 <div className="bg-card rounded-2xl shadow-sm border border-border p-8 sm:p-12">
 <h1 className="text-3xl font-bold mb-2">Kebijakan Privasi</h1>
 <p className="text-muted-foreground mb-8">Pembaruan Terakhir: 25 Mei 2026</p>
 
 <div className="space-y-8 text-muted-foreground leading-relaxed">
 <section>
 <h2 className="text-xl font-semibold text-foreground mb-4">1. Pendahuluan</h2>
 <p>
 Selamat datang di ISP FinTrack. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, mengungkapkan, dan melindungi informasi pribadi Anda sesuai dengan Undang-Undang Pelindungan Data Pribadi (UU PDP) yang berlaku di Indonesia.
 </p>
 </section>

 <section>
 <h2 className="text-xl font-semibold text-foreground mb-4">2. Data yang Kami Kumpulkan</h2>
 <p className="mb-2">Kami mengumpulkan informasi yang diperlukan untuk menyediakan layanan operasional dan finansial ISP kepada Anda, yang mungkin meliputi:</p>
 <ul className="list-disc pl-5 space-y-2">
 <li><strong>Data Identitas:</strong> Nama, alamat email, nomor telepon, dan identitas pengguna.</li>
 <li><strong>Data Operasional ISP:</strong> Titik koordinat instalasi pelanggan, riwayat pembayaran, dan manajemen aset.</li>
 <li><strong>Data Teknis:</strong> Alamat IP, jenis browser, data log aktivitas (Audit Trail), dan informasi perangkat lunak.</li>
 </ul>
 </section>

 <section>
 <h2 className="text-xl font-semibold text-foreground mb-4">3. Tujuan Penggunaan Data</h2>
 <p className="mb-2">Informasi yang dikumpulkan digunakan untuk:</p>
 <ul className="list-disc pl-5 space-y-2">
 <li>Menyediakan, memelihara, dan meningkatkan kualitas platform ERP kami.</li>
 <li>Mendeteksi, mencegah, dan menangani masalah teknis maupun keamanan.</li>
 <li>Memfasilitasi pelaporan analitik bisnis dan metrik profitabilitas bagi ISP Anda.</li>
 <li>Mematuhi kewajiban hukum dan regulasi pelindungan data.</li>
 </ul>
 </section>

 <section>
 <h2 className="text-xl font-semibold text-foreground mb-4">4. Pengungkapan kepada Pihak Ketiga</h2>
 <p>
 Kami tidak menjual atau menyewakan informasi pribadi Anda kepada pihak ketiga. Akses terhadap informasi ini hanya diberikan kepada penyedia layanan (seperti server hosting dan payment gateway) yang terikat oleh perjanjian kerahasiaan untuk tujuan menjalankan platform ISP FinTrack secara efisien.
 </p>
 </section>

 <section>
 <h2 className="text-xl font-semibold text-foreground mb-4">5. Keamanan Data</h2>
 <p>
 Kami menerapkan standar keamanan teknis yang kuat, termasuk enkripsi kata sandi menggunakan standar industri, penerapan batas permintaan API (*rate-limiting*), serta protokol HTTPS untuk melindungi transmisi data antara perangkat Anda dan server kami.
 </p>
 </section>

 <section>
 <h2 className="text-xl font-semibold text-foreground mb-4">6. Hak Pengguna (Sesuai UU PDP)</h2>
 <p className="mb-2">Berdasarkan UU PDP, Anda berhak untuk:</p>
 <ul className="list-disc pl-5 space-y-2">
 <li>Meminta akses, salinan, dan pembaharuan data pribadi Anda.</li>
 <li>Meminta penghapusan data atau penghentian pemrosesan (Hak untuk dilupakan).</li>
 <li>Mencabut persetujuan yang telah Anda berikan kepada kami untuk memproses data.</li>
 </ul>
 </section>

 <section>
 <h2 className="text-xl font-semibold text-foreground mb-4">7. Hubungi Kami</h2>
 <p>
 Jika Anda memiliki pertanyaan tentang Kebijakan Privasi ini, silakan hubungi tim Administrator atau Support IT perusahaan Anda, atau hubungi pusat bantuan ISP FinTrack.
 </p>
 </section>
 </div>
 </div>
 </div>
 </div>
 );
}
