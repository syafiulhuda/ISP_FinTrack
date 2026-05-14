"use server";

import { getCustomers, getAgingMVData } from '@/actions/customers';
import { getServiceTiers } from '@/actions/tiers';
import { getAssetRoster } from '@/actions/assets';
import { getInvoices } from '@/actions/transactions';

/**
 * Aggregates all data needed by the Regional Analysis page in a single round-trip
 * using Promise.all — same pattern as getExecutiveReport() and getDashboardData().
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
