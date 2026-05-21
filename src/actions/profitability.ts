"use server";
import { logger } from '@/lib/logger';

import { getCustomers } from '@/actions/customers';
import { getServiceTiers } from '@/actions/tiers';
import { getExpenses, getTransactions, getTransactionDateRange } from '@/actions/transactions';
import { query } from '@/lib/db';
import { unstable_cache } from 'next/cache';

// =============================================================================
// getProfitabilitySummary — Baca dari profitability_summary_mv (< 5ms)
// Pre-kalkulasi: revenue, expenses, gross_profit, net_profit, ebitda_margin,
//                revenue_trend_pct, net_profit_trend_pct per bulan
// Cache TTL: 60 detik
// =============================================================================
export const getProfitabilitySummary = unstable_cache(
  async () => {
    try {
      const res = await query(`
        SELECT
          month,
          revenue,
          expenses,
          direct_costs,
          gross_profit,
          net_profit,
          ebitda_margin,
          revenue_trend_pct,
          net_profit_trend_pct,
          last_refreshed_at
        FROM profitability_summary_mv
        ORDER BY month ASC
      `);

      if (res.rows.length === 0) return null;

      return res.rows.map(r => ({
        month:               r.month as string,
        revenue:             Number(r.revenue),
        expenses:            Number(r.expenses),
        direct_costs:        Number(r.direct_costs),
        gross_profit:        Number(r.gross_profit),
        net_profit:          Number(r.net_profit),
        ebitda_margin:       Number(r.ebitda_margin),
        revenue_trend_pct:   r.revenue_trend_pct !== null ? Number(r.revenue_trend_pct) : null,
        net_profit_trend_pct: r.net_profit_trend_pct !== null ? Number(r.net_profit_trend_pct) : null,
        last_refreshed_at:   r.last_refreshed_at,
      }));
    } catch (e) {
      logger.error({ message: "DB Error: getProfitabilitySummary (MV not ready, will fallback)", error: e, path: "action" });
      return null;
    }
  },
  ['profitability_summary_mv'],
  { revalidate: 60, tags: ['profitability'] }
);

/**
 * getProfitabilityData — Orchestrator untuk halaman Profitability
 *
 * Strategi dual-layer:
 * 1. Baca dari profitability_summary_mv (< 5ms) untuk KPI cards + tren chart
 * 2. Tetap load transactions & customers untuk filter date-range interaktif
 *    yang tidak bisa di-cache di MV (user bisa pilih tanggal bebas)
 *
 * getTransactions() returns only the last 24 months of verified transactions
 * to avoid fetching the entire table on every load.
 */
export async function getProfitabilityData() {
  const [
    summaryData,
    customersData,
    serviceTiers,
    expenses,
    transactions,
    dateRange,
  ] = await Promise.all([
    getProfitabilitySummary(),   // Fast: dari MV
    getCustomers(1, 1000),
    getServiceTiers(),
    getExpenses(),
    getTransactions(24),         // Last 24 months: covers full profitability date-range picker
    getTransactionDateRange(),
  ]);

  return {
    // MV data (pre-calculated monthly summaries) — bisa null jika MV belum dijalankan
    summaryData,
    // Raw data untuk filter interaktif yang sudah ada
    customers: customersData.customers,
    serviceTiers,
    expenses,
    transactions,
    dateRange,
  };
}

// =============================================================================
// refreshProfitabilityMV — Dipanggil oleh instrumentation.ts
// =============================================================================
export async function refreshProfitabilityMV() {
  try {
    await query('REFRESH MATERIALIZED VIEW CONCURRENTLY profitability_summary_mv');
    if (process.env.NODE_ENV === 'development') console.log('[MV Refresh] profitability_summary_mv refreshed successfully');
    return { success: true };
  } catch (e) {
    try {
      await query('REFRESH MATERIALIZED VIEW profitability_summary_mv');
      if (process.env.NODE_ENV === 'development') console.log('[MV Refresh] profitability_summary_mv refreshed (non-concurrent fallback)');
      return { success: true };
    } catch (e2) {
      logger.error({ message: "[MV Refresh] profitability_summary_mv failed:", error: e2, path: "action" });
      return { success: false, error: String(e2) };
    }
  }
}
