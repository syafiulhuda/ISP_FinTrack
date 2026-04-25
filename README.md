# 🚀 ISP-FinTrack: Enterprise Financial Intelligence

![ISP-FinTrack Dashboard](https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2000)

**ISP-FinTrack** is a high-performance, database-driven financial dashboard designed for Internet Service Providers. It provides real-time insights into profitability, regional revenue distribution, inventory health, and automated financial processing.

---

## ✨ Premium Features

- **📊 Growth Analytics**: Beautifully animated area charts for tracking ARPU and user growth trends.
- **🗺️ Regional Analysis**: Granular drill-down of profitability per Province, City, and Kelurahan.
- **📦 Inventory Roster**: Real-time tracking of hardware (ONT, OLT, ODP) with automatic condition monitoring.
- **📄 OCR Verification**: Integrated system for processing and verifying financial slips/receipts.
- **⚡ Real-time Data**: Integrated with TanStack Query for 5-second interval database synchronization.
- **⌨️ Advanced Pagination**: High-density data tables with typable page navigation for massive datasets.
- **🌗 Responsive UI**: Premium glassmorphism design with full Dark Mode support.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **State Management**: [TanStack React Query v5](https://tanstack.com/query/latest)
- **Styling**: Tailwind CSS & Framer Motion
- **Charts**: Recharts
- **Icons**: Lucide React

---

## 🚀 Getting Started

Follow these steps to set up the project locally.

### 1. Prerequisites
- **Node.js** (v18.x or later)
- **PostgreSQL** (v14.x or later)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/syafiulhuda/ISP_FinTrack.git
cd ISP_FinTrack

# Install dependencies
npm install
```

### 3. Database Setup
1. Create a new PostgreSQL database (e.g., `fintrack_db`).
2. Run the provided [**`seed.sql`**](seed.sql) script in your SQL editor or via terminal:
```bash
psql -U your_username -d fintrack_db -f seed.sql
```
*This will create all tables (Admin, Customers, Transactions, Inventory, etc.) and populate them with sample data.*

### 4. Environment Configuration
Copy `.env.example` to `.env.local` and update your database credentials:
```bash
cp .env.example .env.local
```
Update your `.env.local`:
```env
DATABASE_USER=your_postgres_user
DATABASE_HOST=localhost
DATABASE_NAME=fintrack_db
DATABASE_PASSWORD=your_password
DATABASE_PORT=5432
```

### 5. Launch the App
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Access Credentials
You can use the default administrator account to explore the dashboard:
- **Email**: `admin@company.com`
- **Password**: `admin`

---

## 📁 Project Structure
- `/src/app`: Next.js pages and layouts.
- `/src/actions`: Server Actions for database operations.
- `/src/components`: Reusable UI components.
- `/src/lib`: Shared utilities and DB configuration.
- `/scripts`: MJS scripts for automated DB tasks.

---

## 📄 License
Custom Enterprise License - Created by [Syafiul Huda](https://github.com/syafiulhuda) for Advanced ISP Financial Management.
