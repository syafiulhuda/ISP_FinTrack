"use server";

import { getCustomers, getInactiveCust } from '@/actions/customers';
import { getServiceTiers } from '@/actions/tiers';
import { getTransactions, getExpenses } from '@/actions/transactions';
import { getAssetRoster, getStockAssets } from '@/actions/assets';
import { query } from '@/lib/db';
import { unstable_cache } from 'next/cache';

// =============================================================================
// getExecutiveSummaryMV — Baca dari executive_summary_mv (< 5ms)
// Berisi pre-kalkulasi untuk 3 tab:
//   Tab 1 (Financial): revenue, expenses, gross_profit, net_profit per bulan + all-time KPIs
//   Tab 2 (Inventory): asset stats per type/condition/location
//   Tab 3 (Regional):  profit & subscriber per province
// Cache TTL: 60 detik
// =============================================================================
export const getExecutiveSummaryMV = unstable_cache(
  async () => {
    try {
      const res = await query(`
        SELECT
          section,
          dimension,
          month,
          revenue,
          expenses,
          direct_costs,
          gross_profit,
          net_profit,
          province,
          asset_pool,
          asset_type,
          condition,
          kepemilikan,
          asset_count,
          total_asset_value,
          subscriber_count,
          last_refreshed_at
        FROM executive_summary_mv
        ORDER BY section ASC, dimension ASC
      `);

      if (res.rows.length === 0) return null;

      // Parse rows ke typed groups
      const rows = res.rows.map(r => ({
        section:           r.section as string,
        dimension:         r.dimension as string,
        month:             r.month as string | null,
        revenue:           Number(r.revenue),
        expenses:          Number(r.expenses),
        direct_costs:      Number(r.direct_costs),
        gross_profit:      Number(r.gross_profit),
        net_profit:        Number(r.net_profit),
        province:          r.province as string | null,
        asset_pool:        r.asset_pool as string | null,
        asset_type:        r.asset_type as string | null,
        condition:         r.condition as string | null,
        kepemilikan:       r.kepemilikan as string | null,
        asset_count:       Number(r.asset_count),
        total_asset_value: Number(r.total_asset_value),
        subscriber_count:  Number(r.subscriber_count),
        last_refreshed_at: r.last_refreshed_at,
      }));

      return {
        monthly_financials:  rows.filter(r => r.section === '1_monthly_financials'),
        province_profit:     rows.filter(r => r.section === '2_province_profit'),
        province_customers:  rows.filter(r => r.section === '3_province_customers'),
        asset_stats:         rows.filter(r => r.section === '4_asset_stats'),
        kpi_totals:          rows.find(r => r.section === '5_kpi_totals') ?? null,
      };
    } catch (e) {
      console.error("DB Error: getExecutiveSummaryMV (MV not ready, will fallback)", e);
      return null;
    }
  },
  ['executive_summary_mv'],
  { revalidate: 60, tags: ['executive'] }
);

// =============================================================================
// getExecutiveReport — Orchestrator untuk halaman Executive Summary
//
// Strategi dual-layer:
// 1. Baca dari executive_summary_mv (< 5ms) untuk semua tab termasuk
//    Financial, Inventory, dan Regional pre-aggregated data
// 2. Fallback ke raw queries jika MV belum siap (backward-compatible)
// =============================================================================
export async function getExecutiveReport() {
  const [
    mvData,
    customersData,
    inactiveCust,
    transactions,
    expenses,
    serviceTiers,
    assetRoster,
    stockAssets
  ] = await Promise.all([
    getExecutiveSummaryMV(),   // Fast: dari MV
    getCustomers(1, 1000),
    getInactiveCust(),
    getTransactions(),
    getExpenses(),
    getServiceTiers(),
    getAssetRoster(),
    getStockAssets()
  ]);

  return {
    // MV data (pre-aggregated summaries untuk semua tab) — bisa null jika MV belum dijalankan
    mvData,
    // Raw data untuk filter interaktif (date-range, province) yang sudah ada di komponen
    customers: customersData.customers,
    inactiveCust,
    transactions,
    expenses,
    serviceTiers,
    assetRoster,
    stockAssets
  };
}

// =============================================================================
// refreshExecutiveMV — Dipanggil oleh instrumentation.ts
// =============================================================================
export async function refreshExecutiveMV() {
  try {
    // executive_summary_mv tidak pakai CONCURRENTLY karena tidak ada unique index
    // (multi-section UNION ALL tidak bisa diberi unique index sederhana)
    await query('REFRESH MATERIALIZED VIEW executive_summary_mv');
    console.log('[MV Refresh] executive_summary_mv refreshed successfully');
    return { success: true };
  } catch (e) {
    console.error('[MV Refresh] executive_summary_mv failed:', e);
    return { success: false, error: String(e) };
  }
}
