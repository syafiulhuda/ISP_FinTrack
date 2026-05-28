"use server";
import { logger } from '@/lib/logger';

import { query } from "@/lib/db";
import crypto from "crypto";
import { sendResetPasswordEmail } from "@/lib/mail";
import bcrypt from "bcryptjs";
import { createSession, destroySession, getSession } from "@/lib/auth";
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rateLimit";

export async function loginAction(formData: FormData): Promise<{ success: boolean; error?: string; requires2FA?: boolean; adminId?: number }> {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) return { success: false, error: 'Email dan password harus diisi.' };

    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';

    const limitKey = `rate:login:${ip}`;
    const limitCheck = await checkRateLimit(limitKey, 5, 60);
    if (!limitCheck.success) {
      return { success: false, error: 'Terlalu banyak percobaan login. Silakan coba lagi nanti.' };
    }

    const res = await query(
      'SELECT id, email, password, nickname, two_factor_enabled FROM admin WHERE email = $1 AND is_active = true LIMIT 1',
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

    if (admin.two_factor_enabled) {
      return { success: true, requires2FA: true, adminId: admin.id };
    }

    // Log the login activity
    await query(
      'INSERT INTO login_logs (admin_id, nickname, ip_address) VALUES ($1, $2, $3)',
      [admin.id, admin.nickname || admin.email.split('@')[0], ip]
    );

    await createSession(admin.id);
    return { success: true };
  } catch (err) {
    logger.error({ message: "Login Action Error:", error: err, path: "action" });
    return { success: false, error: 'Terjadi kesalahan server.' };
  }
}

export async function logoutAction() {
  await destroySession();
}

export async function verifyLogin2FA(adminId: number, token: string): Promise<{ success: boolean; error?: string }> {
  try {
    const adminRes = await query('SELECT two_factor_secret, nickname, email FROM admin WHERE id = $1 AND is_active = true', [adminId]);
    if (adminRes.rows.length === 0) return { success: false, error: 'Admin not found' };

    const admin = adminRes.rows[0];
    const speakeasy = require('speakeasy');
    const verified = speakeasy.totp.verify({
      secret: admin.two_factor_secret,
      encoding: 'base32',
      token: token,
      window: 1
    });

    if (!verified) {
      return { success: false, error: 'Kode verifikasi tidak valid' };
    }

    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';

    await query(
      'INSERT INTO login_logs (admin_id, nickname, ip_address) VALUES ($1, $2, $3)',
      [adminId, admin.nickname || admin.email.split('@')[0], ip]
    );

    await createSession(adminId);
    return { success: true };
  } catch (error) {
    logger.error({ message: "Verify 2FA Error:", error, path: "action" });
    return { success: false, error: 'Terjadi kesalahan sistem' };
  }
}

export async function getUsersForResetDropdown(requesterRole: string) {
  try {
    const roleMap: Record<string, string[]> = {
      "Owner": ["Owner", "System Administrator", "Admin Kantor", "Tim Lapangan"],
      "Admin Kantor": ["Tim Lapangan"],
      "Tim Lapangan": []
    };

    const allowedRoles = roleMap[requesterRole] || [];
    if (allowedRoles.length === 0) return { success: true, users: [] };

    // Bikin array string untuk dipass ke query IN ($1, $2, dll) tapi karena dinamis, 
    // kita pakai string template atau ILIKE. Yang paling gampang pakai ANY
    const res = await query(
      "SELECT id, nama, role, email FROM admin WHERE role = ANY($1) AND is_active = true ORDER BY role, nama",
      [allowedRoles]
    );

    return { success: true, users: res.rows };
  } catch (error) {
    logger.error({ message: "Auth Action Error: getUsersForResetDropdown", error: error, path: "action" });
    return { success: false, users: [] };
  }
}

export async function requestPasswordReset(targetUserId: number, requesterRole: string, requesterPassword?: string) {
  try {
    // 1. Check if admin exists, active, and get their role/email based on targetUserId
    const userCheck = await query("SELECT id, role, email FROM admin WHERE id = $1 AND is_active = true", [targetUserId]);
    if (userCheck.rows.length === 0) {
      return { success: false, message: "User tidak ditemukan." };
    }

    const targetRole = userCheck.rows[0].role;
    const rawEmail = userCheck.rows[0].email;

    // 2. Terapkan Hierarki Reset Password (Form Publik)
    // Aturan:
    // - Owner bisa reset siapa saja (termasuk dirinya sendiri)
    // - Admin Kantor HANYA bisa reset Tim Lapangan
    // - Tim Lapangan TIDAK BISA reset siapa-siapa

    if (requesterRole === "Tim Lapangan") {
      return { success: false, message: "Akses Ditolak: Tim Lapangan tidak memiliki izin untuk mereset password." };
    }

    if (requesterRole === "Admin Kantor") {
      if (!targetRole.toLowerCase().includes('lapangan')) {
        return { success: false, message: "Akses Ditolak: Admin Kantor hanya bisa mereset password Tim Lapangan." };
      }
    }

    // 3. Validasi Password Peminta (Kecuali Self-Reset)
    const isSelfReset = requesterRole === "Owner" && (targetRole.toLowerCase().includes("owner") || targetRole.toLowerCase().includes("system"));

    if (!isSelfReset) {
      if (!requesterPassword) {
        return { success: false, message: "Akses Ditolak: Password Anda diperlukan untuk memvalidasi tindakan ini." };
      }

      // Cari semua akun yang memiliki role sesuai dengan requesterRole
      // Kita pakai ILIKE karena role di database bisa bervariasi (e.g. "System Administrator" untuk Owner)
      const roleSearch = requesterRole === "Owner" ? "system" : requesterRole.toLowerCase();
      const requesters = await query("SELECT id, password FROM admin WHERE role ILIKE $1", [`%${roleSearch}%`]);

      let isValidRequester = false;
      for (const req of requesters.rows) {
        const match = await bcrypt.compare(requesterPassword, req.password);
        if (match) {
          isValidRequester = true;
          break;
        }
      }

      if (!isValidRequester) {
        return { success: false, message: "Akses Ditolak: Password validasi yang Anda masukkan salah." };
      }
    }

    // ALIAS: Jika email target berakhiran @ispfintrack.local (dummy email),
    // arahkan emailnya ke GMAIL_USER agar bisa diterima saat testing.
    const targetEmail = (rawEmail.endsWith('@ispfintrack.local') && process.env.GMAIL_USER)
      ? process.env.GMAIL_USER
      : rawEmail;

    // Hanya yang lolos (Owner) yang lanjut ke tahap pembuatan token

    // 2. Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    // 3. Store token (Upsert if email exists)
    await query(
      "DELETE FROM password_resets WHERE email = $1",
      [rawEmail]
    );
    await query(
      "INSERT INTO password_resets (email, token, expires_at) VALUES ($1, $2, $3)",
      [rawEmail, token, expiresAt]
    );

    // 4. Determine origin dynamically to support mobile testing (LAN IP)
    const headersList = await headers();
    const protocol = headersList.get('x-forwarded-proto') || 'http';
    const host = headersList.get('host') || 'localhost:3000';
    const appUrl = `${protocol}://${host}`;

    // 5. Send Email
    const emailRes = await sendResetPasswordEmail(targetEmail, token, appUrl);
    
    // 5. Log activity
    await query(
      "INSERT INTO change_pass_history (actor_email, target_email, action_type, ip_address) VALUES ($1, $2, $3, $4)",
      [requesterRole, rawEmail, "Reset Link Requested", "System"]
    );

    if (!emailRes.success) {
      return { success: false, message: "Failed to send email." };
    }

    return { success: true, message: "Reset link has been sent to your email." };
  } catch (error) {
    logger.error({ message: "Auth Action Error: requestPasswordReset", error: error, path: "action" });
    return { success: false, message: "An unexpected error occurred." };
  }
}

export async function resetPassword(token: string, passwordNew: string) {
  try {
    // 1. Find and validate token
    const tokenRes = await query(
      "SELECT * FROM password_resets WHERE token = $1 AND expires_at > NOW()",
      [token]
    );

    if (tokenRes.rows.length === 0) {
      return { success: false, message: "Invalid or expired token." };
    }

    const { email } = tokenRes.rows[0];

    // 2. Prevent reusing the old password
    const userRes = await query("SELECT password FROM admin WHERE email = $1", [email]);
    if (userRes.rows.length > 0) {
      const currentHash = userRes.rows[0].password;
      const isSamePassword = await bcrypt.compare(passwordNew, currentHash);
      if (isSamePassword) {
        return { success: false, message: "Password baru tidak boleh sama dengan password lama." };
      }
    }

    // 3. Hash new password
    const hashedPassword = await bcrypt.hash(passwordNew, 10);

    // 3. Update Admin Table
    await query(
      "UPDATE admin SET password = $1, last_password_change = NOW() WHERE email = $2",
      [hashedPassword, email]
    );

    // 4. Clean up token
    await query("DELETE FROM password_resets WHERE email = $1", [email]);

    // 5. Log activity
    await query(
      "INSERT INTO change_pass_history (actor_email, target_email, action_type, ip_address) VALUES ($1, $2, $3, $4)",
      ["User via Email Link", email, "Password Reset", "System"]
    );

    return { success: true, message: "Password has been updated successfully." };
  } catch (error) {
    logger.error({ message: "Auth Action Error: resetPassword", error: error, path: "action" });
    return { success: false, message: "An unexpected error occurred." };
  }
}
export async function validateResetToken(token: string) {
  try {
    const tokenRes = await query(
      "SELECT * FROM password_resets WHERE token = $1 AND expires_at > NOW()",
      [token]
    );

    if (tokenRes.rows.length > 0) {
      const email = tokenRes.rows[0].email;
      const userRes = await query("SELECT nama, email FROM admin WHERE email = $1", [email]);

      if (userRes.rows.length > 0) {
        return { valid: true, user: userRes.rows[0] };
      }
      return { valid: true, user: { email } }; // fallback
    }

    return { valid: false };
  } catch (error) {
    logger.error({ message: "Auth Action Error: validateResetToken", error: error, path: "action" });
    return { valid: false };
  }
}

export async function changePasswordAction(passwordOld: string, passwordNew: string) {
  try {
    const adminId = await getSession();
    if (!adminId) return { success: false, message: "Unauthorized." };

    // 1. Get current password hash
    const adminRes = await query("SELECT password, email FROM admin WHERE id = $1", [adminId]);
    if (adminRes.rows.length === 0) return { success: false, message: "Admin not found." };

    const { password: currentHash, email } = adminRes.rows[0];

    // 2. Verify old password
    const isMatch = await bcrypt.compare(passwordOld, currentHash);
    if (!isMatch) return { success: false, message: "Password lama salah." };

    if (passwordOld === passwordNew) {
      return { success: false, message: "Password baru tidak boleh sama dengan password lama." };
    }

    // 3. Hash and Update new password
    const newHash = await bcrypt.hash(passwordNew, 10);
    await query("UPDATE admin SET password = $1, last_password_change = NOW() WHERE id = $2", [newHash, adminId]);

    // 4. Log activity
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    await query(
      "INSERT INTO change_pass_history (actor_email, target_email, action_type, ip_address) VALUES ($1, $2, $3, $4)",
      [email, email, "Password Changed Manually", ip]
    );

    return { success: true, message: "Password berhasil diperbarui." };
  } catch (error) {
    logger.error({ message: "Auth Action Error: changePasswordAction", error: error, path: "action" });
    return { success: false, message: "Terjadi kesalahan server." };
  }
}
