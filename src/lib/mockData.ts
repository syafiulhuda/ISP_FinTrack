// ISP-FinTrack: Master Mock Data (Static Fallback)
// ==============================================================================
// File ini digunakan sebagai cadangan (fallback) jika database tidak terhubung.
// Memastikan aplikasi tetap menampilkan data yang kaya saat dijalankan di 
// lingkungan tanpa database (seperti preview GitHub).
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
  { id: 'CT001', name: 'Ahmad Subarjo', service: 'Premium', address: 'Jl. Merdeka No. 12', village: 'Giri Mekar', district: 'Cilengkrang', city: 'Bandung', province: 'Jawa Barat', status: 'Active', createdAt: '2026-01-15' },
  { id: 'CT002', name: 'Siti Aminah', service: 'Standard', address: 'Jl. Sudirman No. 45', village: 'Senayan', district: 'Kebayoran Baru', city: 'Jakarta Selatan', province: 'DKI Jakarta', status: 'Active', createdAt: '2026-02-20' },
  { id: 'CT003', name: 'Budi Santoso', service: 'Basic', address: 'Jl. Diponegoro No. 8', village: 'Tegalsari', district: 'Candisari', city: 'Semarang', province: 'Jawa Tengah', status: 'Inactive', createdAt: '2026-03-10' },
  { id: 'CT004', name: 'Dewi Lestari', service: 'Gamers', address: 'Jl. Gajah Mada No. 21', village: 'Keputran', district: 'Tegalsari', city: 'Surabaya', province: 'Jawa Timur', status: 'Active', createdAt: '2026-04-05' },
  { id: 'CT005', name: 'Eko Prasetyo', service: 'Premium', address: 'Jl. Malioboro No. 99', village: 'Sosromenduran', district: 'Gedongtengen', city: 'Yogyakarta', province: 'DI Yogyakarta', status: 'Active', createdAt: '2026-05-12' },
  { id: 'CT006', name: 'Farah Quinn', service: 'Standard', address: 'Jl. Sunset Road No. 7', village: 'Seminyak', district: 'Kuta', city: 'Badung', province: 'Bali', status: 'Active', createdAt: '2026-06-18' },
  { id: 'CT007', name: 'Guntur Pratama', service: 'Basic', address: 'Jl. Gatot Subroto No. 33', village: 'Sei Sikambing', district: 'Medan Helvetia', city: 'Medan', province: 'Sumatera Utara', status: 'Active', createdAt: '2026-07-22' },
  { id: 'CT008', name: 'Hani Safitri', service: 'Gamers', address: 'Jl. Pahlawan No. 5', village: 'Klampis Ngasem', district: 'Sukolilo', city: 'Surabaya', province: 'Jawa Timur', status: 'Active', createdAt: '2026-08-30' }
];

export const MOCK_TRANSACTIONS = [
  { id: 'TRX-001', customer_id: 'CT001', method: 'QRIS Dynamic', amount: 'Rp 400.000', status: 'Verified', timestamp: new Date(Date.now() - 720000).toISOString(), type: 'qris', keterangan: 'pemasukan' },
  { id: 'TRX-002', customer_id: 'CT002', method: 'Bank Transfer', amount: 'Rp 250.000', status: 'Verified', timestamp: new Date(Date.now() - 2700000).toISOString(), type: 'bank', keterangan: 'pemasukan' },
  { id: 'TRX-003', customer_id: 'CT004', method: 'QRIS Dynamic', amount: 'Rp 750.000', status: 'Verified', timestamp: new Date(Date.now() - 7200000).toISOString(), type: 'qris', keterangan: 'pemasukan' },
  { id: 'TRX-004', customer_id: null, method: 'Vendor Payment', amount: 'Rp 1.250.000', status: 'Verified', timestamp: new Date(Date.now() - 86400000).toISOString(), type: 'bank', keterangan: 'pengeluaran' },
  { id: 'TRX-005', customer_id: 'CT005', method: 'Bank Transfer', amount: 'Rp 400.000', status: 'Pending', timestamp: new Date(Date.now() - 10800000).toISOString(), type: 'bank', keterangan: 'pemasukan' }
];

export const MOCK_ASSETS = [
  { id: 1, sn: 'SN-8924-A1B2', mac: '00:1A:2B:3C:4D:5E', type: 'ONT', location: 'Customer Site, Bandung', condition: 'Good', latitude: -6.2088, longitude: 106.8456, status: 'Online', kepemilikan: 'Dimiliki', tanggal_perubahan: '2026-01-10' },
  { id: 2, sn: 'SN-1045-C9D8', mac: '00:1A:2B:3C:4D:5F', type: 'OLT', location: 'Core Pop, Jakarta', condition: 'Maintenance', latitude: -6.9175, longitude: 107.6191, status: 'Maintenance', kepemilikan: 'Dimiliki', tanggal_perubahan: '2026-02-15' }
];

export const MOCK_STOCK = [
  { id: 1, sn: 'SN-STOCK-001', mac: '00:FF:2B:3C:4D:01', type: 'ONT', location: 'Main Warehouse', condition: 'Good', latitude: -6.2000, longitude: 106.8000, status: 'Online', kepemilikan: 'Dimiliki', tanggal_perubahan: '2026-04-01', is_used: false },
  { id: 2, sn: 'SN-STOCK-002', mac: '00:FF:2B:3C:4D:02', type: 'Router', location: 'Main Warehouse', condition: 'Good', latitude: -6.2000, longitude: 106.8000, status: 'Online', kepemilikan: 'Dimiliki', tanggal_perubahan: '2026-04-01', is_used: true }
];

export const MOCK_EXPENSES = [
  { id: 1, category: 'Marketing', amount: 5000000, date: '2026-04-01', description: 'Facebook Ads Campaign' },
  { id: 2, category: 'Infrastructure', amount: 15000000, date: '2026-04-05', description: 'Data Center Rental' },
  { id: 3, category: 'Operations', amount: 8000000, date: '2026-04-10', description: 'Office Electricity & Internet' }
];

export const MOCK_NOTIFICATIONS = [
  { id: 1, category: 'Finance', title: 'New transaction detected', message: 'Incoming payment of Rp 400,000 from Ahmad Subarjo has been verified.', type: 'transaction', is_unread: true, created_at: new Date().toISOString() },
  { id: 2, category: 'System', title: 'Welcome to FinTrack', message: 'Database synchronized successfully.', type: 'system', is_unread: false, created_at: new Date(Date.now() - 3600000).toISOString() }
];

export const MOCK_OCR = {
  image: 'https://images.unsplash.com/photo-1554224155-1696413565d3?auto=format&fit=crop&q=80&w=1000',
  confidence: '94.2%',
  vendor: 'PT Mega Indah Solusindo',
  date: '21 Oct 2023',
  amount: '1,250,000',
  reference: 'TRX-99420-BIS'
};
