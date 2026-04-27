-- seed_database.sql
-- Run this script to reset the database and seed it with 4 months of mock data (Jan - Apr 2026)

-- 1. CLEAN UP EXISTING DATA
TRUNCATE TABLE transactions CASCADE;
TRUNCATE TABLE expenses CASCADE;
TRUNCATE TABLE customers CASCADE;
TRUNCATE TABLE asset_roster CASCADE;
TRUNCATE TABLE service_tiers CASCADE;
TRUNCATE TABLE admin CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE maintenance_history CASCADE;

-- Reset Sequences
ALTER SEQUENCE admin_id_seq RESTART WITH 1;
ALTER SEQUENCE asset_roster_id_seq RESTART WITH 1;
ALTER SEQUENCE expenses_id_seq RESTART WITH 1;
ALTER SEQUENCE notifications_id_seq RESTART WITH 1;
ALTER SEQUENCE service_tiers_id_seq RESTART WITH 1;
ALTER SEQUENCE maintenance_history_id_seq RESTART WITH 1;

-- 2. INSERT MASTER DATA

-- Admin
INSERT INTO admin (nama, email, password, role, department, image, nickname) VALUES 
('Super Admin', 'admin@ispfintrack.local', 'hashed_pass', 'System Administrator', 'IT & Operations', '/avatars/admin.png', 'Admin');

-- Service Tiers
INSERT INTO service_tiers (name, speed, unit, price, fup, type, icon) VALUES 
('Basic', '20', 'Mbps', 'Rp 250.000', '300 GB', 'Home', 'zap'),
('Standard', '50', 'Mbps', 'Rp 350.000', 'Unlimited', 'Home', 'rocket'),
('Premium', '100', 'Mbps', 'Rp 500.000', 'Unlimited', 'Business', 'server');

-- Asset Roster (Network Nodes)
INSERT INTO asset_roster (sn, mac, type, location, condition, latitude, longitude, status, kepemilikan) VALUES 
('OLT-001', '00:1A:2B:3C:4D:5E', 'OLT', 'Main Hub, Jakarta', 'Good', -6.2088, 106.8456, 'Online', 'Dimiliki'),
('ODP-001', '00:1A:2B:3C:4D:5F', 'ODP', 'Sector A, Jakarta', 'Good', -6.2100, 106.8500, 'Online', 'Dimiliki'),
('ONT-001', '00:1A:2B:3C:4D:60', 'ONT', 'Client Home A', 'Good', -6.2150, 106.8550, 'Online', 'Dimiliki'),
('SRV-001', '00:1A:2B:3C:4D:61', 'Server', 'Data Center', 'Maintenance', -6.2000, 106.8400, 'Online', 'Dimiliki'),
('OLT-002', '00:1A:2B:3C:4D:62', 'OLT', 'Bandung Node', 'Good', -6.9147, 107.6098, 'Online', 'Dimiliki'),
('ODP-002', '00:1A:2B:3C:4D:63', 'ODP', 'Cimahi Area', 'Good', -6.8726, 107.5358, 'Online', 'Sewa'),
('ONT-002', '00:1A:2B:3C:4D:64', 'ONT', 'Client Bandung 1', 'Warning', -6.9200, 107.6100, 'Online', 'Dimiliki'),
('ONT-003', '00:1A:2B:3C:4D:65', 'ONT', 'Client Bandung 2', 'Good', -6.9150, 107.6150, 'Online', 'Dimiliki'),
('OLT-003', '00:1A:2B:3C:4D:66', 'OLT', 'Surabaya Central', 'Good', -7.2504, 112.7688, 'Online', 'Dimiliki'),
('ODP-003', '00:1A:2B:3C:4D:67', 'ODP', 'Gubeng', 'Good', -7.2600, 112.7500, 'Online', 'Dimiliki'),
('ONT-004', '00:1A:2B:3C:4D:68', 'ONT', 'Client Surabaya', 'Good', -7.2650, 112.7550, 'Online', 'Dimiliki'),
('SRV-002', '00:1A:2B:3C:4D:69', 'Server', 'Backup DC BDO', 'Good', -6.9100, 107.6000, 'Online', 'Sewa'),
('OLT-004', '00:1A:2B:3C:4D:70', 'OLT', 'Makassar Hub', 'Maintenance', -5.1476, 119.4327, 'Online', 'Dimiliki'),
('ODP-004', '00:1A:2B:3C:4D:71', 'ODP', 'Panakkukang', 'Good', -5.1500, 119.4400, 'Online', 'Dimiliki');


-- 3. INSERT CUSTOMERS (Jan 2026 Registration)
INSERT INTO customers (id, name, service, address, village, district, city, province, status, "createdAt", no_telp) VALUES
('CT001', 'Budi Santoso', 'Basic', 'Jl. Merdeka No.1', 'Kuningan', 'Setiabudi', 'Jakarta Selatan', 'DKI Jakarta', 'Active', '2026-01-10T00:00:00.000Z', '081234567890'),
('CT002', 'Siti Aminah', 'Standard', 'Jl. Sudirman No.5', 'Senayan', 'Kebayoran Baru', 'Jakarta Selatan', 'DKI Jakarta', 'Active', '2026-01-15T00:00:00.000Z', '081298765432'),
('CT003', 'Andi Darmawan', 'Premium', 'Jl. Gatot Subroto', 'Slipi', 'Palmerah', 'Jakarta Barat', 'DKI Jakarta', 'Active', '2026-01-20T00:00:00.000Z', '081311223344'),
('CT004', 'Rina Wijaya', 'Basic', 'Jl. Thamrin', 'Menteng', 'Menteng', 'Jakarta Pusat', 'DKI Jakarta', 'Active', '2026-01-25T00:00:00.000Z', '081999888777'),
('CT005', 'Joko Susilo', 'Standard', 'Jl. Rasuna Said', 'Karet', 'Setiabudi', 'Jakarta Selatan', 'DKI Jakarta', 'Active', '2026-01-28T00:00:00.000Z', '085566778899');


-- 4. INSERT TRANSACTIONS (Payments from Jan to Apr 2026)

-- Month 1 (January 2026)
INSERT INTO transactions (id, method, amount, status, timestamp, type, keterangan, city) VALUES
('TRX-CT001-20260110', 'Transfer Bank', 'Rp 250.000', 'Verified', '2026-01-10T10:00:00Z', 'Tagihan', 'pemasukan', 'Jakarta Selatan'),
('TRX-CT002-20260115', 'E-Wallet', 'Rp 350.000', 'Verified', '2026-01-15T11:00:00Z', 'Tagihan', 'pemasukan', 'Jakarta Selatan'),
('TRX-CT003-20260120', 'Transfer Bank', 'Rp 500.000', 'Verified', '2026-01-20T09:30:00Z', 'Tagihan', 'pemasukan', 'Jakarta Barat'),
('TRX-CT004-20260125', 'Tunai', 'Rp 250.000', 'Verified', '2026-01-25T14:15:00Z', 'Tagihan', 'pemasukan', 'Jakarta Pusat'),
('TRX-CT005-20260128', 'Transfer Bank', 'Rp 350.000', 'Verified', '2026-01-28T16:45:00Z', 'Tagihan', 'pemasukan', 'Jakarta Selatan');

-- Month 2 (February 2026)
INSERT INTO transactions (id, method, amount, status, timestamp, type, keterangan, city) VALUES
('TRX-CT001-20260210', 'Transfer Bank', 'Rp 250.000', 'Verified', '2026-02-10T10:05:00Z', 'Tagihan', 'pemasukan', 'Jakarta Selatan'),
('TRX-CT002-20260215', 'E-Wallet', 'Rp 350.000', 'Verified', '2026-02-15T11:10:00Z', 'Tagihan', 'pemasukan', 'Jakarta Selatan'),
('TRX-CT003-20260220', 'Transfer Bank', 'Rp 500.000', 'Verified', '2026-02-20T09:40:00Z', 'Tagihan', 'pemasukan', 'Jakarta Barat'),
('TRX-CT004-20260225', 'Tunai', 'Rp 250.000', 'Verified', '2026-02-25T14:20:00Z', 'Tagihan', 'pemasukan', 'Jakarta Pusat'),
('TRX-CT005-20260228', 'Transfer Bank', 'Rp 350.000', 'Verified', '2026-02-28T16:50:00Z', 'Tagihan', 'pemasukan', 'Jakarta Selatan');

-- Month 3 (March 2026)
INSERT INTO transactions (id, method, amount, status, timestamp, type, keterangan, city) VALUES
('TRX-CT001-20260310', 'Transfer Bank', 'Rp 250.000', 'Verified', '2026-03-10T10:00:00Z', 'Tagihan', 'pemasukan', 'Jakarta Selatan'),
('TRX-CT002-20260315', 'E-Wallet', 'Rp 350.000', 'Verified', '2026-03-15T11:00:00Z', 'Tagihan', 'pemasukan', 'Jakarta Selatan'),
('TRX-CT003-20260320', 'Transfer Bank', 'Rp 500.000', 'Verified', '2026-03-20T09:30:00Z', 'Tagihan', 'pemasukan', 'Jakarta Barat'),
('TRX-CT004-20260325', 'Tunai', 'Rp 250.000', 'Verified', '2026-03-25T14:15:00Z', 'Tagihan', 'pemasukan', 'Jakarta Pusat'),
('TRX-CT005-20260328', 'Transfer Bank', 'Rp 350.000', 'Verified', '2026-03-28T16:45:00Z', 'Tagihan', 'pemasukan', 'Jakarta Selatan');

-- Month 4 (April 2026)
INSERT INTO transactions (id, method, amount, status, timestamp, type, keterangan, city) VALUES
('TRX-CT001-20260410', 'Transfer Bank', 'Rp 250.000', 'Verified', '2026-04-10T10:15:00Z', 'Tagihan', 'pemasukan', 'Jakarta Selatan'),
('TRX-CT002-20260415', 'E-Wallet', 'Rp 350.000', 'Verified', '2026-04-15T11:20:00Z', 'Tagihan', 'pemasukan', 'Jakarta Selatan'),
('TRX-CT003-20260420', 'Transfer Bank', 'Rp 500.000', 'Verified', '2026-04-20T09:45:00Z', 'Tagihan', 'pemasukan', 'Jakarta Barat'),
('TRX-CT004-20260425', 'Tunai', 'Rp 250.000', 'Verified', '2026-04-25T14:30:00Z', 'Tagihan', 'pemasukan', 'Jakarta Pusat');
-- CT005 hasn't paid April bill yet, to simulate pending or inactive soon!


-- 5. INSERT EXPENSES (Jan to Apr 2026)
INSERT INTO expenses (category, amount, date, description, city) VALUES
('Sewa Infrastruktur', 500000, '2026-01-05', 'Sewa Tiang ISP Bulan Jan', 'Jakarta Selatan'),
('Listrik & Utilitas', 150000, '2026-02-05', 'Tagihan Listrik Server Feb', 'Jakarta Pusat'),
('Beli Hardware', 750000, '2026-03-05', 'Pembelian Kabel Fiber Optik', 'Jakarta Barat'),
('Maintenance', 300000, '2026-04-05', 'Perbaikan ODP yang rusak', 'Jakarta Selatan');

-- Sync Expenses to Transactions (OUT)
INSERT INTO transactions (id, method, amount, status, timestamp, type, keterangan, city) VALUES
('OUT-1-20260105', 'Transfer Bank', 'Rp 500.000', 'Verified', '2026-01-05T09:00:00Z', 'Sewa', 'pengeluaran', 'Jakarta Selatan'),
('OUT-2-20260205', 'Transfer Bank', 'Rp 150.000', 'Verified', '2026-02-05T09:00:00Z', 'Utilitas', 'pengeluaran', 'Jakarta Pusat'),
('OUT-3-20260305', 'Transfer Bank', 'Rp 750.000', 'Verified', '2026-03-05T09:00:00Z', 'Hardware', 'pengeluaran', 'Jakarta Barat'),
('OUT-4-20260405', 'Transfer Bank', 'Rp 300.000', 'Verified', '2026-04-05T09:00:00Z', 'Maintenis', 'pengeluaran', 'Jakarta Selatan');

-- End of script


-- 50 Generated Customers (Feb - Apr 2026)
INSERT INTO customers (id, name, service, address, village, district, city, province, status, "createdAt", no_telp) VALUES
('CT006', 'Oki Kurniawan', 'Basic', 'Jl. Random No.6', 'Desa', 'Kecamatan', 'Jakarta Barat', 'DKI Jakarta', 'Active', '2026-04-20T23:43:22.652Z', '0815535680'),
('CT007', 'Toni Mulyana', 'Standard', 'Jl. Random No.7', 'Desa', 'Kecamatan', 'Jakarta Selatan', 'DKI Jakarta', 'Active', '2026-03-03T13:24:49.869Z', '08169096409'),
('CT008', 'Kiki Purnomo', 'Premium', 'Jl. Random No.8', 'Desa', 'Kecamatan', 'Jakarta Selatan', 'DKI Jakarta', 'Active', '2026-04-07T08:00:10.547Z', '08163652066'),
('CT009', 'Siti Setiawan', 'Standard', 'Jl. Random No.9', 'Desa', 'Kecamatan', 'Jakarta Timur', 'DKI Jakarta', 'Active', '2026-04-22T07:22:37.946Z', '0813894776'),
('CT010', 'Bayu Purnomo', 'Premium', 'Jl. Random No.10', 'Desa', 'Kecamatan', 'Jakarta Utara', 'DKI Jakarta', 'Active', '2026-03-18T05:34:30.257Z', '08138460854'),
('CT011', 'Mira Kurniawan', 'Basic', 'Jl. Random No.11', 'Desa', 'Kecamatan', 'Jakarta Utara', 'DKI Jakarta', 'Active', '2026-04-17T20:07:48.579Z', '08181155058'),
('CT012', 'Yudi Mulyana', 'Basic', 'Jl. Random No.12', 'Desa', 'Kecamatan', 'Jakarta Barat', 'DKI Jakarta', 'Active', '2026-03-18T13:42:58.613Z', '081805018'),
('CT013', 'Iwan Pratama', 'Standard', 'Jl. Random No.13', 'Desa', 'Kecamatan', 'Jakarta Barat', 'DKI Jakarta', 'Active', '2026-04-15T02:09:58.700Z', '08174897780'),
('CT014', 'Mira Kurniawan', 'Standard', 'Jl. Random No.14', 'Desa', 'Kecamatan', 'Bandung', 'Jawa Barat', 'Active', '2026-02-05T21:59:42.412Z', '08191300775'),
('CT015', 'Dewi Simanjuntak', 'Premium', 'Jl. Random No.15', 'Desa', 'Kecamatan', 'Jakarta Pusat', 'DKI Jakarta', 'Active', '2026-03-22T06:12:20.522Z', '08121366066'),
('CT016', 'Fajar Gunawan', 'Basic', 'Jl. Random No.16', 'Desa', 'Kecamatan', 'Jakarta Barat', 'DKI Jakarta', 'Active', '2026-03-23T01:11:02.922Z', '08182987154'),
('CT017', 'Cahyo Purnomo', 'Premium', 'Jl. Random No.17', 'Desa', 'Kecamatan', 'Jakarta Selatan', 'DKI Jakarta', 'Active', '2026-04-16T23:02:54.527Z', '08122449646'),
('CT018', 'Zainal Wijaya', 'Basic', 'Jl. Random No.18', 'Desa', 'Kecamatan', 'Bandung', 'Jawa Barat', 'Active', '2026-02-26T18:14:40.020Z', '08123733768'),
('CT019', 'Lina Hidayat', 'Premium', 'Jl. Random No.19', 'Desa', 'Kecamatan', 'Jakarta Pusat', 'DKI Jakarta', 'Active', '2026-03-24T16:58:45.159Z', '081884495'),
('CT020', 'Eka Lubis', 'Basic', 'Jl. Random No.20', 'Desa', 'Kecamatan', 'Jakarta Selatan', 'DKI Jakarta', 'Active', '2026-04-12T13:58:58.395Z', '0811864359'),
('CT021', 'Kiki Simanjuntak', 'Standard', 'Jl. Random No.21', 'Desa', 'Kecamatan', 'Jakarta Barat', 'DKI Jakarta', 'Active', '2026-03-11T11:14:34.260Z', '08142888384'),
('CT022', 'Mira Sari', 'Standard', 'Jl. Random No.22', 'Desa', 'Kecamatan', 'Jakarta Timur', 'DKI Jakarta', 'Active', '2026-02-23T06:22:13.481Z', '08198257388'),
('CT023', 'Citra Mulyana', 'Standard', 'Jl. Random No.23', 'Desa', 'Kecamatan', 'Jakarta Barat', 'DKI Jakarta', 'Active', '2026-03-23T14:50:48.569Z', '08143533558'),
('CT024', 'Putra Nugroho', 'Basic', 'Jl. Random No.24', 'Desa', 'Kecamatan', 'Jakarta Selatan', 'DKI Jakarta', 'Active', '2026-02-04T04:11:38.852Z', '08192704962'),
('CT025', 'Citra Saputra', 'Basic', 'Jl. Random No.25', 'Desa', 'Kecamatan', 'Jakarta Timur', 'DKI Jakarta', 'Active', '2026-03-27T22:10:15.885Z', '08136113541'),
('CT026', 'Andi Siregar', 'Standard', 'Jl. Random No.26', 'Desa', 'Kecamatan', 'Bandung', 'Jawa Barat', 'Active', '2026-03-31T02:34:04.192Z', '08141406804'),
('CT027', 'Zainal Pratama', 'Basic', 'Jl. Random No.27', 'Desa', 'Kecamatan', 'Jakarta Barat', 'DKI Jakarta', 'Active', '2026-03-04T03:56:51.223Z', '08165979333'),
('CT028', 'Kiki Hidayat', 'Basic', 'Jl. Random No.28', 'Desa', 'Kecamatan', 'Surabaya', 'Jawa Timur', 'Active', '2026-04-02T15:51:50.553Z', '08153225014'),
('CT029', 'Citra Nugroho', 'Premium', 'Jl. Random No.29', 'Desa', 'Kecamatan', 'Jakarta Pusat', 'DKI Jakarta', 'Active', '2026-03-02T04:06:10.157Z', '08157034367'),
('CT030', 'Fajar Gunawan', 'Basic', 'Jl. Random No.30', 'Desa', 'Kecamatan', 'Bandung', 'Jawa Barat', 'Active', '2026-02-06T23:42:40.715Z', '08145880363'),
('CT031', 'Nina Pratama', 'Basic', 'Jl. Random No.31', 'Desa', 'Kecamatan', 'Jakarta Utara', 'DKI Jakarta', 'Active', '2026-02-26T12:38:07.209Z', '08148259849'),
('CT032', 'Zainal Wahyudi', 'Premium', 'Jl. Random No.32', 'Desa', 'Kecamatan', 'Surabaya', 'Jawa Timur', 'Active', '2026-04-16T00:42:39.315Z', '08121477080'),
('CT033', 'Eka Simanjuntak', 'Basic', 'Jl. Random No.33', 'Desa', 'Kecamatan', 'Surabaya', 'Jawa Timur', 'Active', '2026-02-09T06:24:37.354Z', '08140200943'),
('CT034', 'Qori Gunawan', 'Standard', 'Jl. Random No.34', 'Desa', 'Kecamatan', 'Bandung', 'Jawa Barat', 'Active', '2026-02-09T08:59:05.812Z', '08170869354'),
('CT035', 'Lina Lubis', 'Basic', 'Jl. Random No.35', 'Desa', 'Kecamatan', 'Jakarta Selatan', 'DKI Jakarta', 'Active', '2026-02-25T11:33:31.528Z', '08124342577'),
('CT036', 'Bayu Pangestu', 'Standard', 'Jl. Random No.36', 'Desa', 'Kecamatan', 'Jakarta Barat', 'DKI Jakarta', 'Active', '2026-04-24T12:53:35.549Z', '08182941346'),
('CT037', 'Andi Sutanto', 'Standard', 'Jl. Random No.37', 'Desa', 'Kecamatan', 'Bandung', 'Jawa Barat', 'Active', '2026-03-29T09:34:31.862Z', '08187612950'),
('CT038', 'Gita Pratama', 'Standard', 'Jl. Random No.38', 'Desa', 'Kecamatan', 'Jakarta Barat', 'DKI Jakarta', 'Active', '2026-03-09T09:37:07.098Z', '08131468455'),
('CT039', 'Wawan Siregar', 'Premium', 'Jl. Random No.39', 'Desa', 'Kecamatan', 'Jakarta Barat', 'DKI Jakarta', 'Active', '2026-04-09T15:47:45.903Z', '08166415240'),
('CT040', 'Iwan Wijaya', 'Basic', 'Jl. Random No.40', 'Desa', 'Kecamatan', 'Jakarta Selatan', 'DKI Jakarta', 'Active', '2026-04-03T21:56:42.511Z', '08192693081'),
('CT041', 'Gita Simanjuntak', 'Premium', 'Jl. Random No.41', 'Desa', 'Kecamatan', 'Jakarta Utara', 'DKI Jakarta', 'Active', '2026-02-16T18:07:22.659Z', '08157818831'),
('CT042', 'Yudi Gunawan', 'Basic', 'Jl. Random No.42', 'Desa', 'Kecamatan', 'Jakarta Timur', 'DKI Jakarta', 'Active', '2026-03-18T19:28:16.548Z', '08190385723'),
('CT043', 'Joko Pratama', 'Premium', 'Jl. Random No.43', 'Desa', 'Kecamatan', 'Jakarta Pusat', 'DKI Jakarta', 'Active', '2026-04-13T09:53:34.461Z', '08119359574'),
('CT044', 'Zainal Siregar', 'Standard', 'Jl. Random No.44', 'Desa', 'Kecamatan', 'Jakarta Utara', 'DKI Jakarta', 'Active', '2026-03-09T08:49:47.687Z', '08169801454'),
('CT045', 'Xaverius Wahyudi', 'Basic', 'Jl. Random No.45', 'Desa', 'Kecamatan', 'Jakarta Pusat', 'DKI Jakarta', 'Active', '2026-02-15T13:56:06.392Z', '08163357289'),
('CT046', 'Fajar Siregar', 'Standard', 'Jl. Random No.46', 'Desa', 'Kecamatan', 'Bandung', 'Jawa Barat', 'Active', '2026-04-05T23:31:04.502Z', '08122926882'),
('CT047', 'Qori Pratama', 'Standard', 'Jl. Random No.47', 'Desa', 'Kecamatan', 'Jakarta Pusat', 'DKI Jakarta', 'Active', '2026-03-31T10:42:52.182Z', '08131428430'),
('CT048', 'Budi Santoso', 'Standard', 'Jl. Random No.48', 'Desa', 'Kecamatan', 'Jakarta Barat', 'DKI Jakarta', 'Active', '2026-03-24T18:18:49.981Z', '08166140419'),
('CT049', 'Budi Setiawan', 'Premium', 'Jl. Random No.49', 'Desa', 'Kecamatan', 'Jakarta Utara', 'DKI Jakarta', 'Active', '2026-02-22T13:42:56.454Z', '08135185238'),
('CT050', 'Ayu Purnomo', 'Standard', 'Jl. Random No.50', 'Desa', 'Kecamatan', 'Jakarta Utara', 'DKI Jakarta', 'Active', '2026-02-09T07:58:02.005Z', '08138319442'),
('CT051', 'Agus Gunawan', 'Standard', 'Jl. Random No.51', 'Desa', 'Kecamatan', 'Jakarta Selatan', 'DKI Jakarta', 'Active', '2026-02-17T04:17:24.382Z', '08140870025'),
('CT052', 'Zainal Simanjuntak', 'Standard', 'Jl. Random No.52', 'Desa', 'Kecamatan', 'Jakarta Selatan', 'DKI Jakarta', 'Active', '2026-04-05T20:06:35.104Z', '08147912212'),
('CT053', 'Udin Pratama', 'Basic', 'Jl. Random No.53', 'Desa', 'Kecamatan', 'Jakarta Utara', 'DKI Jakarta', 'Active', '2026-02-05T17:59:29.811Z', '08144336723'),
('CT054', 'Mira Kusuma', 'Basic', 'Jl. Random No.54', 'Desa', 'Kecamatan', 'Jakarta Pusat', 'DKI Jakarta', 'Active', '2026-04-18T07:24:49.743Z', '08126013659'),
('CT055', 'Lina Santoso', 'Basic', 'Jl. Random No.55', 'Desa', 'Kecamatan', 'Jakarta Barat', 'DKI Jakarta', 'Active', '2026-03-19T03:13:25.788Z', '0815874692');

-- Generated Transactions (Feb - Apr 2026)
INSERT INTO transactions (id, method, amount, status, timestamp, type, keterangan, city) VALUES
('TRX-CT006-20260419', 'E-Wallet', 'Rp 250.000', 'Verified', '2026-04-18T23:43:22.652Z', 'Tagihan', 'pemasukan', 'Jakarta Barat'),
('TRX-CT007-20260319', 'Transfer Bank', 'Rp 350.000', 'Verified', '2026-03-19T13:24:49.869Z', 'Tagihan', 'pemasukan', 'Jakarta Selatan'),
('TRX-CT007-20260415', 'E-Wallet', 'Rp 350.000', 'Verified', '2026-04-15T13:24:49.869Z', 'Tagihan', 'pemasukan', 'Jakarta Selatan'),
('TRX-CT008-20260406', 'Transfer Bank', 'Rp 500.000', 'Verified', '2026-04-06T08:00:10.547Z', 'Tagihan', 'pemasukan', 'Jakarta Selatan'),
('TRX-CT009-20260405', 'E-Wallet', 'Rp 350.000', 'Verified', '2026-04-05T07:22:37.946Z', 'Tagihan', 'pemasukan', 'Jakarta Timur'),
('TRX-CT010-20260311', 'Transfer Bank', 'Rp 500.000', 'Verified', '2026-03-11T05:34:30.257Z', 'Tagihan', 'pemasukan', 'Jakarta Utara'),
('TRX-CT010-20260418', 'E-Wallet', 'Rp 500.000', 'Verified', '2026-04-18T05:34:30.257Z', 'Tagihan', 'pemasukan', 'Jakarta Utara'),
('TRX-CT011-20260408', 'E-Wallet', 'Rp 250.000', 'Verified', '2026-04-07T20:07:48.579Z', 'Tagihan', 'pemasukan', 'Jakarta Utara'),
('TRX-CT012-20260317', 'E-Wallet', 'Rp 250.000', 'Verified', '2026-03-17T13:42:58.613Z', 'Tagihan', 'pemasukan', 'Jakarta Barat'),
('TRX-CT012-20260413', 'Tunai', 'Rp 250.000', 'Verified', '2026-04-13T13:42:58.613Z', 'Tagihan', 'pemasukan', 'Jakarta Barat'),
('TRX-CT013-20260404', 'Transfer Bank', 'Rp 350.000', 'Verified', '2026-04-04T02:09:58.700Z', 'Tagihan', 'pemasukan', 'Jakarta Barat'),
('TRX-CT014-20260218', 'Transfer Bank', 'Rp 350.000', 'Verified', '2026-02-17T21:59:42.412Z', 'Tagihan', 'pemasukan', 'Bandung'),
('TRX-CT014-20260313', 'E-Wallet', 'Rp 350.000', 'Verified', '2026-03-12T21:59:42.412Z', 'Tagihan', 'pemasukan', 'Bandung'),
('TRX-CT014-20260402', 'Tunai', 'Rp 350.000', 'Verified', '2026-04-01T21:59:42.412Z', 'Tagihan', 'pemasukan', 'Bandung'),
('TRX-CT015-20260320', 'Transfer Bank', 'Rp 500.000', 'Verified', '2026-03-20T06:12:20.522Z', 'Tagihan', 'pemasukan', 'Jakarta Pusat'),
('TRX-CT015-20260401', 'Tunai', 'Rp 500.000', 'Verified', '2026-04-01T06:12:20.522Z', 'Tagihan', 'pemasukan', 'Jakarta Pusat'),
('TRX-CT016-20260306', 'Transfer Bank', 'Rp 250.000', 'Verified', '2026-03-06T01:11:02.922Z', 'Tagihan', 'pemasukan', 'Jakarta Barat'),
('TRX-CT016-20260401', 'E-Wallet', 'Rp 250.000', 'Verified', '2026-04-01T01:11:02.922Z', 'Tagihan', 'pemasukan', 'Jakarta Barat'),
('TRX-CT017-20260405', 'Tunai', 'Rp 500.000', 'Verified', '2026-04-04T23:02:54.527Z', 'Tagihan', 'pemasukan', 'Jakarta Selatan'),
('TRX-CT018-20260211', 'Transfer Bank', 'Rp 250.000', 'Verified', '2026-02-10T18:14:40.020Z', 'Tagihan', 'pemasukan', 'Bandung'),
('TRX-CT018-20260324', 'Tunai', 'Rp 250.000', 'Verified', '2026-03-23T18:14:40.020Z', 'Tagihan', 'pemasukan', 'Bandung'),
('TRX-CT018-20260407', 'Tunai', 'Rp 250.000', 'Verified', '2026-04-06T18:14:40.020Z', 'Tagihan', 'pemasukan', 'Bandung'),
('TRX-CT019-20260302', 'E-Wallet', 'Rp 500.000', 'Verified', '2026-03-02T16:58:45.159Z', 'Tagihan', 'pemasukan', 'Jakarta Pusat'),
('TRX-CT019-20260404', 'Tunai', 'Rp 500.000', 'Verified', '2026-04-04T16:58:45.159Z', 'Tagihan', 'pemasukan', 'Jakarta Pusat'),
('TRX-CT020-20260417', 'E-Wallet', 'Rp 250.000', 'Verified', '2026-04-17T13:58:58.395Z', 'Tagihan', 'pemasukan', 'Jakarta Selatan'),
('TRX-CT021-20260322', 'E-Wallet', 'Rp 350.000', 'Verified', '2026-03-22T11:14:34.260Z', 'Tagihan', 'pemasukan', 'Jakarta Barat'),
('TRX-CT021-20260415', 'Transfer Bank', 'Rp 350.000', 'Verified', '2026-04-15T11:14:34.260Z', 'Tagihan', 'pemasukan', 'Jakarta Barat'),
('TRX-CT022-20260225', 'Transfer Bank', 'Rp 350.000', 'Verified', '2026-02-25T06:22:13.481Z', 'Tagihan', 'pemasukan', 'Jakarta Timur'),
('TRX-CT022-20260303', 'Tunai', 'Rp 350.000', 'Verified', '2026-03-03T06:22:13.481Z', 'Tagihan', 'pemasukan', 'Jakarta Timur'),
('TRX-CT022-20260419', 'Transfer Bank', 'Rp 350.000', 'Verified', '2026-04-19T06:22:13.481Z', 'Tagihan', 'pemasukan', 'Jakarta Timur'),
('TRX-CT023-20260305', 'E-Wallet', 'Rp 350.000', 'Verified', '2026-03-05T14:50:48.569Z', 'Tagihan', 'pemasukan', 'Jakarta Barat'),
('TRX-CT023-20260409', 'Transfer Bank', 'Rp 350.000', 'Verified', '2026-04-09T14:50:48.569Z', 'Tagihan', 'pemasukan', 'Jakarta Barat'),
('TRX-CT024-20260207', 'Tunai', 'Rp 250.000', 'Verified', '2026-02-07T04:11:38.852Z', 'Tagihan', 'pemasukan', 'Jakarta Selatan'),
('TRX-CT024-20260325', 'E-Wallet', 'Rp 250.000', 'Verified', '2026-03-25T04:11:38.852Z', 'Tagihan', 'pemasukan', 'Jakarta Selatan'),
('TRX-CT024-20260407', 'Tunai', 'Rp 250.000', 'Verified', '2026-04-07T04:11:38.852Z', 'Tagihan', 'pemasukan', 'Jakarta Selatan'),
('TRX-CT025-20260322', 'Transfer Bank', 'Rp 250.000', 'Verified', '2026-03-21T22:10:15.885Z', 'Tagihan', 'pemasukan', 'Jakarta Timur'),
('TRX-CT025-20260414', 'E-Wallet', 'Rp 250.000', 'Verified', '2026-04-13T22:10:15.885Z', 'Tagihan', 'pemasukan', 'Jakarta Timur'),
('TRX-CT026-20260321', 'Tunai', 'Rp 350.000', 'Verified', '2026-03-21T02:34:04.192Z', 'Tagihan', 'pemasukan', 'Bandung'),
('TRX-CT026-20260403', 'E-Wallet', 'Rp 350.000', 'Verified', '2026-04-03T02:34:04.192Z', 'Tagihan', 'pemasukan', 'Bandung'),
('TRX-CT027-20260308', 'Tunai', 'Rp 250.000', 'Verified', '2026-03-08T03:56:51.223Z', 'Tagihan', 'pemasukan', 'Jakarta Barat'),
('TRX-CT027-20260404', 'Tunai', 'Rp 250.000', 'Verified', '2026-04-04T03:56:51.223Z', 'Tagihan', 'pemasukan', 'Jakarta Barat'),
('TRX-CT028-20260417', 'Tunai', 'Rp 250.000', 'Verified', '2026-04-17T15:51:50.553Z', 'Tagihan', 'pemasukan', 'Surabaya'),
('TRX-CT029-20260323', 'E-Wallet', 'Rp 500.000', 'Verified', '2026-03-23T04:06:10.157Z', 'Tagihan', 'pemasukan', 'Jakarta Pusat'),
('TRX-CT029-20260411', 'E-Wallet', 'Rp 500.000', 'Verified', '2026-04-11T04:06:10.157Z', 'Tagihan', 'pemasukan', 'Jakarta Pusat'),
('TRX-CT030-20260208', 'Transfer Bank', 'Rp 250.000', 'Verified', '2026-02-07T23:42:40.715Z', 'Tagihan', 'pemasukan', 'Bandung'),
('TRX-CT030-20260301', 'E-Wallet', 'Rp 250.000', 'Verified', '2026-02-28T23:42:40.715Z', 'Tagihan', 'pemasukan', 'Bandung'),
('TRX-CT030-20260407', 'Transfer Bank', 'Rp 250.000', 'Verified', '2026-04-06T23:42:40.715Z', 'Tagihan', 'pemasukan', 'Bandung'),
('TRX-CT031-20260224', 'Transfer Bank', 'Rp 250.000', 'Verified', '2026-02-24T12:38:07.209Z', 'Tagihan', 'pemasukan', 'Jakarta Utara'),
('TRX-CT031-20260320', 'E-Wallet', 'Rp 250.000', 'Verified', '2026-03-20T12:38:07.209Z', 'Tagihan', 'pemasukan', 'Jakarta Utara'),
('TRX-CT031-20260410', 'Transfer Bank', 'Rp 250.000', 'Verified', '2026-04-10T12:38:07.209Z', 'Tagihan', 'pemasukan', 'Jakarta Utara'),
('TRX-CT032-20260418', 'Tunai', 'Rp 500.000', 'Verified', '2026-04-18T00:42:39.315Z', 'Tagihan', 'pemasukan', 'Surabaya'),
('TRX-CT033-20260214', 'Tunai', 'Rp 250.000', 'Verified', '2026-02-14T06:24:37.354Z', 'Tagihan', 'pemasukan', 'Surabaya'),
('TRX-CT033-20260316', 'E-Wallet', 'Rp 250.000', 'Verified', '2026-03-16T06:24:37.354Z', 'Tagihan', 'pemasukan', 'Surabaya'),
('TRX-CT033-20260417', 'Transfer Bank', 'Rp 250.000', 'Verified', '2026-04-17T06:24:37.354Z', 'Tagihan', 'pemasukan', 'Surabaya'),
('TRX-CT034-20260217', 'Transfer Bank', 'Rp 350.000', 'Verified', '2026-02-17T08:59:05.812Z', 'Tagihan', 'pemasukan', 'Bandung'),
('TRX-CT034-20260316', 'Tunai', 'Rp 350.000', 'Verified', '2026-03-16T08:59:05.812Z', 'Tagihan', 'pemasukan', 'Bandung'),
('TRX-CT034-20260404', 'E-Wallet', 'Rp 350.000', 'Verified', '2026-04-04T08:59:05.812Z', 'Tagihan', 'pemasukan', 'Bandung'),
('TRX-CT035-20260224', 'Tunai', 'Rp 250.000', 'Verified', '2026-02-24T11:33:31.528Z', 'Tagihan', 'pemasukan', 'Jakarta Selatan'),
('TRX-CT035-20260317', 'Transfer Bank', 'Rp 250.000', 'Verified', '2026-03-17T11:33:31.528Z', 'Tagihan', 'pemasukan', 'Jakarta Selatan'),
('TRX-CT035-20260402', 'E-Wallet', 'Rp 250.000', 'Verified', '2026-04-02T11:33:31.528Z', 'Tagihan', 'pemasukan', 'Jakarta Selatan'),
('TRX-CT036-20260401', 'Tunai', 'Rp 350.000', 'Verified', '2026-04-01T12:53:35.549Z', 'Tagihan', 'pemasukan', 'Jakarta Barat'),
('TRX-CT037-20260321', 'Transfer Bank', 'Rp 350.000', 'Verified', '2026-03-21T09:34:31.862Z', 'Tagihan', 'pemasukan', 'Bandung'),
('TRX-CT037-20260420', 'Transfer Bank', 'Rp 350.000', 'Verified', '2026-04-20T09:34:31.862Z', 'Tagihan', 'pemasukan', 'Bandung'),
('TRX-CT038-20260324', 'E-Wallet', 'Rp 350.000', 'Verified', '2026-03-24T09:37:07.098Z', 'Tagihan', 'pemasukan', 'Jakarta Barat'),
('TRX-CT038-20260417', 'Tunai', 'Rp 350.000', 'Verified', '2026-04-17T09:37:07.098Z', 'Tagihan', 'pemasukan', 'Jakarta Barat'),
('TRX-CT039-20260421', 'Transfer Bank', 'Rp 500.000', 'Verified', '2026-04-21T15:47:45.903Z', 'Tagihan', 'pemasukan', 'Jakarta Barat'),
('TRX-CT040-20260415', 'E-Wallet', 'Rp 250.000', 'Verified', '2026-04-14T21:56:42.511Z', 'Tagihan', 'pemasukan', 'Jakarta Selatan'),
('TRX-CT041-20260205', 'Tunai', 'Rp 500.000', 'Verified', '2026-02-04T18:07:22.659Z', 'Tagihan', 'pemasukan', 'Jakarta Utara'),
('TRX-CT041-20260304', 'E-Wallet', 'Rp 500.000', 'Verified', '2026-03-03T18:07:22.659Z', 'Tagihan', 'pemasukan', 'Jakarta Utara'),
('TRX-CT041-20260424', 'E-Wallet', 'Rp 500.000', 'Verified', '2026-04-23T18:07:22.659Z', 'Tagihan', 'pemasukan', 'Jakarta Utara'),
('TRX-CT042-20260313', 'Transfer Bank', 'Rp 250.000', 'Verified', '2026-03-12T19:28:16.548Z', 'Tagihan', 'pemasukan', 'Jakarta Timur'),
('TRX-CT042-20260419', 'E-Wallet', 'Rp 250.000', 'Verified', '2026-04-18T19:28:16.548Z', 'Tagihan', 'pemasukan', 'Jakarta Timur'),
('TRX-CT043-20260422', 'Tunai', 'Rp 500.000', 'Verified', '2026-04-22T09:53:34.461Z', 'Tagihan', 'pemasukan', 'Jakarta Pusat'),
('TRX-CT044-20260303', 'E-Wallet', 'Rp 350.000', 'Verified', '2026-03-03T08:49:47.687Z', 'Tagihan', 'pemasukan', 'Jakarta Utara'),
('TRX-CT044-20260416', 'E-Wallet', 'Rp 350.000', 'Verified', '2026-04-16T08:49:47.687Z', 'Tagihan', 'pemasukan', 'Jakarta Utara'),
('TRX-CT045-20260224', 'E-Wallet', 'Rp 250.000', 'Verified', '2026-02-24T13:56:06.392Z', 'Tagihan', 'pemasukan', 'Jakarta Pusat'),
('TRX-CT045-20260307', 'E-Wallet', 'Rp 250.000', 'Verified', '2026-03-07T13:56:06.392Z', 'Tagihan', 'pemasukan', 'Jakarta Pusat'),
('TRX-CT045-20260408', 'Tunai', 'Rp 250.000', 'Verified', '2026-04-08T13:56:06.392Z', 'Tagihan', 'pemasukan', 'Jakarta Pusat'),
('TRX-CT046-20260407', 'Tunai', 'Rp 350.000', 'Verified', '2026-04-06T23:31:04.502Z', 'Tagihan', 'pemasukan', 'Bandung'),
('TRX-CT047-20260318', 'E-Wallet', 'Rp 350.000', 'Verified', '2026-03-18T10:42:52.182Z', 'Tagihan', 'pemasukan', 'Jakarta Pusat'),
('TRX-CT047-20260422', 'Transfer Bank', 'Rp 350.000', 'Verified', '2026-04-22T10:42:52.182Z', 'Tagihan', 'pemasukan', 'Jakarta Pusat'),
('TRX-CT048-20260312', 'Tunai', 'Rp 350.000', 'Verified', '2026-03-11T18:18:49.981Z', 'Tagihan', 'pemasukan', 'Jakarta Barat'),
('TRX-CT048-20260408', 'Transfer Bank', 'Rp 350.000', 'Verified', '2026-04-07T18:18:49.981Z', 'Tagihan', 'pemasukan', 'Jakarta Barat'),
('TRX-CT049-20260220', 'E-Wallet', 'Rp 500.000', 'Verified', '2026-02-20T13:42:56.454Z', 'Tagihan', 'pemasukan', 'Jakarta Utara'),
('TRX-CT049-20260309', 'E-Wallet', 'Rp 500.000', 'Verified', '2026-03-09T13:42:56.454Z', 'Tagihan', 'pemasukan', 'Jakarta Utara'),
('TRX-CT049-20260421', 'Tunai', 'Rp 500.000', 'Verified', '2026-04-21T13:42:56.454Z', 'Tagihan', 'pemasukan', 'Jakarta Utara'),
('TRX-CT050-20260217', 'Transfer Bank', 'Rp 350.000', 'Verified', '2026-02-17T07:58:02.005Z', 'Tagihan', 'pemasukan', 'Jakarta Utara'),
('TRX-CT050-20260315', 'Tunai', 'Rp 350.000', 'Verified', '2026-03-15T07:58:02.005Z', 'Tagihan', 'pemasukan', 'Jakarta Utara'),
('TRX-CT050-20260415', 'Tunai', 'Rp 350.000', 'Verified', '2026-04-15T07:58:02.005Z', 'Tagihan', 'pemasukan', 'Jakarta Utara'),
('TRX-CT051-20260214', 'Tunai', 'Rp 350.000', 'Verified', '2026-02-14T04:17:24.382Z', 'Tagihan', 'pemasukan', 'Jakarta Selatan'),
('TRX-CT051-20260322', 'Transfer Bank', 'Rp 350.000', 'Verified', '2026-03-22T04:17:24.382Z', 'Tagihan', 'pemasukan', 'Jakarta Selatan'),
('TRX-CT051-20260419', 'Tunai', 'Rp 350.000', 'Verified', '2026-04-19T04:17:24.382Z', 'Tagihan', 'pemasukan', 'Jakarta Selatan'),
('TRX-CT052-20260408', 'Transfer Bank', 'Rp 350.000', 'Verified', '2026-04-07T20:06:35.104Z', 'Tagihan', 'pemasukan', 'Jakarta Selatan'),
('TRX-CT053-20260201', 'Tunai', 'Rp 250.000', 'Verified', '2026-01-31T17:59:29.811Z', 'Tagihan', 'pemasukan', 'Jakarta Utara'),
('TRX-CT053-20260310', 'Transfer Bank', 'Rp 250.000', 'Verified', '2026-03-09T17:59:29.811Z', 'Tagihan', 'pemasukan', 'Jakarta Utara'),
('TRX-CT053-20260417', 'Tunai', 'Rp 250.000', 'Verified', '2026-04-16T17:59:29.811Z', 'Tagihan', 'pemasukan', 'Jakarta Utara'),
('TRX-CT054-20260401', 'Tunai', 'Rp 250.000', 'Verified', '2026-04-01T07:24:49.743Z', 'Tagihan', 'pemasukan', 'Jakarta Pusat'),
('TRX-CT055-20260310', 'Transfer Bank', 'Rp 250.000', 'Verified', '2026-03-10T03:13:25.788Z', 'Tagihan', 'pemasukan', 'Jakarta Barat'),
('TRX-CT055-20260416', 'Tunai', 'Rp 250.000', 'Verified', '2026-04-16T03:13:25.788Z', 'Tagihan', 'pemasukan', 'Jakarta Barat');

-- Generated Expenses
INSERT INTO transactions (id, method, amount, status, timestamp, type, keterangan, city) VALUES
('OUT-5-202602', 'Transfer Bank', 'Rp 400.000', 'Verified', '2026-02-10T10:00:00.000Z', 'Maintenis', 'pengeluaran', 'Jakarta Barat'),
('OUT-6-202602', 'Credit Card', 'Rp 600.000', 'Verified', '2026-02-11T10:00:00.000Z', 'Maintenis', 'pengeluaran', 'Surabaya'),
('OUT-7-202602', 'Credit Card', 'Rp 900.000', 'Verified', '2026-02-12T10:00:00.000Z', 'Maintenis', 'pengeluaran', 'Jakarta Barat'),
('OUT-8-202602', 'Credit Card', 'Rp 1000.000', 'Verified', '2026-02-13T10:00:00.000Z', 'Maintenis', 'pengeluaran', 'Surabaya'),
('OUT-9-202602', 'Transfer Bank', 'Rp 700.000', 'Verified', '2026-02-14T10:00:00.000Z', 'Hardware', 'pengeluaran', 'Jakarta Barat'),
('OUT-10-202603', 'Credit Card', 'Rp 500.000', 'Verified', '2026-03-10T10:00:00.000Z', 'Utilitas', 'pengeluaran', 'Jakarta Barat'),
('OUT-11-202603', 'Credit Card', 'Rp 400.000', 'Verified', '2026-03-11T10:00:00.000Z', 'Hardware', 'pengeluaran', 'Bandung'),
('OUT-12-202603', 'Transfer Bank', 'Rp 600.000', 'Verified', '2026-03-12T10:00:00.000Z', 'Sewa', 'pengeluaran', 'Jakarta Barat'),
('OUT-13-202603', 'Credit Card', 'Rp 700.000', 'Verified', '2026-03-13T10:00:00.000Z', 'Utilitas', 'pengeluaran', 'Jakarta Barat'),
('OUT-14-202603', 'Credit Card', 'Rp 400.000', 'Verified', '2026-03-14T10:00:00.000Z', 'Hardware', 'pengeluaran', 'Bandung'),
('OUT-15-202604', 'Transfer Bank', 'Rp 200.000', 'Verified', '2026-04-10T10:00:00.000Z', 'Hardware', 'pengeluaran', 'Surabaya'),
('OUT-16-202604', 'Transfer Bank', 'Rp 600.000', 'Verified', '2026-04-11T10:00:00.000Z', 'Utilitas', 'pengeluaran', 'Surabaya'),
('OUT-17-202604', 'Transfer Bank', 'Rp 200.000', 'Verified', '2026-04-12T10:00:00.000Z', 'Maintenis', 'pengeluaran', 'Jakarta Utara'),
('OUT-18-202604', 'Credit Card', 'Rp 600.000', 'Verified', '2026-04-13T10:00:00.000Z', 'Maintenis', 'pengeluaran', 'Jakarta Utara'),
('OUT-19-202604', 'Transfer Bank', 'Rp 700.000', 'Verified', '2026-04-14T10:00:00.000Z', 'Utilitas', 'pengeluaran', 'Jakarta Timur');


-- 1. Sinkronisasi data yang belum ada di expenses
INSERT INTO expenses (category, amount, date, description, city)
SELECT 
    type,
    CAST(REPLACE(REPLACE(REPLACE(amount, 'Rp ', ''), '.', ''), ',', '') AS NUMERIC) as num_amount,
    timestamp::date as tx_date,
    id,
    city
FROM transactions t
WHERE t.keterangan = 'pengeluaran'
  AND NOT EXISTS (
      SELECT 1 FROM expenses e 
      WHERE e.amount = CAST(REPLACE(REPLACE(REPLACE(t.amount, 'Rp ', ''), '.', ''), ',', '') AS NUMERIC)
        AND e.date = t.timestamp::date
        AND e.city = t.city
  );

-- 2. Pembuatan Trigger
CREATE OR REPLACE FUNCTION sync_transaction_to_expense()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.keterangan = 'pengeluaran' THEN
        INSERT INTO expenses (category, amount, date, description, city)
        VALUES (
            NEW.type,
            CAST(REPLACE(REPLACE(REPLACE(NEW.amount, 'Rp ', ''), '.', ''), ',', '') AS NUMERIC),
            NEW.timestamp::date,
            NEW.id,
            NEW.city
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_expense ON transactions;

CREATE TRIGGER trg_sync_expense
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION sync_transaction_to_expense();
