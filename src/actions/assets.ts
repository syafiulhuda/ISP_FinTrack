'use server';
import { logger } from '@/lib/logger';
import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { Asset } from '@/types';
import { getAdminProfile } from './admin';
import { CreateAssetSchema } from '@/lib/validation';

export async function getAssetRoster(): Promise<Asset[]> {
  try {
    const res = await query(`
      SELECT 
        id, sn, mac, type, condition, color, latitude, longitude, status, kepemilikan, tanggal_perubahan, inputter, inputter_tms,
        CASE 
          WHEN location LIKE '%-% ' THEN TRIM(split_part(location, '-', 2))
          ELSE location 
        END as location
      FROM asset_roster 
      ORDER BY id ASC
    `);
    return res.rows as Asset[];
  } catch (e) {
    logger.error({ message: "DB Error: getAssetRoster", error: e, path: "action" });
    return [];
  }
}

export async function getStockAssets() {
  try {
    const res = await query('SELECT *, is_used::boolean as is_used FROM stock_asset_roster ORDER BY id ASC');
    return res.rows;
  } catch (e) {
    logger.error({ message: "DB Error: getStockAssets", error: e, path: "action" });
    return [];
  }
}

export async function getWarehouses() {
  try {
    const res = await query('SELECT id, location, latitude, longitude, city FROM warehouse_location ORDER BY location ASC');
    return res.rows;
  } catch (e) {
    logger.error({ message: "DB Error: getWarehouses", error: e, path: "action" });
    return [
      { id: 1, location: 'Warehouse Main', city: 'Jakarta', latitude: -6.2088, longitude: 106.8456 },
      { id: 2, location: 'Warehouse East', city: 'Yogyakarta', latitude: -7.7956, longitude: 110.3695 }
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
    // Validate input
    const parsed = CreateAssetSchema.safeParse(data);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((e: { message: string }) => e.message).join(', ');
      return { success: false, error: `Validasi gagal: ${msg}` };
    }

    const profile = await getAdminProfile();
    const inputterName = profile.fullName || 'Unknown Admin';

    const res = await query(`
      INSERT INTO stock_asset_roster (
        sn, mac, type, location, condition, color, 
        latitude, longitude, status, kepemilikan, 
        tanggal_perubahan, is_used, inputter, inputter_tms
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11, $12, NOW())
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
      false,
      inputterName
    ]);
    revalidatePath('/inventory');
    return { success: true, asset: res.rows[0] };
  } catch (e) {
    logger.error({ message: "DB Error: createAsset", error: e, path: "action" });
    return { success: false, error: String(e) };
  }
}

export async function updateAssetCondition(sn: string, condition: string) {
  try {
    const profile = await getAdminProfile();
    const inputterName = profile.fullName || 'Unknown Admin';

    await query(`UPDATE asset_roster SET condition = $1, tanggal_perubahan = NOW(), inputter = $3, inputter_tms = NOW() WHERE sn = $2`, [condition, sn, inputterName]);
    revalidatePath('/inventory');
    return { success: true };
  } catch (e) {
    logger.error({ message: "DB Error: updateAssetCondition", error: e, path: "action" });
    return { success: false };
  }
}

export async function startMaintenance(sn: string, technician: string, reason: string) {
  try {
    const profile = await getAdminProfile();
    const inputterName = profile.fullName || 'Unknown Admin';

    // 1. Get asset id from SN
    const assetRes = await query('SELECT id FROM asset_roster WHERE sn = $1', [sn]);
    if (assetRes.rows.length === 0) return { success: false, error: 'Asset not found' };
    const assetId = assetRes.rows[0].id;

    // 2. Update asset condition to 'Maintenance'
    await query(`
      UPDATE asset_roster 
      SET condition = 'Maintenance', tanggal_perubahan = NOW(),
          inputter = $2, inputter_tms = NOW()
      WHERE id = $1
    `, [assetId, inputterName]);

    // 3. Add to maintenance history
    await query(`
      INSERT INTO maintenance_history (
        asset_id, description, technician_name, date, 
        inputter, inputter_tms
      )
      VALUES ($1, 'START MAINTENANCE: ' || $2, $3, NOW(), $4, NOW())
    `, [assetId, reason, technician, inputterName]);

    // 4. Notification removed as per user request (handled via trouble tickets)

    revalidatePath('/inventory');
    revalidatePath('/distribution');
    revalidatePath('/notifications');
    return { success: true };
  } catch (error) {
    logger.error({ message: "DB Error: startMaintenance:", error: error, path: "action" });
    return { success: false, error: String(error) };
  }
}

export async function deleteAsset(sn: string) {
  try {
    await query(`DELETE FROM asset_roster WHERE sn = $1`, [sn]);
    revalidatePath('/inventory');
    return { success: true };
  } catch (e) {
    logger.error({ message: "DB Error: deleteAsset", error: e, path: "action" });
    return { success: false };
  }
}

export async function deployAsset(sn: string, data: { location: string, latitude: number, longitude: number }) {
  try {
    const profile = await getAdminProfile();
    const inputterName = profile.fullName || 'Unknown Admin';

    await query(`
      WITH deleted AS (
        DELETE FROM stock_asset_roster WHERE sn = $1 RETURNING *
      )
      INSERT INTO asset_roster (sn, mac, type, location, condition, color, latitude, longitude, status, kepemilikan, tanggal_perubahan, inputter, inputter_tms)
      SELECT sn, mac, type, $2, condition, color, $3, $4, 'Online', kepemilikan, NOW(), $5, NOW()
      FROM deleted
    `, [sn, data.location, data.latitude, data.longitude, inputterName]);
    
    revalidatePath('/inventory');
    return { success: true };
  } catch (e) {
    logger.error({ message: "DB Error: deployAsset", error: e, path: "action" });
    return { success: false, error: String(e) };
  }
}

export async function sellAsset(sn: string, buyerName: string, salePrice: string, notes: string) {
  try {
    const profile = await getAdminProfile();
    const inputterName = profile.fullName || 'Unknown Admin';

    // 1. Get asset details
    const assetRes = await query('SELECT id, province, location FROM asset_roster WHERE sn = $1', [sn]);
    if (assetRes.rows.length === 0) return { success: false, error: 'Asset not found' };
    const asset = assetRes.rows[0];
    const assetId = asset.id;

    // 2. Update asset kepemilikan → 'Dijual' (trigger handle_asset_sale auto-sets status = Offline)
    await query(`
      UPDATE asset_roster
      SET kepemilikan = 'Dijual', tanggal_perubahan = NOW(),
          inputter = $2, inputter_tms = NOW()
      WHERE id = $1
    `, [assetId, inputterName]);

    // 3. Record to maintenance_history as audit trail
    await query(`
      INSERT INTO maintenance_history (
        asset_id, description, technician_name, date,
        inputter, inputter_tms
      )
      VALUES ($1, $2, $3, NOW(), $4, NOW())
    `, [assetId, `ASSET SOLD: Buyer=${buyerName}, Price=Rp${salePrice}. Notes: ${notes}`, buyerName, inputterName]);

    // 4. Notification
    await query(`
      INSERT INTO notifications (
        category, title, message, type, is_unread,
        created_at, inputter, inputter_tms
      )
      VALUES (
        'Finance', 'Asset Sold',
        'Asset ' || $1 || ' (SN: ' || $2 || ') has been sold to ' || $3 || ' for Rp ' || $4,
        'info', true, NOW(), $5, NOW()
      )
    `, [assetId, sn, buyerName, salePrice, inputterName]);

    // 5. Insert to transactions as pemasukan (asset sale revenue)
    const numericPrice = Number(String(salePrice).replace(/[^0-9.-]+/g, '')) || 0;
    const now = new Date();
    const datePart = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');
    const trxId = `SELL-${assetId}-${datePart}`;

    await query(`
      INSERT INTO transactions (
        id, method, amount, status, timestamp, type, keterangan, city, inputter, inputter_tms
      )
      VALUES (
        $1, 'Transfer', $2, 'Verified', NOW(), 'Asset Sale', 'pemasukan', $3, $4, NOW()
      )
    `, [trxId, numericPrice, asset.province || asset.location || 'Unknown', inputterName]);

    revalidatePath('/inventory');
    revalidatePath('/finance');
    revalidatePath('/notifications');
    return { success: true };
  } catch (e) {
    logger.error({ message: "DB Error: sellAsset", error: e, path: "action" });
    return { success: false, error: String(e) };
  }
}
