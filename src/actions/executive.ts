"use server";

import { getCustomers, getInactiveCust } from '@/actions/customers';
import { getServiceTiers } from '@/actions/tiers';
import { getTransactions, getExpenses } from '@/actions/transactions';
import { getAssetRoster, getStockAssets } from '@/actions/assets';

export async function getExecutiveReport() {
  const [
    customersData,
    inactiveCust,
    transactions,
    expenses,
    serviceTiers,
    assetRoster,
    stockAssets
  ] = await Promise.all([
    getCustomers(1, 1000),
    getInactiveCust(),
    getTransactions(),
    getExpenses(),
    getServiceTiers(),
    getAssetRoster(),
    getStockAssets()
  ]);

  return {
    customers: customersData.customers,
    inactiveCust,
    transactions,
    expenses,
    serviceTiers,
    assetRoster,
    stockAssets
  };
}
