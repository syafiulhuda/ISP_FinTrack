'use server';
import { logger } from '@/lib/logger';

import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getSession, requireRole } from "@/lib/auth";
import bcrypt from 'bcryptjs';
import { Admin, Notification } from '@/types';

// Admin Profile & Management
export async function getAdminProfile(): Promise<Admin & { fullName: string }> {
  try {
    const adminId = await getSession();
    if (!adminId) {
      return { id: 0, fullName: 'Unknown', email: '', role: 'Guest', department: '', image: '' } as Admin & { fullName: string };
    }

    const res = await query('SELECT id, nama as "fullName", email, role, department, image, last_password_change FROM admin WHERE id = $1', [adminId]);
    if (res.rows.length === 0) {
      return { id: 0, fullName: 'Unknown', email: '', role: 'Guest', department: '', image: '' } as Admin & { fullName: string };
    }
    
    return res.rows[0] as Admin & { fullName: string };
  } catch (e) {
    return { id: 0, fullName: 'Error', email: '', role: 'Guest', department: '', image: '' } as Admin & { fullName: string };
  }
}

export async function updateAdminProfile(data: { fullName: string, email: string, role: string, department: string, image: string }) {
  try {
    const adminId = await getSession();
    if (!adminId) throw new Error("Unauthorized");

    const res = await query(`
      UPDATE admin 
      SET nama = $1, email = $2, role = $3, department = $4, image = $5
      WHERE id = $6
      RETURNING id, nama as "fullName", email, role, department, image
    `, [data.fullName, data.email, data.role, data.department, data.image, adminId]);
    return res.rows[0];
  } catch (e) {
    return { id: 0, fullName: data.fullName, email: data.email, role: data.role, department: data.department, image: data.image };
  }
}

export async function getAdminList(): Promise<Admin[]> {
  try {
    await requireRole(['System Administrator']);
    const res = await query('SELECT id, nama, email, role, department, image, nickname FROM admin ORDER BY id ASC');
    return res.rows as Admin[];
  } catch (e) {
    logger.error({ message: "DB Error: getAdminList", error: e, path: "action" });
    return [];
  }
}

export async function createAdmin(data: { nama: string, email: string, password?: string, role: string, department: string, image: string, nickname?: string }) {
  try {
    const adminId = await requireRole(['System Administrator']);
    const creatorRes = await query('SELECT nickname FROM admin WHERE id = $1', [adminId]);
    const inputter = creatorRes.rows[0]?.nickname || 'System Administrator';

    const hashedPassword = await bcrypt.hash(data.password || 'admin123', 10);
    const nickname = data.nickname || data.email.split('@')[0];

    const res = await query(`
      INSERT INTO admin (nama, email, role, department, image, password, nickname, inputter, inputter_tms)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING id, nama, email, role, department, image
    `, [data.nama, data.email, data.role, data.department, data.image, hashedPassword, nickname, inputter]);
    return res.rows[0];
  } catch (e) {
    logger.error({ message: "DB Error: createAdmin", error: e, path: "action" });
    throw e;
  }
}

// Notifications
export async function createNotification(data: { category: string, title: string, message: string, type: string, action_label?: string }) {
  try {
    const res = await query(`
      INSERT INTO notifications (category, title, message, type, is_unread, action_label, created_at)
      VALUES ($1, $2, $3, $4, true, $5, NOW())
      RETURNING *
    `, [data.category, data.title, data.message, data.type, data.action_label || null]);
    return res.rows[0];
  } catch (e) {
    logger.error({ message: "DB Error: createNotification", error: e, path: "action" });
    throw e;
  }
}

export async function deleteNotification(id: number) {
  try {
    await query('UPDATE notifications SET is_hidden = true WHERE id = $1', [id]);
    return { success: true };
  } catch (e) {
    logger.error({ message: "DB Error: deleteNotification", error: e, path: "action" });
    throw e;
  }
}

export async function hideAllNotifications() {
  try {
    await query('UPDATE notifications SET is_hidden = true');
    return { success: true };
  } catch (e) {
    logger.error({ message: "DB Error: hideAllNotifications", error: e, path: "action" });
    throw e;
  }
}

export async function getNotifications(): Promise<Notification[]> {
  try {
    const res = await query('SELECT id, category, title, message, type, is_unread, action_label, created_at, is_hidden FROM notifications WHERE is_hidden = false OR is_hidden IS NULL ORDER BY id DESC');
    return res.rows.map(row => ({
      ...row,
      is_unread: row.is_unread === true || row.is_unread === 't' || row.is_unread === 'true' || row.is_unread === 1,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : null
    })) as Notification[];
  } catch (e) {
    logger.error({ message: "DB Error: getNotifications", error: e, path: "action" });
    return [];
  }
}

export async function markNotificationAsRead(id: number) {
  try {
    await query('UPDATE notifications SET is_unread = false WHERE id = $1', [id]);
  } catch (e) {
    logger.error({ message: "DB Error: markNotificationAsRead", error: e, path: "action" });
  }
  return { success: true };
}

export async function markAllNotificationsAsRead() {
  try {
    await query('UPDATE notifications SET is_unread = false');
    revalidatePath('/notifications');
  } catch (e) {
    logger.error({ message: "DB Error: markAllNotificationsAsRead", error: e, path: "action" });
  }
  return { success: true };
}
