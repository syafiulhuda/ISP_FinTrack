'use server';

import { query } from '@/lib/db';
import { createSession, destroySession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function loginAction(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await query(
      'SELECT id, email, password FROM admin WHERE email = $1 LIMIT 1',
      [email]
    );

    if (res.rows.length === 0) {
      return { success: false, error: 'Email tidak ditemukan.' };
    }

    const admin = res.rows[0];

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return { success: false, error: 'Password salah.' };
    }

    await createSession(admin.id);
    return { success: true };
  } catch {
    return { success: false, error: 'Terjadi kesalahan server.' };
  }
}

export async function logoutAction() {
  await destroySession();
}
