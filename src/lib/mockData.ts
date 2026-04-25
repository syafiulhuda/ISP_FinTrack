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
  { id: 1, name: "Ahmad Subarjo", email: "ahmad@example.com", service: "Premium", province: "Jawa Barat", status: "Active", joinDate: "2023-10-12", type: "Residential" },
  { id: 2, name: "Siti Aminah", email: "siti@example.com", service: "Standard", province: "Jawa Tengah", status: "Active", joinDate: "2023-11-05", type: "Residential" },
  { id: 3, name: "Budi Santoso", email: "budi@corp.com", service: "Basic", province: "Jawa Timur", status: "Active", joinDate: "2023-09-20", type: "Residential" },
  { id: 4, name: "Diana Putri", email: "diana@example.com", service: "Gamers Node", province: "DKI Jakarta", status: "Active", joinDate: "2024-01-15", type: "Residential" },
  { id: 5, name: "Eko Prasetyo", email: "eko@gamers.net", service: "Gamers Node", province: "Jawa Barat", status: "Active", joinDate: "2024-02-10", type: "Residential" },
  { id: 6, name: "Linda Wijaya", email: "linda@example.com", service: "Premium", province: "Bali", status: "Active", joinDate: "2023-12-01", type: "Residential" },
  { id: 7, name: "Rizky Ramadhan", email: "rizky@example.com", service: "Standard", province: "Sumatera Utara", status: "Active", joinDate: "2024-03-05", type: "Residential" },
  { id: 8, name: "Maya Sari", email: "maya@example.com", service: "Basic", province: "Sulawesi Selatan", status: "Active", joinDate: "2023-08-15", type: "Residential" },
  { id: 9, name: "Andi Wijaya", email: "andi@example.com", service: "Premium", province: "Kalimantan Timur", status: "Active", joinDate: "2024-01-20", type: "Residential" },
  { id: 10, name: "Siska Pratama", email: "siska@example.com", service: "Standard", province: "DI Yogyakarta", status: "Active", joinDate: "2023-11-12", type: "Residential" },
  { id: 11, name: "Fajar Sidik", email: "fajar@example.com", service: "Gamers Node", province: "Banten", status: "Active", joinDate: "2024-02-25", type: "Residential" },
  { id: 12, name: "Gita Gutawa", email: "gita@example.com", service: "Premium", province: "Jawa Barat", status: "Active", joinDate: "2024-03-10", type: "Residential" },
  { id: 13, name: "Hendra Kurnia", email: "hendra@example.com", service: "Standard", province: "Jawa Tengah", status: "Active", joinDate: "2023-12-15", type: "Residential" },
  { id: 14, name: "Indra Brugman", email: "indra@example.com", service: "Basic", province: "DKI Jakarta", status: "Active", joinDate: "2024-01-05", type: "Residential" },
  { id: 15, name: "Joko Wow", email: "joko@example.com", service: "Gamers Node", province: "Jawa Timur", status: "Active", joinDate: "2024-02-18", type: "Residential" }
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
