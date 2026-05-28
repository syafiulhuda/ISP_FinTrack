'use server';
import { logger } from'@/lib/logger';

import { query } from'@/lib/db';
import { revalidatePath } from'next/cache';
import { ServiceTier } from'@/types';

export async function getServiceTiers(): Promise<ServiceTier[]> {
 try {
 const res = await query('SELECT * FROM service_tiers ORDER BY id ASC');
 return res.rows as ServiceTier[];
 } catch (e) {
 logger.error({ message:"DB Error: getServiceTiers", error: e, path:"action"});
 return [];
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
 logger.error({ message:"DB Error: createServiceTier", error: e, path:"action"});
 return { success: false, error: String(e) };
 }
}
