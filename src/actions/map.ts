'use server';

import { query } from '@/lib/db';
import { MOCK_ASSETS } from '@/lib/mockData';

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
    return res.rows.length > 0 ? res.rows : MOCK_ASSETS;
  } catch (error) {
    console.error('DB Error: getMapAssets:', error);
    return MOCK_ASSETS;
  }
}
