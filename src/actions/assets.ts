'use server';

import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import * as Mock from '@/lib/mockData';
import { Asset } from '@/types';

export async function getAssetRoster(): Promise<Asset[]> {
  try {
    const res = await query('SELECT * FROM asset_roster ORDER BY id ASC');
    return res.rows.length > 0 ? res.rows as Asset[] : Mock.MOCK_ASSETS as Asset[];
  } catch (e) {
    console.error("DB Error: getAssetRoster", e);
    return Mock.MOCK_ASSETS as Asset[];
  }
}

export async function getStockAssets() {
  try {
    const res = await query('SELECT *, is_used::boolean as is_used FROM stock_asset_roster ORDER BY id ASC');
    return res.rows.length > 0 ? res.rows : Mock.MOCK_STOCK;
  } catch (e) {
    console.error("DB Error: getStockAssets", e);
    return Mock.MOCK_STOCK;
  }
}

export async function getWarehouses() {
  try {
    const res = await query(`
      select distinct
          split_part(location,',',1) as warehouse_name,
          split_part(location,',',2) as city_name,
          split_part(location,',',3) as province_name,
          latitude,
          longitude
      from asset_roster
      where split_part(location,',',2) in (' Yogyakarta',' DKI Jakarta',' Bali',' Surabaya')
      order by split_part(location,',',1) asc
    `);
    return res.rows;
  } catch (e) {
    console.error("DB Error: getWarehouses", e);
    return [
      { warehouse_name: 'Warehouse Main', city_name: ' DKI Jakarta', province_name: '', latitude: -6.2088, longitude: 106.8456 },
      { warehouse_name: 'Warehouse East', city_name: ' Yogyakarta', province_name: ' DI Yogyakarta', latitude: -7.7956, longitude: 110.3695 },
      { warehouse_name: 'Warehouse South', city_name: ' Bali', province_name: '', latitude: -8.4095, longitude: 115.1889 },
      { warehouse_name: 'Warehouse West', city_name: ' Surabaya', province_name: ' Jawa Timur', latitude: -7.2575, longitude: 112.7521 }
    ];
  }
}

export async function createAsset(data: { 
  sn: string, 
  mac: string, 
  type: string, 
  location: string, 
  condition: string, 
  kepemilikan?: string,
  latitude?: number,
  longitude?: number
}) {
  try {
    const res = await query(`
      INSERT INTO stock_asset_roster (sn, mac, type, location, condition, color, latitude, longitude, status, kepemilikan, tanggal_perubahan, is_used)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11)
      RETURNING *
    `, [
      data.sn, 
      data.mac, 
      data.type, 
      data.location, 
      data.condition, 
      'White',
      data.latitude ?? -6.2088,
      data.longitude ?? 106.8456,
      'Offline',
      data.kepemilikan || 'Dimiliki',
      false
    ]);
    revalidatePath('/inventory');
    return { success: true, asset: res.rows[0] };
  } catch (e) {
    console.error("DB Error: createAsset", e);
    return { success: false, error: String(e) };
  }
}

export async function updateAssetCondition(sn: string, condition: string) {
  try {
    await query(`UPDATE asset_roster SET condition = $1, tanggal_perubahan = NOW() WHERE sn = $2`, [condition, sn]);
    revalidatePath('/inventory');
    return { success: true };
  } catch (e) {
    console.error("DB Error: updateAssetCondition", e);
    return { success: false };
  }
}

export async function deleteAsset(sn: string) {
  try {
    await query(`DELETE FROM asset_roster WHERE sn = $1`, [sn]);
    revalidatePath('/inventory');
    return { success: true };
  } catch (e) {
    console.error("DB Error: deleteAsset", e);
    return { success: false };
  }
}

export async function deployAsset(sn: string, data: { location: string, latitude: number, longitude: number }) {
  try {
    await query(`
      WITH deleted AS (
        DELETE FROM stock_asset_roster WHERE sn = $1 RETURNING *
      )
      INSERT INTO asset_roster (sn, mac, type, location, condition, color, latitude, longitude, status, kepemilikan, tanggal_perubahan)
      SELECT sn, mac, type, $2, condition, color, $3, $4, 'Online', kepemilikan, NOW()
      FROM deleted
    `, [sn, data.location, data.latitude, data.longitude]);
    
    revalidatePath('/inventory');
    return { success: true };
  } catch (e) {
    console.error("DB Error: deployAsset", e);
    return { success: false, error: String(e) };
  }
}
