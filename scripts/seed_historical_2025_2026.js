const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  user: process.env.DATABASE_USER,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: process.env.DATABASE_PORT || 5432,
});

const CITIES = ['Jakarta Selatan', 'Jakarta Pusat', 'Jakarta Barat', 'Jakarta Timur', 'Jakarta Utara', 'Bandung', 'Surabaya', 'Makassar'];
const METHODS = ['Transfer Bank', 'E-Wallet', 'Tunai', 'Credit Card'];
const NAMES = ['Budi', 'Siti', 'Andi', 'Rina', 'Joko', 'Oki', 'Toni', 'Kiki', 'Bayu', 'Mira', 'Yudi', 'Iwan', 'Dewi', 'Fajar', 'Cahyo', 'Zainal', 'Lina', 'Eka', 'Citra', 'Putra', 'Agus', 'Udin', 'Ayu', 'Wawan', 'Gita', 'Nina', 'Hendra', 'Rudi', 'Siska', 'Diana', 'Bambang', 'Rahmat', 'Nia', 'Tika', 'Rizal', 'Arif', 'Doni', 'Sandi', 'Mega', 'Tari'];
const LAST_NAMES = ['Santoso', 'Aminah', 'Darmawan', 'Wijaya', 'Susilo', 'Kurniawan', 'Mulyana', 'Purnomo', 'Setiawan', 'Pratama', 'Simanjuntak', 'Gunawan', 'Hidayat', 'Lubis', 'Sari', 'Nugroho', 'Saputra', 'Siregar', 'Wahyudi', 'Sutanto', 'Pangestu', 'Kusuma', 'Nasution', 'Batubara', 'Hutagalung', 'Sihombing', 'Tambunan', 'Sinaga', 'Panjaitan', 'Sitorus'];

function getProvince(city) {
  const mapping = {
    'Surabaya': 'Jawa Timur',
    'Makassar': 'Sulawesi Selatan',
    'Bandung': 'Jawa Barat',
    'Jakarta Barat': 'DKI Jakarta',
    'Jakarta Pusat': 'DKI Jakarta',
    'Jakarta Utara': 'DKI Jakarta',
    'Jakarta Selatan': 'DKI Jakarta',
    'Jakarta Timur': 'DKI Jakarta'
  };
  return mapping[city] || 'Unknown';
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateName() {
  return `${getRandomItem(NAMES)} ${getRandomItem(LAST_NAMES)}`;
}

// Generate date between start and end
function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('🌱 Starting Historical Seed (2025-06 to 2026-04) with EXACTLY 1000 customers...');

    // 1. CLEANUP
    console.log('🧹 Cleaning existing data...');
    await client.query(`
      TRUNCATE TABLE transactions CASCADE;
      TRUNCATE TABLE expenses CASCADE;
      TRUNCATE TABLE customers CASCADE;
      TRUNCATE TABLE asset_roster CASCADE;
      TRUNCATE TABLE stock_asset_roster CASCADE;
      TRUNCATE TABLE service_tiers CASCADE;
      TRUNCATE TABLE admin CASCADE;
      TRUNCATE TABLE notifications CASCADE;
      TRUNCATE TABLE maintenance_history CASCADE;
      TRUNCATE TABLE invoices CASCADE;
      
      ALTER SEQUENCE admin_id_seq RESTART WITH 1;
      ALTER SEQUENCE asset_roster_id_seq RESTART WITH 1;
      ALTER SEQUENCE expenses_id_seq RESTART WITH 1;
      ALTER SEQUENCE notifications_id_seq RESTART WITH 1;
      ALTER SEQUENCE service_tiers_id_seq RESTART WITH 1;
      ALTER SEQUENCE maintenance_history_id_seq RESTART WITH 1;
    `);

    // 2. MASTER DATA
    console.log('📦 Inserting Master Data...');
    
    // Admin
    await client.query(`
      INSERT INTO admin (nama, email, password, role, department, image, nickname) VALUES 
      ('Super Admin', 'admin@ispfintrack.local', 'hashed_pass', 'System Administrator', 'IT & Operations', '/avatars/admin.png', 'Admin');
    `);

    // Tiers
    await client.query(`
      INSERT INTO service_tiers (name, speed, unit, price, fup, type, icon) VALUES 
      ('Basic', '20', 'Mbps', 'Rp 250.000', '300 GB', 'Home', 'zap'),
      ('Standard', '50', 'Mbps', 'Rp 350.000', 'Unlimited', 'Home', 'rocket'),
      ('Premium', '100', 'Mbps', 'Rp 500.000', 'Unlimited', 'Business', 'server');
    `);

    const serviceTiers = {
      'Basic': 'Rp 250.000',
      'Standard': 'Rp 350.000',
      'Premium': 'Rp 500.000'
    };

    // Backbone Assets (OLT, ODP, Servers)
    const backboneAssets = [
      ['OLT-001', '00:1A:2B:3C:4D:5E', 'OLT', 'Backbone - Jakarta Pusat', 'Good', -6.2088, 106.8456, 'Online', 'Dimiliki'],
      ['ODP-001', '00:1A:2B:3C:4D:5F', 'ODP', 'Backbone - Jakarta Selatan', 'Good', -6.2100, 106.8500, 'Online', 'Dimiliki'],
      ['SRV-001', '00:1A:2B:3C:4D:61', 'Server', 'Backbone - Jakarta Barat', 'Good', -6.2000, 106.8400, 'Online', 'Dimiliki'],
      ['OLT-002', '00:1A:2B:3C:4D:62', 'OLT', 'Backbone - Bandung', 'Good', -6.9147, 107.6098, 'Online', 'Dimiliki'],
      ['ODP-002', '00:1A:2B:3C:4D:63', 'ODP', 'Backbone - Bandung', 'Good', -6.8726, 107.5358, 'Online', 'Sewa']
    ];

    for (const asset of backboneAssets) {
      await client.query(`
        INSERT INTO asset_roster (sn, mac, type, location, condition, latitude, longitude, status, kepemilikan)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, asset);
    }

    // 3. GENERATE CUSTOMERS & TRANSACTIONS (June 2025 - April 2026)
    console.log('👥 Generating 1000 Customers, ONTs and Transactions (This might take a minute)...');
    
    let currentCustomerId = 1;
    const customers = [];
    const onts = [];

    // The sum of newCust is exactly 1000
    const months = [
      { year: 2025, month: 6, label: '2025-06', newCust: 50 },
      { year: 2025, month: 7, label: '2025-07', newCust: 60 },
      { year: 2025, month: 8, label: '2025-08', newCust: 70 },
      { year: 2025, month: 9, label: '2025-09', newCust: 80 },
      { year: 2025, month: 10, label: '2025-10', newCust: 90 },
      { year: 2025, month: 11, label: '2025-11', newCust: 100 },
      { year: 2025, month: 12, label: '2025-12', newCust: 110 },
      { year: 2026, month: 1, label: '2026-01', newCust: 115 },
      { year: 2026, month: 2, label: '2026-02', newCust: 115 },
      { year: 2026, month: 3, label: '2026-03', newCust: 105 },
      { year: 2026, month: 4, label: '2026-04', newCust: 105 },
    ];

    for (let i = 0; i < months.length; i++) {
      const monthData = months[i];
      const startOfMonth = new Date(Date.UTC(monthData.year, monthData.month - 1, 1));
      const endOfMonth = new Date(Date.UTC(monthData.year, monthData.month, 0));
      
      // Generate new customers for this month
      for (let j = 0; j < monthData.newCust; j++) {
        const id = `CT${String(currentCustomerId).padStart(4, '0')}`;
        currentCustomerId++;
        
        const joinDate = getRandomDate(startOfMonth, endOfMonth);
        const serviceKeys = Object.keys(serviceTiers);
        const service = getRandomItem(serviceKeys);
        
        // 5% Churn logic (Customer will become inactive 3 months after joining)
        let inactiveMonth = null;
        if (Math.random() < 0.05 && i + 3 < months.length) {
           inactiveMonth = months[i + 3].label;
        }

        const city = getRandomItem(CITIES);
        customers.push({
          id,
          name: generateName(),
          service,
          address: `Jl. ${getRandomItem(['Merdeka', 'Sudirman', 'Thamrin', 'Pahlawan', 'Gatot Subroto'])} No.${getRandomInt(1, 200)}`,
          village: 'Desa',
          district: 'Kecamatan',
          city: city,
          province: getProvince(city),
          status: inactiveMonth && monthData.label >= inactiveMonth ? 'Inactive' : 'Active',
          createdAt: joinDate.toISOString(),
          no_telp: `081${getRandomInt(10000000, 99999999)}`,
          joinDay: joinDate.getUTCDate(),
          inactiveMonth
        });

        // Prepare an ONT asset for this customer
        const ontMac = `00:1A:2B:${String(getRandomInt(0, 255)).padStart(2, '0')}:${String(getRandomInt(0, 255)).padStart(2, '0')}:${String(getRandomInt(0, 255)).padStart(2, '0')}`;
        onts.push({
          sn: `ONT-${id}`,
          mac: ontMac,
          type: 'ONT',
          location: `Client ${id} - ${city}`,
          condition: 'Good',
          latitude: -6.2000 + (Math.random() * 0.1 - 0.05),
          longitude: 106.8400 + (Math.random() * 0.1 - 0.05),
          status: 'Online',
          kepemilikan: 'Sewa' // Model sewa ke client
        });
      }

      // Track active customers for proportionate expenses scaling
      let activeCustomersThisMonth = 0;

      // Generate Transactions for all customers up to this month
      for (const cust of customers) {
        const joinMonthLabel = `${cust.createdAt.substring(0, 7)}`;
        
        // Skip if they haven't joined yet
        if (monthData.label < joinMonthLabel) continue;

        // Skip if they are inactive by this month
        if (cust.inactiveMonth && monthData.label >= cust.inactiveMonth) {
           // We keep updating status to Inactive as we iterate
           cust.status = 'Inactive';
           continue; 
        }

        activeCustomersThisMonth++;

        // Calculate pay day
        let payDay = cust.joinDay + getRandomInt(0, 3);
        const maxDays = endOfMonth.getUTCDate();
        if (payDay > maxDays) payDay = maxDays;

        const payDateStr = `${monthData.year}-${String(monthData.month).padStart(2, '0')}-${String(payDay).padStart(2, '0')}T10:00:00Z`;
        const trxId = `TRX-${cust.id}-${monthData.year}${String(monthData.month).padStart(2, '0')}${String(payDay).padStart(2, '0')}`;
        const rawAmount = parseInt(serviceTiers[cust.service].replace(/[^0-9]/g, ''), 10);

        await client.query(`
          INSERT INTO transactions (id, method, amount, status, timestamp, type, keterangan, city)
          VALUES ($1, $2, $3, 'Verified', $4, 'Tagihan', 'pemasukan', $5)
        `, [trxId, getRandomItem(METHODS), rawAmount, payDateStr, cust.city]);

      }

      // Proportional Expenses Generation based on Business Logic
      const expenseDate = `${monthData.year}-${String(monthData.month).padStart(2, '0')}-05T09:00:00Z`;
      
      const expenses = [
        { cat: 'Sewa', amt: 5000000 + (activeCustomersThisMonth * 20000), desc: 'Sewa Infrastruktur & Tiang' },
        { cat: 'Utilitas', amt: 2000000 + (activeCustomersThisMonth * 15000), desc: 'Listrik & Bandwidth' },
        { cat: 'Hardware', amt: (monthData.newCust * 400000) + getRandomInt(500, 2000) * 1000, desc: 'Beli Hardware ONT & Kabel' },
        { cat: 'Maintenis', amt: 1000000 + (activeCustomersThisMonth * 10000), desc: 'Maintenance' },
      ];

      for (let k = 0; k < expenses.length; k++) {
        const exp = expenses[k];
        const outId = `OUT-${monthData.year}${String(monthData.month).padStart(2, '0')}-${k}`;
        
        await client.query(`
          INSERT INTO transactions (id, method, amount, status, timestamp, type, keterangan, city)
          VALUES ($1, $2, $3, 'Verified', $4, $5, 'pengeluaran', 'Jakarta Selatan')
        `, [outId, getRandomItem(METHODS), exp.amt, expenseDate, exp.cat]);
        
        // Also insert into expenses table to ensure dashboard metrics have reliable data
        await client.query(`
          INSERT INTO expenses (category, amount, date, description, city)
          VALUES ($1, $2, $3, $4, $5)
        `, [exp.cat, exp.amt, expenseDate, exp.desc, 'Jakarta Selatan']);
      }
    }

    // Bulk Insert Customers
    console.log('Inserting Customers to DB...');
    for (const cust of customers) {
       await client.query(`
         INSERT INTO customers (id, name, service, address, village, district, city, province, status, "createdAt", no_telp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       `, [cust.id, cust.name, cust.service, cust.address, cust.village, cust.district, cust.city, cust.province, cust.status, cust.createdAt, cust.no_telp]);
    }

    // Bulk Insert ONTs
    console.log('Inserting Deployed Asset Roster (ONTs)...');
    let ontBatch = [];
    for (let i = 0; i < onts.length; i++) {
      const ont = onts[i];
      ontBatch.push(client.query(`
        INSERT INTO asset_roster (sn, mac, type, location, condition, latitude, longitude, status, kepemilikan)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [ont.sn, ont.mac, ont.type, ont.location, ont.condition, ont.latitude, ont.longitude, ont.status, ont.kepemilikan]));
      
      if (ontBatch.length >= 100 || i === onts.length - 1) {
        await Promise.all(ontBatch);
        ontBatch = [];
      }
    }

    // 4. SEED STOCK ASSETS (Warehouse)
    console.log('📦 Seeding Stock Assets (Warehouse)...');
    const stockItems = [
      { type: 'ONT', count: 25, model: 'HG6243C' },
      { type: 'OLT', count: 5, model: 'C320' },
      { type: 'Router', count: 12, model: 'CCR1036' },
      { type: 'Server', count: 3, model: 'R740' }
    ];

    const warehouses = [
      { loc: 'Warehouse Main (Jakarta)', lat: -6.2088, lon: 106.8456, prov: 'DKI Jakarta' },
      { loc: 'Warehouse East (Ambon)', lat: -3.6547, lon: 128.1906, prov: 'Maluku' },
      { loc: 'Warehouse South (Bali)', lat: -8.6500, lon: 115.2167, prov: 'Bali' }
    ];

    for (const item of stockItems) {
      for (let j = 0; j < item.count; j++) {
        const wh = getRandomItem(warehouses);
        const sn = `STK-${item.type}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const mac = `AC:BD:${Math.random().toString(16).substring(2, 4)}:${Math.random().toString(16).substring(2, 4)}:00:01`;
        
        await client.query(`
          INSERT INTO stock_asset_roster (sn, mac, type, location, condition, latitude, longitude, status, kepemilikan, province, is_used)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [sn, mac, item.type, wh.loc, 'Good', wh.lat, wh.lon, 'Offline', 'Dimiliki', wh.prov, false]);
      }
    }

    // 4. TRIGGER ASSET NOTIFICATION & HARGA BELI
    console.log('🔔 Simulating Asset Issues and Calculating Harga Beli...');
    await client.query(`
      UPDATE asset_roster SET condition = 'Warning', tanggal_perubahan = '2026-03-15T10:00:00Z' WHERE sn = 'ONT-CT0050';
      UPDATE asset_roster SET condition = 'Broken', tanggal_perubahan = '2026-04-10T14:00:00Z' WHERE sn = 'SRV-001';
    `);

    // Calculate harga_beli for asset_roster based on transactions where keterangan = 'pengeluaran' AND type = 'Hardware'
    await client.query(`
      WITH hw_expense AS (
        SELECT COALESCE(SUM(amount::numeric), 0) as total_hw
        FROM transactions
        WHERE keterangan = 'pengeluaran' AND type = 'Hardware'
      ),
      asset_count AS (
        SELECT COUNT(*) as total_assets
        FROM asset_roster
      )
      UPDATE asset_roster
      SET harga_beli = (SELECT total_hw FROM hw_expense) / (SELECT NULLIF(total_assets, 0) FROM asset_count);
    `);

    await client.query('COMMIT');
    console.log('✅ Historical Seeding Complete! Seeded EXACTLY 1000 distinct customers from 2025-06 to 2026-04.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding data:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
