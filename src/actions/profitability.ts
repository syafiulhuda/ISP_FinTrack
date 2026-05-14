"use server";

import { getCustomers } from '@/actions/customers';
import { getServiceTiers } from '@/actions/tiers';
import { getExpenses, getTransactions, getTransactionDateRange } from '@/actions/transactions';

/**
 * Aggregates all data needed by the Profitability page in a single round-trip
 * using Promise.all — same pattern as getExecutiveReport() and getDashboardData().
 * 
 * getTransactions() returns only the last 24 months of verified transactions
 * to avoid fetching the entire table on every load.
 */
export async function getProfitabilityData() {
  const [
    customersData,
    serviceTiers,
    expenses,
    transactions,
    dateRange,
  ] = await Promise.all([
    getCustomers(1, 1000),
    getServiceTiers(),
    getExpenses(),
    getTransactions(24),   // Last 24 months: covers full profitability date-range picker
    getTransactionDateRange(),
  ]);

  return {
    customers: customersData.customers,
    serviceTiers,
    expenses,
    transactions,
    dateRange,
  };
}
