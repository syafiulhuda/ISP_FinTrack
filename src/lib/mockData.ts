// ISP-FinTrack: Master Mock Data (Static Fallback)
// ==============================================================================
// File ini digunakan sebagai cadangan (fallback) jika database tidak terhubung.
// Memastikan aplikasi tetap menampilkan data yang kaya saat dijalankan di 
// lingkungan tanpa database (seperti preview GitHub).
// Data ini telah disesuaikan untuk periode Januari - Oktober 2026.
// ==============================================================================

export const MOCK_ADMIN = {
  id: 1,
  fullName: "Alex Rivera",
  email: "admin@company.com",
  role: "Senior Administrator",
  department: "Infrastructure & Ops",
  image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
};

export const MOCK_SERVICE_TIERS = [
  { id: 1, name: 'Basic', speed: '20', unit: 'Mbps', price: 'Rp 150.000', fup: '500 GB', type: 'standard', icon: 'wifi' },
  { id: 2, name: 'Standard', speed: '50', unit: 'Mbps', price: 'Rp 250.000', fup: '1 TB', type: 'secondary', icon: 'speed' },
  { id: 3, name: 'Premium', speed: '100', unit: 'Mbps', price: 'Rp 400.000', fup: 'Unlimited', type: 'featured', icon: 'rocket' },
  { id: 4, name: 'Gamers Node', speed: '200', unit: 'Mbps', price: 'Rp 750.000', fup: 'Unlimited', type: 'priority', icon: 'gamepad' }
];

export const MOCK_CUSTOMERS = [
  // Jan - Mar
  { id: 'CT001', name: "Ahmad Subarjo", email: "ahmad@example.com", service: "Premium", province: "Jawa Barat", status: "Active", createdAt: "2026-01-15", address: "Jl. Merdeka No. 12", city: "Bandung" },
  { id: 'CT002', name: "Siti Aminah", email: "siti@example.com", service: "Standard", province: "Jawa Tengah", status: "Active", createdAt: "2026-01-20", address: "Jl. Diponegoro No. 8", city: "Semarang" },
  { id: 'CT003', name: "Budi Santoso", email: "budi@corp.com", service: "Basic", province: "Jawa Timur", status: "Inactive", createdAt: "2026-02-05", address: "Jl. Sudirman No. 45", city: "Surabaya" },
  { id: 'CT004', name: "Diana Putri", email: "diana@example.com", service: "Gamers", province: "DKI Jakarta", status: "Active", createdAt: "2026-03-10", address: "Jl. Thamrin No. 1", city: "Jakarta Pusat" },
  
  // Apr - Jun
  { id: 'CT005', name: "Eko Prasetyo", email: "eko@gamers.net", service: "Gamers", province: "Jawa Barat", status: "Active", createdAt: "2026-04-12", address: "Jl. Asia Afrika No. 10", city: "Bandung" },
  { id: 'CT006', name: "Linda Wijaya", email: "linda@example.com", service: "Premium", province: "Bali", status: "Active", createdAt: "2026-05-18", address: "Jl. Kuta No. 88", city: "Denpasar" },
  { id: 'CT007', name: "Rizky Ramadhan", email: "rizky@example.com", service: "Standard", province: "Sumatera Utara", status: "Active", createdAt: "2026-06-22", address: "Jl. Medan No. 5", city: "Medan" },
  
  // Jul - Sep
  { id: 'CT008', name: "Maya Sari", email: "maya@example.com", service: "Basic", province: "Sulawesi Selatan", status: "Active", createdAt: "2026-07-05", address: "Jl. Makassar No. 12", city: "Makassar" },
  { id: 'CT009', name: "Andi Wijaya", email: "andi@example.com", service: "Premium", province: "Jawa Barat", status: "Active", createdAt: "2026-08-14", address: "Jl. Braga No. 20", city: "Bandung" },
  { id: 'CT010', name: "Siska Pratama", email: "siska@example.com", service: "Standard", province: "DKI Jakarta", status: "Active", createdAt: "2026-09-02", address: "Jl. Gatot Subroto", city: "Jakarta Selatan" },
  
  // Oct
  { id: 'CT114', name: "Syfi'", email: "syfi@example.com", service: "Gamers", province: "DKI Jakarta", status: "Active", createdAt: "2026-10-21", address: "Jl. Pasar Minggu No. 14", city: "Jakarta Selatan" },
];

// Total Revenue Target: ~Rp 11.1M (distributed Jan-Oct)
export const MOCK_TRANSACTIONS = [
  // Jan (Total ~1M)
  { id: 'TRX-CT001-J', method: 'Bank Transfer', amount: 'Rp 400.000', status: 'Verified', timestamp: '2026-01-25T10:00:00Z', type: 'bank', keterangan: 'pemasukan' },
  { id: 'TRX-CT002-J', method: 'QRIS Dynamic', amount: 'Rp 600.000', status: 'Verified', timestamp: '2026-01-28T14:30:00Z', type: 'qris', keterangan: 'pemasukan' },
  
  // Feb (Total ~1M)
  { id: 'TRX-CT001-F', method: 'Bank Transfer', amount: 'Rp 400.000', status: 'Verified', timestamp: '2026-02-25T10:00:00Z', type: 'bank', keterangan: 'pemasukan' },
  { id: 'TRX-CT003-F', method: 'QRIS Dynamic', amount: 'Rp 600.000', status: 'Verified', timestamp: '2026-02-28T14:30:00Z', type: 'qris', keterangan: 'pemasukan' },

  // Mar - Sep (Simulated constant revenue for graphs)
  ...Array.from({ length: 7 }).flatMap((_, i) => [
    { id: `TRX-GEN-A-${i}`, method: 'Bank Transfer', amount: 'Rp 500.000', status: 'Verified', timestamp: `2026-0${i+3}-15T10:00:00Z`, type: 'bank', keterangan: 'pemasukan' },
    { id: `TRX-GEN-B-${i}`, method: 'QRIS Dynamic', amount: 'Rp 600.000', status: 'Verified', timestamp: `2026-0${i+3}-25T14:00:00Z`, type: 'qris', keterangan: 'pemasukan' },
  ]),

  // Oct (Final Boost ~1.4M)
  { id: 'TRX-CT114', method: 'Bank Transfer', amount: 'Rp 750.000', status: 'Verified', timestamp: '2026-10-22T09:00:00Z', type: 'bank', keterangan: 'pemasukan' },
  { id: 'TRX-OCT-B', method: 'QRIS Dynamic', amount: 'Rp 650.000', status: 'Verified', timestamp: '2026-10-25T16:00:00Z', type: 'qris', keterangan: 'pemasukan' },

  // Expenses across the year
  { id: 'EXP-MARK-1', method: 'Bank Transfer', amount: 'Rp 1.500.000', status: 'Verified', timestamp: '2026-04-01T10:00:00Z', type: 'bank', keterangan: 'pengeluaran' },
  { id: 'EXP-INFRA-1', method: 'Bank Transfer', amount: 'Rp 2.000.000', status: 'Verified', timestamp: '2026-06-15T10:00:00Z', type: 'bank', keterangan: 'pengeluaran' },
  { id: 'EXP-OPER-1', method: 'Bank Transfer', amount: 'Rp 500.000', status: 'Verified', timestamp: '2026-08-20T10:00:00Z', type: 'bank', keterangan: 'pengeluaran' },
];

export const MOCK_EXPENSES = [
  { id: 1, category: 'Marketing', amount: 1500000, date: '2026-04-01', description: 'Facebook Ads Jan-Apr' },
  { id: 2, category: 'Infrastructure', amount: 2000000, date: '2026-06-15', description: 'Data Center Rental' },
  { id: 3, category: 'Operations', amount: 500000, date: '2026-08-20', description: 'Office Utilities' }
];

export const MOCK_ASSETS = [
  { id: 1, sn: 'SN-8924-A1B2', mac: '00:1A:2B:3C:4D:5E', type: 'ONT', location: 'Customer Site, Bandung', condition: 'Good', latitude: -6.2088, longitude: 106.8456, status: 'Online', kepemilikan: 'Dimiliki', tanggal_perubahan: '2026-01-10' },
  { id: 2, sn: 'SN-1045-C9D8', mac: '00:1A:2B:3C:4D:5F', type: 'OLT', location: 'Core Pop, Jakarta', condition: 'Maintenance', latitude: -6.9175, longitude: 107.6191, status: 'Maintenance', kepemilikan: 'Dimiliki', tanggal_perubahan: '2026-02-15' }
];

export const MOCK_STOCK = [
  { id: 1, sn: 'SN-STOCK-001', mac: '00:FF:2B:3C:4D:01', type: 'ONT', location: 'Main Warehouse', condition: 'Good', latitude: -6.2000, longitude: 106.8000, status: 'Online', kepemilikan: 'Dimiliki', tanggal_perubahan: '2026-04-01', is_used: false },
  { id: 2, sn: 'SN-STOCK-002', mac: '00:FF:2B:3C:4D:02', type: 'Router', location: 'Main Warehouse', condition: 'Good', latitude: -6.2000, longitude: 106.8000, status: 'Online', kepemilikan: 'Dimiliki', tanggal_perubahan: '2026-04-01', is_used: true }
];

export const MOCK_NOTIFICATIONS = [
  { id: 1, category: 'Finance', title: 'New transaction detected', message: 'Incoming payment of Rp 750,000 from Syfi\' has been verified.', type: 'transaction', is_unread: true, created_at: new Date().toISOString() },
  { id: 2, category: 'System', title: 'Welcome to FinTrack', message: 'Database synchronized successfully.', type: 'system', is_unread: false, created_at: new Date(Date.now() - 3600000).toISOString() }
];

export const MOCK_OCR = {
  image: 'https://images.unsplash.com/photo-1554224155-1696413565d3?auto=format&fit=crop&q=80&w=1000',
  confidence: '98.5%',
  vendor: 'PT Mega Indah Solusindo',
  date: '21 Oct 2026',
  amount: '1,250,000',
  reference: 'TRX-99420-BIS'
};
