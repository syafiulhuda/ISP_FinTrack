'use server';

import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import * as Mock from '@/lib/mockData';
import { ServiceTier } from '@/types';

export async function getServiceTiers(): Promise<ServiceTier[]> {
  try {
    const res = await query('SELECT * FROM service_tiers ORDER BY id ASC');
    return res.rows.length > 0 ? res.rows as ServiceTier[] : Mock.MOCK_SERVICE_TIERS as ServiceTier[];
  } catch (e) {
    console.error("DB Error: getServiceTiers", e);
    return Mock.MOCK_SERVICE_TIERS as ServiceTier[];
  }
}

export async function createServiceTier(data: { 
  name: string, 
  speed: string, 
  unit: string, 
  price: string, 
  fup: string, 
  type: string, 
  icon: string 
}) {
  try {
    const res = await query(`
      INSERT INTO service_tiers (name, speed, unit, price, fup, type, icon)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [data.name, data.speed, data.unit, data.price, data.fup, data.type, data.icon]);
    revalidatePath('/service-tiers');
    revalidatePath('/profitability');
    return { success: true, tier: res.rows[0] };
  } catch (e) {
    console.error("DB Error: createServiceTier", e);
    return { success: false, error: String(e) };
  }
}
