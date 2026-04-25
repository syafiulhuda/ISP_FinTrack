'use server';

import { query } from '@/lib/db';

export async function getServiceTiers() {
  const res = await query('SELECT * FROM service_tiers ORDER BY id ASC');
  return res.rows;
}

export async function getAssetRoster() {
  const res = await query('SELECT * FROM asset_roster ORDER BY id ASC');
  return res.rows;
}

export async function getStockAssets() {
  const res = await query('SELECT * FROM stock_asset_roster ORDER BY id ASC');
  return res.rows;
}

export async function getCustomers() {
  const res = await query('SELECT * FROM customers ORDER BY id ASC');
  return res.rows;
}

export async function getTransactions() {
  const res = await query('SELECT * FROM transactions ORDER BY id DESC');
  return res.rows.map(row => ({
    ...row,
    isWarning: Boolean(row.isWarning),
    timestamp: row.timestamp ? new Date(row.timestamp).toLocaleString('id-ID') : '-'
  }));
}

export async function getOcrData() {
  const res = await query('SELECT * FROM ocr_data LIMIT 1');
  return res.rows[0];
}

export async function getAdminProfile() {
  const res = await query('SELECT id, nama as "fullName", email, role, department, image FROM admin LIMIT 1');
  return res.rows[0];
}

export async function updateAdminProfile(data: { fullName: string, email: string, role: string, department: string, image: string }) {
  const res = await query(`
    UPDATE admin 
    SET nama = $1, email = $2, role = $3, department = $4, image = $5
    WHERE id = (SELECT id FROM admin LIMIT 1)
    RETURNING id, nama as "fullName", email, role, department, image
  `, [data.fullName, data.email, data.role, data.department, data.image]);
  return res.rows[0];
}

export async function getNotifications() {
  const res = await query('SELECT * FROM notifications ORDER BY created_at DESC');
  return res.rows.map(row => ({
    ...row,
    created_at: row.created_at ? new Date(row.created_at).toLocaleString('id-ID') : '-'
  }));
}

export async function markNotificationAsRead(id: number) {
  await query('UPDATE notifications SET is_unread = false WHERE id = $1', [id]);
}

export async function markAllNotificationsAsRead() {
  await query('UPDATE notifications SET is_unread = false');
}

export async function getExpenses() {
  const res = await query('SELECT * FROM expenses ORDER BY date DESC');
  return res.rows.map(row => ({
    ...row,
    amount: Number(row.amount)
  }));
}

export async function createNotification(type: string, title: string, message: string) {
  const res = await query(`
    INSERT INTO notifications (type, title, message, created_at, is_unread)
    VALUES ($1, $2, $3, NOW(), true)
    RETURNING *
  `, [type, title, message]);
  return res.rows[0];
}
