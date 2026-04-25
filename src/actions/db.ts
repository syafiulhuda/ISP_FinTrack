'use server';

import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import * as Mock from '@/lib/mockData';

export async function getServiceTiers() {
  try {
    const res = await query('SELECT * FROM service_tiers ORDER BY id ASC');
    return res.rows.length > 0 ? res.rows : Mock.MOCK_SERVICE_TIERS;
  } catch (e) {
    console.error("DB Error: getServiceTiers", e);
    return Mock.MOCK_SERVICE_TIERS;
  }
}

export async function getAssetRoster() {
  try {
    const res = await query('SELECT * FROM asset_roster ORDER BY id ASC');
    return res.rows.length > 0 ? res.rows : Mock.MOCK_ASSETS;
  } catch (e) {
    console.error("DB Error: getAssetRoster", e);
    return Mock.MOCK_ASSETS;
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

export async function getCustomers() {
  try {
    const res = await query('SELECT * FROM customers ORDER BY id ASC');
    return res.rows.length > 0 ? res.rows : Mock.MOCK_CUSTOMERS;
  } catch (e) {
    console.error("DB Error: getCustomers", e);
    return Mock.MOCK_CUSTOMERS;
  }
}

export async function getTransactions() {
  try {
    const res = await query('SELECT * FROM transactions ORDER BY id DESC');
    const data = res.rows.length > 0 ? res.rows : Mock.MOCK_TRANSACTIONS;
    return data.map(r => ({
      ...r,
      customer_id: r.customer_id,
      amount: r.amount || 'Rp 0',
      numericAmount: parseInt(r.amount?.replace(/[^0-9]/g, '') || '0'),
      timestamp: r.timestamp ? new Date(r.timestamp).toISOString() : new Date().toISOString()
    }));
  } catch (e) {
    console.error("DB Error: getTransactions", e);
    return Mock.MOCK_TRANSACTIONS.map(r => ({
      ...r,
      numericAmount: parseInt(r.amount.replace(/[^0-9]/g, '')),
    }));
  }
}

export async function getOcrData() {
  try {
    const res = await query('SELECT * FROM ocr_data LIMIT 1');
    return res.rows[0] || Mock.MOCK_OCR;
  } catch (e) {
    console.error("DB Error: getOcrData", e);
    return Mock.MOCK_OCR;
  }
}

export async function getAdminProfile() {
  try {
    const res = await query('SELECT id, nama as "fullName", email, role, department, image FROM admin LIMIT 1');
    return res.rows[0] || Mock.MOCK_ADMIN;
  } catch (e) {
    console.error("DB Error: getAdminProfile", e);
    return Mock.MOCK_ADMIN;
  }
}

export async function updateAdminProfile(data: { fullName: string, email: string, role: string, department: string, image: string }) {
  try {
    const res = await query(`
      UPDATE admin 
      SET nama = $1, email = $2, role = $3, department = $4, image = $5
      WHERE id = (SELECT id FROM admin LIMIT 1)
      RETURNING id, nama as "fullName", email, role, department, image
    `, [data.fullName, data.email, data.role, data.department, data.image]);
    return res.rows[0];
  } catch (e) {
    console.error("DB Error: updateAdminProfile", e);
    return { ...Mock.MOCK_ADMIN, ...data };
  }
}

export async function getNotifications() {
  try {
    const res = await query('SELECT *, is_unread::boolean as is_unread FROM notifications ORDER BY created_at DESC');
    const data = res.rows.length > 0 ? res.rows : Mock.MOCK_NOTIFICATIONS;
    return data.map(row => ({
      ...row,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : null
    }));
  } catch (e) {
    console.error("DB Error: getNotifications", e);
    return Mock.MOCK_NOTIFICATIONS;
  }
}

export async function markNotificationAsRead(id: number) {
  try {
    await query('UPDATE notifications SET is_unread = false WHERE id = $1', [id]);
  } catch (e) {
    console.error("DB Error: markNotificationAsRead", e);
  }
  return { success: true };
}

export async function markAllNotificationsAsRead() {
  try {
    await query('UPDATE notifications SET is_unread = false');
  } catch (e) {
    console.error("DB Error: markAllNotificationsAsRead", e);
  }
  return { success: true };
}

export async function getExpenses() {
  try {
    const res = await query('SELECT * FROM expenses ORDER BY date DESC');
    return res.rows.length > 0 ? res.rows.map(row => ({
      ...row,
      amount: Number(row.amount)
    })) : Mock.MOCK_EXPENSES;
  } catch (e) {
    console.error("DB Error: getExpenses", e);
    return Mock.MOCK_EXPENSES;
  }
}

export async function createNotification(type: string, title: string, message: string) {
  try {
    const res = await query(`
      INSERT INTO notifications (type, category, title, message, created_at, is_unread)
      VALUES ($1, $1, $2, $3, NOW(), true)
      RETURNING *
    `, [type, title, message]);
    return res.rows[0];
  } catch (e) {
    console.error("DB Error: createNotification", e);
    return { id: Math.random(), type, title, message, created_at: new Date().toISOString(), is_unread: true };
  }
}
