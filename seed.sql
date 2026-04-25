-- ISP-FinTrack Seed Data (Cleaned)
-- Only contains tables actively used by the application.
-- Tables `admin` and `notifications` are managed by separate scripts.

DROP TABLE IF EXISTS "service_tiers";
DROP TABLE IF EXISTS "asset_roster";
DROP TABLE IF EXISTS "customers";
DROP TABLE IF EXISTS "transactions";
DROP TABLE IF EXISTS "ocr_data";
DROP TABLE IF EXISTS "admin";
DROP TABLE IF EXISTS "notifications";

-- ============================================
-- SERVICE TIERS
-- Used by: Dashboard, Profitability, Regional, Service-Tiers pages
-- ============================================
CREATE TABLE IF NOT EXISTS "service_tiers" (
  id SERIAL PRIMARY KEY,
  "name" TEXT,
  "speed" TEXT,
  "unit" TEXT,
  "price" TEXT,
  "fup" TEXT,
  "type" TEXT,
  "icon" TEXT
);

INSERT INTO "service_tiers" ("name", "speed", "unit", "price", "fup", "type", "icon") VALUES
('Basic', '20', 'Mbps', 'Rp 150.000', '500 GB', 'standard', 'wifi'),
('Standard', '50', 'Mbps', 'Rp 250.000', '1 TB', 'secondary', 'speed'),
('Premium', '100', 'Mbps', 'Rp 400.000', 'Unlimited', 'featured', 'rocket'),
('Gamers Node', '200', 'Mbps', 'Rp 750.000', 'Unlimited', 'priority', 'gamepad');

-- ============================================
-- ASSET ROSTER
-- Used by: Inventory page, Distribution Map, Regional Analysis
-- Trigger: auto-creates notification when condition != 'Good'
-- Fields:
--   kepemilikan: 'Dimiliki' (owned) | 'Telah Dijual' (sold)
--   tanggal_perubahan: date when ownership status last changed
-- ============================================
CREATE TABLE IF NOT EXISTS "asset_roster" (
  id SERIAL PRIMARY KEY,
  "sn" TEXT,
  "mac" TEXT,
  "type" TEXT,
  "location" TEXT,
  "condition" TEXT,
  "color" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "status" TEXT DEFAULT 'Online',
  "kepemilikan" TEXT DEFAULT 'Dimiliki',
  "tanggal_perubahan" TEXT
);

INSERT INTO "asset_roster" ("sn", "mac", "type", "location", "condition", "color", "latitude", "longitude", "status", "kepemilikan", "tanggal_perubahan") VALUES
('SN-8924-A1B2', '00:1A:2B:3C:4D:5E', 'ONT', 'Warehouse Main, DKI Jakarta', 'Good', 'bg-[#e8f5e9] text-[#1b5e20] dot-[#2e7d32]', -6.2088, 106.8456, 'Online', 'Dimiliki', '2026-01-10'),
('SN-1045-C9D8', '00:1A:2B:3C:4D:5F', 'OLT', 'Warehouse West, Bandung, Jawa Barat', 'Maintenance', 'bg-[#fff8e1] text-[#f57f17] dot-[#fbc02d]', -6.9175, 107.6191, 'Maintenance', 'Dimiliki', '2026-02-15'),
('SN-9932-X7Y6', '00:1A:2B:3C:4D:6A', 'ODP', 'Warehouse West, Surabaya, Jawa Timur', 'Broken', 'bg-[#ffebee] text-[#c62828] dot-[#d32f2f]', -7.2575, 112.7521, 'Offline', 'Telah Dijual', '2026-06-20'),
('SN-7712-H3K9', '00:1A:2B:3C:4D:6B', 'ONT', 'Warehouse East, Medan, Sumatera Utara', 'Good', 'bg-[#e8f5e9] text-[#1b5e20] dot-[#2e7d32]', 3.5952, 98.6722, 'Online', 'Dimiliki', '2026-03-01'),
('SN-6651-P0Q4', '00:1A:2B:3C:4D:6C', 'OLT', 'Warehouse Main, Makassar, Sulawesi Selatan', 'Maintenance', 'bg-[#fff8e1] text-[#f57f17] dot-[#fbc02d]', -5.1476, 119.4327, 'Maintenance', 'Telah Dijual', '2026-07-12'),
('SN-5523-L8M2', '00:1A:2B:3C:4D:6D', 'ODP', 'Warehouse South, Bali', 'Broken', 'bg-[#ffebee] text-[#c62828] dot-[#d32f2f]', -8.4095, 115.1889, 'Offline', 'Telah Dijual', '2026-08-05'),
('SN-4389-R7T1', '00:1A:2B:3C:4D:6E', 'ONT', 'Warehouse West, Semarang, Jawa Tengah', 'Good', 'bg-[#e8f5e9] text-[#1b5e20] dot-[#2e7d32]', -6.9667, 110.4167, 'Online', 'Dimiliki', '2026-04-18'),
('SN-3201-Z4X8', '00:1A:2B:3C:4D:6F', 'OLT', 'Warehouse East, Yogyakarta, DI Yogyakarta', 'Maintenance', 'bg-[#fff8e1] text-[#f57f17] dot-[#fbc02d]', -7.7956, 110.3695, 'Maintenance', 'Dimiliki', '2026-05-22'),
('SN-2198-V6B3', '00:1A:2B:3C:4D:70', 'ODP', 'Warehouse Main, Malang, Jawa Timur', 'Good', 'bg-[#e8f5e9] text-[#1b5e20] dot-[#2e7d32]', -7.9839, 112.6214, 'Online', 'Dimiliki', '2026-02-28'),
('SN-1876-N2C5', '00:1A:2B:3C:4D:71', 'ONT', 'Warehouse South, Pekanbaru, Riau', 'Broken', 'bg-[#ffebee] text-[#c62828] dot-[#d32f2f]', 0.5071, 101.4478, 'Offline', 'Telah Dijual', '2026-09-15'),
('SN-1467-D5E9', '00:1A:2B:3C:4D:72', 'OLT', 'Warehouse West, Balikpapan, Kalimantan Timur', 'Good', 'bg-[#e8f5e9] text-[#1b5e20] dot-[#2e7d32]', -1.2654, 116.8312, 'Online', 'Dimiliki', '2026-06-01'),
('SN-1309-F8G1', '00:1A:2B:3C:4D:73', 'ODP', 'Warehouse East, Solo, Jawa Tengah', 'Maintenance', 'bg-[#fff8e1] text-[#f57f17] dot-[#fbc02d]', -7.5666, 110.8167, 'Maintenance', 'Dimiliki', '2026-03-14');

-- ============================================
-- CUSTOMERS
-- Used by: Dashboard, Profitability, Regional, Service-Tiers, ProvinceSelectionModal
-- ============================================
CREATE TABLE IF NOT EXISTS "customers" (
  "id" TEXT,
  "name" TEXT,
  "service" TEXT,
  "address" TEXT,
  "village" TEXT,
  "district" TEXT,
  "city" TEXT,
  "province" TEXT,
  "status" TEXT,
  "createdAt" TEXT
);

INSERT INTO "customers" ("id", "name", "service", "address", "village", "district", "city", "province", "status", "createdAt") VALUES
('CT001', 'Ahmad Subarjo', 'Premium', 'Jl. Merdeka No. 12', 'Giri Mekar', 'Cilengkrang', 'Bandung', 'Jawa Barat', 'Active', '2026-01-15'),
('CT002', 'Siti Aminah', 'Standard', 'Jl. Sudirman No. 45', 'Senayan', 'Kebayoran Baru', 'Jakarta Selatan', 'DKI Jakarta', 'Active', '2026-02-20'),
('CT003', 'Budi Santoso', 'Basic', 'Jl. Diponegoro No. 8', 'Tegalsari', 'Candisari', 'Semarang', 'Jawa Tengah', 'Inactive', '2026-03-10'),
('CT004', 'Dewi Lestari', 'Gamers', 'Jl. Gajah Mada No. 21', 'Keputran', 'Tegalsari', 'Surabaya', 'Jawa Timur', 'Active', '2026-04-05'),
('CT005', 'Eko Prasetyo', 'Premium', 'Jl. Malioboro No. 99', 'Sosromenduran', 'Gedongtengen', 'Yogyakarta', 'DI Yogyakarta', 'Active', '2026-05-12'),
('CT006', 'Farah Quinn', 'Standard', 'Jl. Sunset Road No. 7', 'Seminyak', 'Kuta', 'Badung', 'Bali', 'Active', '2026-06-18'),
('CT007', 'Guntur Pratama', 'Basic', 'Jl. Gatot Subroto No. 33', 'Sei Sikambing', 'Medan Helvetia', 'Medan', 'Sumatera Utara', 'Active', '2026-07-22'),
('CT008', 'Hani Safitri', 'Gamers', 'Jl. Pahlawan No. 5', 'Klampis Ngasem', 'Sukolilo', 'Surabaya', 'Jawa Timur', 'Active', '2026-08-30'),
('CT009', 'Indra Wijaya', 'Premium', 'Jl. Asia Afrika No. 10', 'Braga', 'Sumur Bandung', 'Bandung', 'Jawa Barat', 'Active', '2026-09-05'),
('CT010', 'Joko Susilo', 'Basic', 'Jl. Ahmad Yani No. 55', 'Cempaka Putih', 'Cempaka Putih', 'Jakarta Pusat', 'DKI Jakarta', 'Active', '2026-09-10'),
('CT011', 'Kartika Sari', 'Standard', 'Jl. Raya Darmo No. 88', 'Darmo', 'Wonokromo', 'Surabaya', 'Jawa Timur', 'Active', '2026-09-15'),
('CT012', 'Lukman Hakim', 'Gamers', 'Jl. Urip Sumoharjo No. 3', 'Pandanaran', 'Semarang Tengah', 'Semarang', 'Jawa Tengah', 'Active', '2026-09-20'),
('CT013', 'Maya Putri', 'Premium', 'Jl. Palagan No. 77', 'Sariharjo', 'Ngaglik', 'Sleman', 'DI Yogyakarta', 'Active', '2026-10-01'),
('CT014', 'Nanda Saputra', 'Basic', 'Jl. Imam Bonjol No. 23', 'Pemecutan', 'Denpasar Barat', 'Denpasar', 'Bali', 'Active', '2026-10-02'),
('CT015', 'Oki Prabowo', 'Standard', 'Jl. Sisingamangaraja No. 90', 'Harjosari', 'Medan Amplas', 'Medan', 'Sumatera Utara', 'Active', '2026-10-03'),
('CT016', 'Putri Ayu', 'Gamers', 'Jl. Cihampelas No. 11', 'Cipaganti', 'Coblong', 'Bandung', 'Jawa Barat', 'Active', '2026-10-04'),
('CT017', 'Rizky Ananda', 'Premium', 'Jl. Thamrin No. 1', 'Menteng', 'Menteng', 'Jakarta Pusat', 'DKI Jakarta', 'Active', '2026-10-05'),
('CT018', 'Salsa Nabila', 'Standard', 'Jl. Ahmad Dahlan No. 44', 'Notoprajan', 'Ngampilan', 'Yogyakarta', 'DI Yogyakarta', 'Active', '2026-10-06'),
('CT019', 'Taufik Hidayat', 'Basic', 'Jl. Dipatiukur No. 66', 'Lebakgede', 'Coblong', 'Bandung', 'Jawa Barat', 'Active', '2026-10-07'),
('CT020', 'Umi Kalsum', 'Gamers', 'Jl. Kapten Tendean No. 17', 'Mampang', 'Mampang Prapatan', 'Jakarta Selatan', 'DKI Jakarta', 'Active', '2026-10-08'),
('CT021', 'Vina Oktaviani', 'Premium', 'Jl. Kaliurang No. 101', 'Condongcatur', 'Depok', 'Sleman', 'DI Yogyakarta', 'Active', '2026-10-09'),
('CT022', 'Wahyu Setiawan', 'Basic', 'Jl. Manyar No. 28', 'Manyar Sabrangan', 'Mulyorejo', 'Surabaya', 'Jawa Timur', 'Active', '2026-10-10'),
('CT023', 'Yusuf Maulana', 'Standard', 'Jl. Gatot Subroto No. 120', 'Cibangkong', 'Batununggal', 'Bandung', 'Jawa Barat', 'Active', '2026-10-11'),
('CT024', 'Zahra Fitri', 'Gamers', 'Jl. Sudirman No. 200', 'Karet', 'Setiabudi', 'Jakarta Selatan', 'DKI Jakarta', 'Active', '2026-10-12'),
('CT025', 'Agus Salim', 'Premium', 'Jl. Veteran No. 2', 'Blimbing', 'Blimbing', 'Malang', 'Jawa Timur', 'Active', '2026-10-13'),
('CT026', 'Bella Maharani', 'Standard', 'Jl. Sudirman No. 77', 'Pekanbaru Kota', 'Sukajadi', 'Pekanbaru', 'Riau', 'Active', '2026-10-14'),
('CT027', 'Cahyo Nugroho', 'Basic', 'Jl. Adi Sucipto No. 18', 'Manahan', 'Banjarsari', 'Solo', 'Jawa Tengah', 'Active', '2026-10-15'),
('CT028', 'Dian Permata', 'Gamers', 'Jl. Riau No. 56', 'Citarum', 'Bandung Wetan', 'Bandung', 'Jawa Barat', 'Active', '2026-10-16'),
('CT097', 'Fikri Ramadhan', 'Premium', 'Jl. Ahmad Yani No. 10', 'Karang Anyar', 'Tarakan Barat', 'Tarakan', 'Kalimantan Utara', 'Active', '2026-10-17'),
('CT098', 'Gina Safira', 'Standard', 'Jl. Teuku Umar No. 23', 'Sepinggan', 'Balikpapan Selatan', 'Balikpapan', 'Kalimantan Timur', 'Active', '2026-10-18'),
('CT099', 'Hendra Kurniawan', 'Basic', 'Jl. Hasanuddin No. 5', 'Losari', 'Ujung Pandang', 'Makassar', 'Sulawesi Selatan', 'Active', '2026-10-19'),
('CT100', 'Intan Permatasari', 'Gamers', 'Jl. Sam Ratulangi No. 88', 'Titiwungen', 'Sario', 'Manado', 'Sulawesi Utara', 'Active', '2026-10-20'),
('CT101', 'TEST CUSTOMER DYNAMIC', 'Basic', 'Jl. Test No. 1', 'DKI Jakarta', 'Jakarta Pusat', 'Jakarta Pusat', 'Jakarta Pusat', 'Inactive', '2026-10-21'),
('CT102', 'Rahmat Hidayat', 'Standard', 'Jl. Ahmad Yani No. 12', 'Melayu', 'Banjarmasin Tengah', 'Banjarmasin', 'Kalimantan Selatan', 'Active', '2026-10-21'),
('CT103', 'Rafi Pratama', 'Premium', 'Jl. Kemang Raya No. 12', 'Kemang', 'Mampang Prapatan', 'Jakarta Selatan', 'DKI Jakarta', 'Active', '2026-10-21'),
('CT104', 'Dina Maharani', 'Standard', 'Jl. Cipete Raya No. 45', 'Cipete Selatan', 'Cilandak', 'Jakarta Selatan', 'DKI Jakarta', 'Active', '2026-10-21'),
('CT105', 'Fajar Nugraha', 'Basic', 'Jl. Tebet Barat No. 8', 'Tebet Barat', 'Tebet', 'Jakarta Selatan', 'DKI Jakarta', 'Active', '2026-10-21'),
('CT106', 'Nabila Putri', 'Gamers', 'Jl. Panglima Polim No. 21', 'Melawai', 'Kebayoran Baru', 'Jakarta Selatan', 'DKI Jakarta', 'Active', '2026-10-21'),
('CT107', 'Yoga Saputra', 'Premium', 'Jl. Ampera Raya No. 99', 'Ragunan', 'Pasar Minggu', 'Jakarta Selatan', 'DKI Jakarta', 'Active', '2026-10-21'),
('CT108', 'Sari Oktaviani', 'Standard', 'Jl. Bintaro Utama No. 7', 'Pesanggrahan', 'Pesanggrahan', 'Jakarta Selatan', 'DKI Jakarta', 'Active', '2026-10-21'),
('CT109', 'Andi Kurniawan', 'Basic', 'Jl. Radio Dalam No. 33', 'Gandaria Utara', 'Kebayoran Baru', 'Jakarta Selatan', 'DKI Jakarta', 'Active', '2026-10-21'),
('CT110', 'Maya Salsabila', 'Gamers', 'Jl. Fatmawati No. 5', 'Cilandak Barat', 'Cilandak', 'Jakarta Selatan', 'DKI Jakarta', 'Inactive', '2026-10-21'),
('CT111', 'Bagus Wicaksono', 'Premium', 'Jl. TB Simatupang No. 88', 'Lebak Bulus', 'Cilandak', 'Jakarta Selatan', 'DKI Jakarta', 'Inactive', '2026-10-21'),
('CT112', 'Putri Anindya', 'Standard', 'Jl. Pasar Minggu No. 14', 'Pejaten Timur', 'Pasar Minggu', 'Jakarta Selatan', 'DKI Jakarta', 'Inactive', '2026-10-21'),
('CT113', 'Huda', 'Gamers', 'Jl. Pasar Minggu No. 14', 'Pejaten Timur', 'Pasar Minggu', 'Jakarta Selatan', 'DKI Jakarta', 'Active', '2026-10-21');

-- ============================================
-- TRANSACTIONS
-- Used by: Finance page
-- Trigger: auto-creates notification in `notifications` table
-- ============================================
CREATE TABLE IF NOT EXISTS "transactions" (
  "id" TEXT,
  "method" TEXT,
  "amount" TEXT,
  "status" TEXT,
  "timestamp" TEXT,
  "type" TEXT
);

INSERT INTO "transactions" ("id", "method", "amount", "status", "timestamp", "type") VALUES
('TRX-001', 'QRIS Dynamic', 'Rp 450.000', 'Verified', '12 mins ago', 'qris'),
('TRX-002', 'Bank Transfer', 'Rp 1.250.000', 'Pending', '45 mins ago', 'bank');

-- ============================================
-- OCR DATA
-- Used by: Finance page
-- ============================================
CREATE TABLE IF NOT EXISTS "ocr_data" (
  id SERIAL PRIMARY KEY,
  "image" TEXT,
  "confidence" TEXT,
  "vendor" TEXT,
  "date" TEXT,
  "amount" TEXT,
  "reference" TEXT
);

INSERT INTO "ocr_data" ("image", "confidence", "vendor", "date", "amount", "reference") VALUES
('https://images.unsplash.com/photo-1554224155-1696413565d3?auto=format&fit=crop&q=80&w=1000', '94.2%', 'PT Mega Indah Solusindo', '21 Oct 2023', '1,250,000', 'TRX-99420-BIS');

-- ============================================
-- ADMIN
-- Used by: Login and Session Management
-- ============================================
CREATE TABLE IF NOT EXISTS "admin" (
  id SERIAL PRIMARY KEY,
  "nama" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "password" VARCHAR(255) NOT NULL,
  "role" VARCHAR(100) NOT NULL,
  "department" VARCHAR(100) NOT NULL
);

INSERT INTO "admin" ("nama", "email", "password", "role", "department") VALUES
('Alex Rivera', 'admin@company.com', 'admin', 'Senior Administrator', 'Infrastructure & Ops');

-- ============================================
-- NOTIFICATIONS
-- Used by: Notifications page
-- ============================================
CREATE TABLE IF NOT EXISTS "notifications" (
  id SERIAL PRIMARY KEY,
  "category" VARCHAR(50) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "message" TEXT NOT NULL,
  "type" VARCHAR(50) NOT NULL,
  "is_unread" BOOLEAN DEFAULT TRUE,
  "action_label" VARCHAR(100),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "notifications" ("category", "title", "message", "type", "is_unread", "action_label") VALUES
('Finance', 'New transaction detected', 'Incoming payment of Rp 1,240,000 from Enterprise Client #882 has been logged into the ledger.', 'transaction', true, 'View Details'),
('Finance', 'OCR Verification needed', 'Receipt scan from ''Mega Indah Solusindo'' requires manual review of total amount.', 'ocr', false, 'Launch OCR'),
('Inventory', 'Hardware SN-8924 reported faulty', 'Node-X Edge Router at site B-12 reports critical fan failure. Immediate dispatch required.', 'hardware', true, 'Schedule Dispatch'),
('System', 'System Backup Completed', 'Weekly financial ledger and inventory snapshot successfully archived to Secure Vault 01.', 'backup', false, null),
('System', 'Security Audit Passed', 'Monthly automated security scan finished with 0 critical vulnerabilities found across all active nodes.', 'audit', false, null);
