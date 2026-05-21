"use server";
import { logger } from '@/lib/logger';

import { getCustomers, getInactiveCust, getCustomerGrowthTrend } from '@/actions/customers';
import { getServiceTiers } from '@/actions/tiers';
import { getTransactions, getExpenses, getRevenueGrowthTrend } from '@/actions/transactions';
import { query } from '@/lib/db';
import { unstable_cache } from 'next/cache';

// =============================================================================
// getDashboardSummary — Membaca dari dashboard_summary_mv (sangat cepat < 5ms)
// Cache TTL: 60 detik — data refresh harian via instrumentation.ts
// =============================================================================
export const getDashboardSummary = unstable_cache(
  async () => {
    try {
      const res = await query(`
        SELECT
          month,
          month_index,
          revenue,
          expenses,
          net_profit,
          active_customers,
          new_customers,
          churned_count,
          arpu,
          cac,
          churn_rate,
          last_refreshed_at
        FROM dashboard_summary_mv
        ORDER BY month ASC
      `);

      if (res.rows.length === 0) return null;

      return res.rows.map(r => ({
        month:           r.month as string,
        month_index:     Number(r.month_index),
        revenue:         Number(r.revenue),
        expenses:        Number(r.expenses),
        net_profit:      Number(r.net_profit),
        active_customers: Number(r.active_customers),
        new_customers:   Number(r.new_customers),
        churned_count:   Number(r.churned_count),
        arpu:            Number(r.arpu),
        cac:             Number(r.cac),
        churn_rate:      Number(r.churn_rate),
        last_refreshed_at: r.last_refreshed_at,
      }));
    } catch (e) {
      logger.error({ message: "DB Error: getDashboardSummary (MV not ready, will fallback)", error: e, path: "action" });
      return null;
    }
  },
  ['dashboard_summary_mv'],
  { revalidate: 60, tags: ['dashboard'] }
);

// =============================================================================
// getDashboardData — Orchestrator utama untuk halaman Dashboard
// Strategi: Coba baca dari MV dulu (< 5ms). Jika MV belum ada / error,
// fallback ke query lama yang sudah terbukti bekerja.
// =============================================================================
export async function getDashboardData() {
  const [
    summaryData,
    customersData,
    tiers,
    transactions,
    inactiveCust,
    customerGrowthTrend,
    expenses,
    trendData
  ] = await Promise.all([
    getDashboardSummary(),
    getCustomers(1, 1000),
    getServiceTiers(),
    getTransactions(13),   // Last 13 months: current month + 12 for trend charts
    getInactiveCust(),
    getCustomerGrowthTrend(),
    getExpenses(),
    getRevenueGrowthTrend()
  ]);

  return {
    // MV data (pre-calculated KPIs) — bisa null jika MV belum dijalankan
    summaryData,
    // Raw data untuk kompatibilitas dengan komponen yang sudah ada
    customers: customersData.customers,
    tiers,
    transactions,
    inactiveCust,
    customerGrowthTrend,
    expenses,
    trendData
  };
}

// =============================================================================
// refreshDashboardMV — Dipanggil oleh instrumentation.ts saat startup & cron
// =============================================================================
export async function refreshDashboardMV() {
  try {
    // CONCURRENTLY agar tidak lock tabel saat refresh (non-blocking)
    await query('REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_summary_mv');
    if (process.env.NODE_ENV === 'development') console.log('[MV Refresh] dashboard_summary_mv refreshed successfully');
    return { success: true };
  } catch (e) {
    // Fallback: non-concurrent jika unique index belum ada atau data kosong
    try {
      await query('REFRESH MATERIALIZED VIEW dashboard_summary_mv');
      if (process.env.NODE_ENV === 'development') console.log('[MV Refresh] dashboard_summary_mv refreshed (non-concurrent fallback)');
      return { success: true };
    } catch (e2) {
      logger.error({ message: "[MV Refresh] dashboard_summary_mv failed:", error: e2, path: "action" });
      return { success: false, error: String(e2) };
    }
  }
}
