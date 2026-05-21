import { cookies } from 'next/headers';
import { query } from '@/lib/db';

const SESSION_COOKIE_NAME = 'fintrack_session';

/**
 * Menghitung sisa detik hingga pukul 00:00 WIB (UTC+7) berikutnya.
 * Digunakan untuk memaksa user logout otomatis saat pergantian hari.
 */
function getSecondsUntilMidnightWIB(): { seconds: number; expiryAt: number } {
  const now = new Date();
  
  // Konversi ke epoch ms, lalu tambah 7 jam untuk offset WIB (UTC+7)
  const wibMs = now.getTime() + 7 * 60 * 60 * 1000;
  
  // Tentukan objek Date berdasarkan waktu WIB saat ini
  const wibDate = new Date(wibMs);
  
  // Buat objek tengah malam (00:00:00) WIB hari berikutnya
  const nextMidnightWib = new Date(wibMs);
  nextMidnightWib.setUTCHours(0, 0, 0, 0);
  nextMidnightWib.setUTCDate(nextMidnightWib.getUTCDate() + 1);
  
  // Selisih waktu dalam ms
  const diffMs = nextMidnightWib.getTime() - wibMs;
  
  // Waktu absolut (UTC) kapan session ini harus dianggap hangus
  const expiryAt = now.getTime() + diffMs; 
  
  return {
    seconds: Math.floor(diffMs / 1000),
    expiryAt
  };
}

export async function createSession(adminId: number) {
  const token = crypto.randomUUID();
  const { seconds, expiryAt } = getSecondsUntilMidnightWIB();
  const cookieStore = await cookies();
  
  // Format cookie: adminId:token:expiryAt
  const sessionValue = `${adminId}:${token}:${expiryAt}`;
  
  cookieStore.set(SESSION_COOKIE_NAME, sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: seconds, // Cookie otomatis dihapus browser saat 00:00 WIB
    path: '/',
  });

  return token;
}

export async function getSession(): Promise<number | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);
  
  if (!session?.value) return null;
  
  const parts = session.value.split(':');
  if (parts.length < 3) return null;

  const [adminId, , expiryAtStr] = parts;
  const expiryAt = parseInt(expiryAtStr);
  
  // Validasi server-side: Jika waktu sekarang sudah melewati batas 00:00 WIB
  if (isNaN(expiryAt) || Date.now() > expiryAt) {
    return null;
  }
  
  const id = parseInt(adminId);
  return isNaN(id) ? null : id;
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function requireRole(allowedRoles: string[]) {
  const adminId = await getSession();
  if (!adminId) throw new Error("Unauthorized");
  
  const res = await query('SELECT role FROM admin WHERE id = $1', [adminId]);
  const userRole = res.rows[0]?.role;
  
  if (!allowedRoles.includes(userRole)) {
    throw new Error("Forbidden: Insufficient Permissions");
  }
  return adminId;
}
