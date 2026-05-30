'use server';

import { query } from'@/lib/db';
import { getSession, destroySession } from'@/lib/auth';
import { revalidatePath } from'next/cache';
import { headers } from'next/headers';
import speakeasy from'speakeasy';
import qrcode from'qrcode';

// ==============================
// Session Management
// ==============================

export async function getActiveSessions() {
 const adminId = await getSession();
 if (!adminId) throw new Error("Unauthorized");

 const res = await query(`
 SELECT id, device_info, ip_address, location, created_at, last_active, token
 FROM admin_sessions
 WHERE admin_id = $1
 ORDER BY last_active DESC
`, [adminId]);

 return res.rows.map(row => ({
 id: row.id,
 device_info: row.device_info,
 ip_address: row.ip_address,
 location: row.location,
 created_at: row.created_at,
 last_active: row.last_active,
 token: row.token
 }));
}

export async function revokeSession(sessionId: string) {
 const adminId = await getSession();
 if (!adminId) throw new Error("Unauthorized");

 await query(`
 DELETE FROM admin_sessions 
 WHERE id = $1 AND admin_id = $2
`, [sessionId, adminId]);

 revalidatePath('/profile');
 return { success: true };
}

export async function revokeOtherSessions(currentToken: string) {
 const adminId = await getSession();
 if (!adminId) throw new Error("Unauthorized");

 await query(`
 DELETE FROM admin_sessions 
 WHERE admin_id = $1 AND token != $2
`, [adminId, currentToken]);

 revalidatePath('/profile');
 return { success: true };
}

// ==============================
// Two-Factor Authentication
// ==============================

export async function generateTwoFactorSecret() {
 const adminId = await getSession();
 if (!adminId) throw new Error("Unauthorized");

 const adminRes = await query('SELECT email FROM admin WHERE id = $1', [adminId]);
 const email = adminRes.rows[0]?.email ||'Admin';

 const secret = speakeasy.generateSecret({
 name:`ISP-FinTrack (${email})`
 });

 const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url!);

 return { qrCode: qrCodeDataUrl, secret: secret.base32 };
}

export async function verifyAndEnableTwoFactor(formData: FormData) {
 const token = formData.get('token') as string;
 const secret = formData.get('secret') as string;

 const adminId = await getSession();
 if (!adminId) throw new Error("Unauthorized");

 if (!secret) throw new Error("Secret is missing");

 const verified = speakeasy.totp.verify({
 secret: secret,
 encoding:'base32',
 token: token,
 window: 1 // Allow 1 step before/after
 });

 if (verified) {
 await query(`
 UPDATE admin SET two_factor_secret = $1, two_factor_enabled = true WHERE id = $2
`, [secret, adminId]);

 const headersList = await headers();
 const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') ||'127.0.0.1';
 
 await query(`
 INSERT INTO admin_security_logs (admin_id, action, ip_address)
 VALUES ($1, $2, $3)
`, [adminId,'2FA Enabled', ipAddress]);

 revalidatePath('/profile');
 return { success: true };
 }

 return { success: false, error:'Invalid verification code'};
}

export async function disableTwoFactor(formData: FormData) {
 const password = formData.get('password') as string;

 const adminId = await getSession();
 if (!adminId) throw new Error("Unauthorized");

 // Verify password first
 const bcrypt = require('bcryptjs');
 const adminRes = await query('SELECT password FROM admin WHERE id = $1', [adminId]);
 const isValid = await bcrypt.compare(password, adminRes.rows[0].password);
 
 if (!isValid) return { success: false, error:'Invalid password'};

 await query(`
 UPDATE admin SET two_factor_enabled = false, two_factor_secret = NULL WHERE id = $1
`, [adminId]);

 const headersList = await headers();
 const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') ||'127.0.0.1';
 
 await query(`
 INSERT INTO admin_security_logs (admin_id, action, ip_address)
 VALUES ($1, $2, $3)
`, [adminId,'2FA Disabled', ipAddress]);

 revalidatePath('/profile');
 return { success: true };
}

export async function checkTwoFactorStatus() {
 const adminId = await getSession();
 if (!adminId) return { enabled: false };

 const adminRes = await query('SELECT two_factor_enabled FROM admin WHERE id = $1', [adminId]);
 return { enabled: adminRes.rows[0]?.two_factor_enabled || false };
}

// ==============================
// Security Logs
// ==============================

export async function getSecurityLogs() {
 const adminId = await getSession();
 if (!adminId) throw new Error("Unauthorized");

 const res = await query(`
 SELECT action, ip_address, created_at
 FROM admin_security_logs
 WHERE admin_id = $1
 ORDER BY created_at DESC
 LIMIT 100
`, [adminId]);

 return res.rows;
}

// ==============================
// Danger Zone
// ==============================

export async function deactivateAccount() {
 const adminId = await getSession();
 if (!adminId) throw new Error("Unauthorized");

 const targetRes = await query('SELECT role FROM admin WHERE id = $1', [adminId]);
 if (targetRes.rows.length === 0) throw new Error("User not found");
 if (targetRes.rows[0].role ==='Owner') {
 throw new Error("Cannot deactivate an Owner account");
 }

 const headersList = await headers();
 const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') ||'127.0.0.1';

 await query(`
 INSERT INTO admin_security_logs (admin_id, action, ip_address)
 VALUES ($1, $2, $3)
`, [adminId,'Account Deactivated', ipAddress]);

 await query('UPDATE admin SET is_active = false WHERE id = $1', [adminId]);
 
 // Revoke all sessions for this user
 await query('DELETE FROM admin_sessions WHERE admin_id = $1', [adminId]);
 
 await destroySession();
 return { success: true };
}
