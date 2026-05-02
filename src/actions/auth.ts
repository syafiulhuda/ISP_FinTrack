"use server";

import { query } from "@/lib/db";
import crypto from "crypto";
import { sendResetPasswordEmail } from "@/lib/mail";
import bcrypt from "bcryptjs";
import { createSession, destroySession, getSession } from "@/lib/auth";

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
  } catch (err) {
    console.error("Login Action Error:", err);
    return { success: false, error: 'Terjadi kesalahan server.' };
  }
}

export async function logoutAction() {
  await destroySession();
}

export async function requestPasswordReset(email: string) {
  try {
    // 1. Check if admin exists
    const userCheck = await query("SELECT id FROM admin WHERE email = $1", [email]);
    if (userCheck.rows.length === 0) {
      return { success: false, message: "Email not found." };
    }

    // 2. Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    // 3. Store token (Upsert if email exists)
    await query(
      "DELETE FROM password_resets WHERE email = $1", 
      [email]
    );
    await query(
      "INSERT INTO password_resets (email, token, expires_at) VALUES ($1, $2, $3)",
      [email, token, expiresAt]
    );

    // 4. Send Email
    const emailRes = await sendResetPasswordEmail(email, token);
    if (!emailRes.success) {
      return { success: false, message: "Failed to send email." };
    }

    return { success: true, message: "Reset link has been sent to your email." };
  } catch (error) {
    console.error("Auth Action Error: requestPasswordReset", error);
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

    // 2. Hash new password
    const hashedPassword = await bcrypt.hash(passwordNew, 10);

    // 3. Update Admin Table
    await query(
      "UPDATE admin SET password = $1 WHERE email = $2",
      [hashedPassword, email]
    );

    // 4. Clean up token
    await query("DELETE FROM password_resets WHERE email = $1", [email]);

    return { success: true, message: "Password has been updated successfully." };
  } catch (error) {
    console.error("Auth Action Error: resetPassword", error);
    return { success: false, message: "An unexpected error occurred." };
  }
}
export async function validateResetToken(token: string) {
  try {
    const tokenRes = await query(
      "SELECT * FROM password_resets WHERE token = $1 AND expires_at > NOW()",
      [token]
    );

    return { valid: tokenRes.rows.length > 0 };
  } catch (error) {
    console.error("Auth Action Error: validateResetToken", error);
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

    // 3. Hash and Update new password
    const newHash = await bcrypt.hash(passwordNew, 10);
    await query("UPDATE admin SET password = $1 WHERE id = $2", [newHash, adminId]);

    return { success: true, message: "Password berhasil diperbarui." };
  } catch (error) {
    console.error("Auth Action Error: changePasswordAction", error);
    return { success: false, message: "Terjadi kesalahan server." };
  }
}
