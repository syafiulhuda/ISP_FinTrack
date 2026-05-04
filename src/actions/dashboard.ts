"use server";

import { getCustomers, getInactiveCust, getCustomerGrowthTrend } from '@/actions/customers';
import { getServiceTiers } from '@/actions/tiers';
import { getTransactions, getExpenses, getRevenueGrowthTrend } from '@/actions/transactions';

export async function getDashboardData() {
  const [
    customersData,
    tiers,
    transactions,
    inactiveCust,
    customerGrowthTrend,
    expenses,
    trendData
  ] = await Promise.all([
    getCustomers(1, 1000),
    getServiceTiers(),
    getTransactions(),
    getInactiveCust(),
    getCustomerGrowthTrend(),
    getExpenses(),
    getRevenueGrowthTrend()
  ]);

  return {
    customers: customersData.customers,
    tiers,
    transactions,
    inactiveCust,
    customerGrowthTrend,
    expenses,
    trendData
  };
}
