import { cookies, headers } from 'next/headers';
import { query } from '@/lib/db';

const SESSION_COOKIE_NAME = 'fintrack_session';

/**
 * Menghitung sisa detik hingga pukul 00:00 WIB (UTC+7) berikutnya.
 * Digunakan untuk memaksa user logout otomatis saat pergantian hari.
 */
function getSecondsUntilMidnightWIB(): { seconds: number; expiryAt: number; expiryDate: Date } {
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
    expiryAt,
    expiryDate: new Date(expiryAt)
  };
}

export async function createSession(adminId: number) {
  const token = crypto.randomUUID();
  const { seconds, expiryAt, expiryDate } = getSecondsUntilMidnightWIB();
  const cookieStore = await cookies();
  
  // Ambil data admin (role)
  const adminRes = await query('SELECT role FROM admin WHERE id = $1 AND is_active = true', [adminId]);
  if (adminRes.rows.length === 0) {
    throw new Error('Admin not found or inactive');
  }
  const role = adminRes.rows[0].role;

  // Extract info device dari headers
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || 'Unknown Device';
  const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || '127.0.0.1';
  
  // Basic parsing for device_info
  let deviceInfo = 'Unknown';
  if (userAgent.includes('Windows')) deviceInfo = 'Windows • ' + (userAgent.includes('Chrome') ? 'Chrome' : 'Browser');
  else if (userAgent.includes('Macintosh')) deviceInfo = 'Mac • ' + (userAgent.includes('Chrome') ? 'Chrome' : 'Browser');
  else if (userAgent.includes('Android')) deviceInfo = 'Android • Mobile';
  else if (userAgent.includes('iPhone')) deviceInfo = 'iPhone • Mobile';
  else deviceInfo = userAgent.substring(0, 50); // Fallback

  // Create session di database
  await query(`
    INSERT INTO admin_sessions (admin_id, role, token, device_info, ip_address, location, expires_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [adminId, role, token, deviceInfo, ipAddress, 'Jakarta, Indonesia', expiryDate]);
  
  // Format cookie: adminId:token:expiryAt
  const sessionValue = `${adminId}:${token}:${expiryAt}`;
  
  cookieStore.set(SESSION_COOKIE_NAME, sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: seconds, // Cookie otomatis dihapus browser saat 00:00 WIB
    path: '/',
  });

  // Catat login ke log
  await query(`
    INSERT INTO admin_security_logs (admin_id, action, ip_address)
    VALUES ($1, $2, $3)
  `, [adminId, 'Successful login', ipAddress]);

  return token;
}

export async function getSession(): Promise<number | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);
  
  if (!session?.value) return null;
  
  const parts = session.value.split(':');
  if (parts.length < 3) return null;

  const [adminId, token, expiryAtStr] = parts;
  const expiryAt = parseInt(expiryAtStr);
  
  // Validasi expiry time
  if (isNaN(expiryAt) || Date.now() > expiryAt) {
    return null;
  }
  
  const id = parseInt(adminId);
  if (isNaN(id)) return null;

  try {
    // Validasi token di database & cek is_active admin
    const res = await query(`
      SELECT s.id 
      FROM admin_sessions s
      JOIN admin a ON s.admin_id = a.id
      WHERE s.token = $1 AND s.admin_id = $2 AND a.is_active = true
    `, [token, id]);

    if (res.rows.length === 0) {
      return null;
    }

    // Update last_active secara asynchronous (tidak diblock)
    query('UPDATE admin_sessions SET last_active = NOW() WHERE token = $1', [token]).catch(() => {});

    return id;
  } catch (error) {
    console.error("Session verification failed", error);
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);
  
  if (session?.value) {
    const parts = session.value.split(':');
    if (parts.length >= 2) {
      const token = parts[1];
      // Hapus session dari DB
      await query('DELETE FROM admin_sessions WHERE token = $1', [token]).catch(() => {});
    }
  }
  
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
