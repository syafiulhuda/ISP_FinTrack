-- ISP-FinTrack Master Seed Data (Synchronized)
-- ==============================================================================
-- File ini digunakan untuk inisialisasi database PostgreSQL agar memiliki 
-- struktur dan data yang identik dengan lingkungan pengembangan lokal.
-- ==============================================================================

DROP TABLE IF EXISTS "notifications";
DROP TABLE IF EXISTS "ocr_data";
DROP TABLE IF EXISTS "transactions";
DROP TABLE IF EXISTS "customers";
DROP TABLE IF EXISTS "asset_roster";
DROP TABLE IF EXISTS "stock_asset_roster";
DROP TABLE IF EXISTS "service_tiers";
DROP TABLE IF EXISTS "admin";

-- 1. ADMIN
CREATE TABLE "admin" (
  id SERIAL PRIMARY KEY,
  "nama" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "password" VARCHAR(255) NOT NULL,
  "role" VARCHAR(100) NOT NULL,
  "department" VARCHAR(100) NOT NULL,
  "image" TEXT
);

INSERT INTO "admin" ("nama", "email", "password", "role", "department", "image") VALUES
('Alex Rivera', 'admin@company.com', 'admin', 'Senior Administrator', 'Infrastructure & Ops', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80');

-- 2. SERVICE TIERS
CREATE TABLE "service_tiers" (
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

-- 3. CUSTOMERS
CREATE TABLE "customers" (
  "id" TEXT PRIMARY KEY,
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
('CT008', 'Hani Safitri', 'Gamers', 'Jl. Pahlawan No. 5', 'Klampis Ngasem', 'Sukolilo', 'Surabaya', 'Jawa Timur', 'Active', '2026-08-30');

-- 4. TRANSACTIONS (Updated with customer_id and keterangan)
CREATE TABLE "transactions" (
  "id" TEXT PRIMARY KEY,
  "customer_id" TEXT,
  "method" TEXT,
  "amount" TEXT,
  "status" TEXT,
  "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "type" TEXT,
  "keterangan" TEXT -- 'pemasukan' | 'pengeluaran'
);

INSERT INTO "transactions" ("id", "customer_id", "method", "amount", "status", "timestamp", "type", "keterangan") VALUES
('TRX-001', 'CT001', 'QRIS Dynamic', 'Rp 400.000', 'Verified', NOW() - INTERVAL '12 minutes', 'qris', 'pemasukan'),
('TRX-002', 'CT002', 'Bank Transfer', 'Rp 250.000', 'Verified', NOW() - INTERVAL '45 minutes', 'bank', 'pemasukan'),
('TRX-003', 'CT004', 'QRIS Dynamic', 'Rp 750.000', 'Verified', NOW() - INTERVAL '2 hours', 'qris', 'pemasukan'),
('TRX-004', NULL, 'Vendor Payment', 'Rp 1.250.000', 'Verified', NOW() - INTERVAL '1 day', 'bank', 'pengeluaran'),
('TRX-005', 'CT005', 'Bank Transfer', 'Rp 400.000', 'Pending', NOW() - INTERVAL '3 hours', 'bank', 'pemasukan');

-- 5. ASSETS (Deployed)
CREATE TABLE "asset_roster" (
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
('SN-8924-A1B2', '00:1A:2B:3C:4D:5E', 'ONT', 'Customer Site, Bandung', 'Good', 'bg-[#e8f5e9] text-[#1b5e20]', -6.2088, 106.8456, 'Online', 'Dimiliki', '2026-01-10'),
('SN-1045-C9D8', '00:1A:2B:3C:4D:5F', 'OLT', 'Core Pop, Jakarta', 'Maintenance', 'bg-[#fff8e1] text-[#f57f17]', -6.9175, 107.6191, 'Maintenance', 'Dimiliki', '2026-02-15');

-- 6. WAREHOUSE ASSETS (With is_used)
CREATE TABLE "stock_asset_roster" (
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
  "tanggal_perubahan" TEXT,
  "is_used" BOOLEAN DEFAULT FALSE
);

INSERT INTO "stock_asset_roster" ("sn", "mac", "type", "location", "condition", "color", "latitude", "longitude", "status", "kepemilikan", "tanggal_perubahan", "is_used") VALUES
('SN-STOCK-001', '00:FF:2B:3C:4D:01', 'ONT', 'Main Warehouse', 'Good', 'bg-emerald-500/10', -6.2000, 106.8000, 'Online', 'Dimiliki', '2026-04-01', FALSE),
('SN-STOCK-002', '00:FF:2B:3C:4D:02', 'Router', 'Main Warehouse', 'Good', 'bg-emerald-500/10', -6.2000, 106.8000, 'Online', 'Dimiliki', '2026-04-01', TRUE);

-- 7. NOTIFICATIONS
CREATE TABLE "notifications" (
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
('Finance', 'New transaction detected', 'Incoming payment of Rp 400,000 from Ahmad Subarjo has been verified.', 'transaction', true, 'View Details'),
('System', 'Welcome to FinTrack', 'Database synchronized successfully.', 'system', false, NULL);

-- 8. EXPENSES
CREATE TABLE "expenses" (
  id SERIAL PRIMARY KEY,
  "category" VARCHAR(100),
  "amount" NUMERIC,
  "date" DATE DEFAULT CURRENT_DATE,
  "description" TEXT
);

INSERT INTO "expenses" ("category", "amount", "date", "description") VALUES
('Marketing', 5000000, '2026-04-01', 'Facebook Ads Campaign'),
('Infrastructure', 15000000, '2026-04-05', 'Data Center Rental'),
('Operations', 8000000, '2026-04-10', 'Office Electricity & Internet');

-- 9. OCR DATA
CREATE TABLE "ocr_data" (
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
