'use server';

import { query } from '@/lib/db';

export async function getMapAssets() {
  try {
    const res = await query(`
      SELECT 
        id, 
        sn, 
        mac, 
        type, 
        location, 
        condition, 
        latitude, 
        longitude, 
        status,
        kepemilikan,
        tanggal_perubahan
      FROM asset_roster 
      WHERE latitude IS NOT NULL 
        AND longitude IS NOT NULL
        AND (kepemilikan = 'Dimiliki' OR kepemilikan IS NULL)
      ORDER BY id ASC
    `);
    return res.rows;
  } catch (error) {
    console.error('Error fetching map assets:', error);
    return [];
  }
}
