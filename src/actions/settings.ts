'use server';
import { logger } from '@/lib/logger';
import { query } from '@/lib/db';
import { getSession, requireRole } from "@/lib/auth";

export interface SystemSettings {
  appName: string;
  appSubtitle: string;
  accentColor: string;
  appLogo: string;
  timezone: string;
  language: string;
  currentTheme: string;
  darkModeEnabled: boolean;
  darkModePreference: 'light' | 'dark' | 'system';
}

/**
 * Get the current system settings from the database.
 * If no settings exist, returns the default values.
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    // Attempt to fetch settings
    const res = await query(`
      SELECT app_name, app_subtitle, accent_color, app_logo, timezone, language,
             current_theme, dark_mode_enabled, dark_mode_preference 
      FROM system_settings 
      ORDER BY id ASC LIMIT 1
    `);

    if (res.rows.length === 0) {
      return {
        appName: 'ISP-FinTrack',
        appSubtitle: 'Enterprise Finance',
        accentColor: 'blue',
        appLogo: '',
        timezone: 'Asia/Jakarta (UTC+07)',
        language: 'Indonesian (ID)',
        currentTheme: 'paper-white',
        darkModeEnabled: false,
        darkModePreference: 'system'
      };
    }

    const row = res.rows[0];
    return {
      appName: row.app_name || 'ISP-FinTrack',
      appSubtitle: row.app_subtitle || 'Enterprise Finance',
      accentColor: row.accent_color || 'blue',
      appLogo: row.app_logo || '',
      timezone: row.timezone || 'Asia/Jakarta (UTC+07)',
      language: row.language || 'Indonesian (ID)',
      currentTheme: row.current_theme || 'paper-white',
      darkModeEnabled: row.dark_mode_enabled === true || row.dark_mode_enabled === 't' || row.dark_mode_enabled === 'true',
      darkModePreference: (row.dark_mode_preference as any) || 'system'
    };
  } catch (e: any) {
    // If table doesn't exist yet, return defaults
    if (e.message?.includes('relation "system_settings" does not exist') || e.message?.includes('column')) {
      return {
        appName: 'ISP-FinTrack',
        appSubtitle: 'Enterprise Finance',
        accentColor: 'blue',
        appLogo: '',
        timezone: 'Asia/Jakarta (UTC+07)',
        language: 'Indonesian (ID)',
        currentTheme: 'paper-white',
        darkModeEnabled: false,
        darkModePreference: 'system'
      };
    }
    logger.error({ message: "DB Error: getSystemSettings", error: e, path: "action" });
    return {
      appName: 'ISP-FinTrack',
      appSubtitle: 'Enterprise Finance',
      accentColor: 'blue',
      appLogo: '',
      timezone: 'Asia/Jakarta (UTC+07)',
      language: 'Indonesian (ID)',
      currentTheme: 'paper-white',
      darkModeEnabled: false,
      darkModePreference: 'system'
    };
  }
}

/**
 * Update system settings in the database.
 * Requires 'System Administrator' or 'Admin Kantor' role.
 */
export async function updateSystemSettings(data: SystemSettings) {
  try {
    const adminId = await requireRole(['System Administrator', 'Admin Kantor']);
    
    // Get the name/nickname of the updater
    const creatorRes = await query('SELECT nickname FROM admin WHERE id = $1', [adminId]);
    const inputter = creatorRes.rows[0]?.nickname || 'System Administrator';

    // Update or insert the setting (we assume a single row configuration)
    const checkRes = await query('SELECT id FROM system_settings LIMIT 1');
    
    if (checkRes.rows.length === 0) {
      // Insert if empty
      const insertRes = await query(`
        INSERT INTO system_settings (
          app_name, app_subtitle, accent_color, app_logo, timezone, language,
          current_theme, dark_mode_enabled, dark_mode_preference, updated_at, inputter, inputter_tms
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, NOW())
        RETURNING *
      `, [
        data.appName, data.appSubtitle, data.accentColor, data.appLogo, data.timezone, data.language,
        data.currentTheme, data.darkModeEnabled, data.darkModePreference, inputter
      ]);
      return { success: true, settings: insertRes.rows[0] };
    } else {
      // Update existing
      const id = checkRes.rows[0].id;
      const updateRes = await query(`
        UPDATE system_settings 
        SET app_name = $1,
            app_subtitle = $2,
            accent_color = $3,
            app_logo = $4,
            timezone = $5,
            language = $6,
            current_theme = $7, 
            dark_mode_enabled = $8, 
            dark_mode_preference = $9, 
            updated_at = NOW(), 
            inputter = $10, 
            inputter_tms = NOW()
        WHERE id = $11
        RETURNING *
      `, [
        data.appName, data.appSubtitle, data.accentColor, data.appLogo, data.timezone, data.language,
        data.currentTheme, data.darkModeEnabled, data.darkModePreference, inputter, id
      ]);
      return { success: true, settings: updateRes.rows[0] };
    }
  } catch (e: any) {
    logger.error({ message: "DB Error: updateSystemSettings", error: e, path: "action" });
    throw e;
  }
}
