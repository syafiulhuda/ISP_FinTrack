'use server';

import { query } from '@/lib/db';
import { MOCK_ASSETS } from '@/lib/mockData';
import { revalidatePath } from 'next/cache';

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

export async function addMapNode(data: {
  sn: string;
  mac: string;
  type: string;
  location: string;
  latitude: number;
  longitude: number;
  kepemilikan: string;
}) {
  try {
    const res = await query(`
      INSERT INTO asset_roster (sn, mac, type, location, latitude, longitude, status, kepemilikan, condition, tanggal_perubahan)
      VALUES ($1, $2, $3, $4, $5, $6, 'Online', $7, 'Good', NOW())
      RETURNING *
    `, [data.sn, data.mac, data.type, data.location, data.latitude, data.longitude, data.kepemilikan]);
    revalidatePath('/distribution');
    return { success: true, asset: res.rows[0] };
  } catch (error) {
    console.error('DB Error: addMapNode:', error);
    return { success: false, error: String(error) };
  }
}

export async function dispatchTechnician(assetId: number, sn: string) {
  try {
    // 1. Insert into notifications
    await query(`
      INSERT INTO notifications (category, title, message, type, is_unread, created_at)
      VALUES ('System', 'Technician Dispatched', 'Field engineer dispatched for asset ' || $1 || ' (ID: ' || $2 || ')', 'system', true, NOW())
    `, [sn, assetId]);

    // 2. Add a maintenance history entry
    await query(`
      INSERT INTO maintenance_history (asset_id, description, technician_name, date)
      VALUES ($1, 'Technician dispatched for troubleshooting', 'Budi Santoso', NOW())
    `, [assetId]);

    revalidatePath('/distribution');
    revalidatePath('/notifications');
    return { success: true };
  } catch (error) {
    console.error('DB Error: dispatchTechnician:', error);
    return { success: false, error: String(error) };
  }
}

export async function getMaintenanceHistory(assetId: number) {
  try {
    const res = await query(`
      SELECT * FROM maintenance_history 
      WHERE asset_id = $1 
      ORDER BY date DESC
    `, [assetId]);
    return res.rows;
  } catch (error) {
    console.error('DB Error: getMaintenanceHistory:', error);
    return [];
  }
}

export async function resolveMaintenance(sn: string, technician: string, description: string) {
  try {
    // 1. Get asset id from SN
    const assetRes = await query('SELECT id FROM asset_roster WHERE sn = $1', [sn]);
    if (assetRes.rows.length === 0) return { success: false, error: 'Asset not found' };
    const assetId = assetRes.rows[0].id;

    // 2. Update asset status and condition
    await query(`
      UPDATE asset_roster 
      SET status = 'Online', condition = 'Good', tanggal_perubahan = NOW() 
      WHERE id = $1
    `, [assetId]);

    // 3. Add to maintenance history
    await query(`
      INSERT INTO maintenance_history (asset_id, description, technician_name, date)
      VALUES ($1, $2, $3, NOW())
    `, [assetId, description, technician]);

    // 4. Notification
    await query(`
      INSERT INTO notifications (category, title, message, type, is_unread, created_at)
      VALUES ('System', 'Maintenance Resolved', 'Maintenance completed for asset ' || $1 || ' (SN: ' || $2 || ')', 'success', true, NOW())
    `, [assetId, sn]);

    revalidatePath('/distribution');
    revalidatePath('/inventory');
    revalidatePath('/notifications');
    return { success: true };
  } catch (error) {
    console.error('DB Error: resolveMaintenance:', error);
    return { success: false, error: String(error) };
  }
}
