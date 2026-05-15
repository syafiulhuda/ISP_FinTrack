"use server";

import { getCustomers, getAgingMVData } from '@/actions/customers';
import { getServiceTiers } from '@/actions/tiers';
import { getAssetRoster } from '@/actions/assets';
import { getInvoices } from '@/actions/transactions';

/**
 * getRegionalData — Aggregates all data needed by the Regional Analysis page
 * 
 * Sudah optimal karena:
 * - getAgingMVData() → SELECT * FROM ar_aging_mv (sudah MV)
 * - Semua query dijalankan parallel via Promise.all
 * 
 * Tidak perlu MV baru karena data regional bersifat sangat interaktif
 * (filter per node/province yang dinamis) sehingga raw data lebih fleksibel.
 */
export async function getRegionalData() {
  const [
    customersData,
    serviceTiers,
    assetRoster,
    invoicesList,
    agingMVData,
  ] = await Promise.all([
    getCustomers(1, 1000),
    getServiceTiers(),
    getAssetRoster(),
    getInvoices(),
    getAgingMVData(),
  ]);

  return {
    customers: customersData.customers,
    serviceTiers,
    assetRoster,
    invoicesList,
    agingMVData,
  };
}
