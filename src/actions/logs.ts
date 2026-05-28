'use server';

import { query, ensureLogsTableExists } from'@/lib/db';
import { requireRole } from'@/lib/auth';
import { logger } from'@/lib/logger';

export async function getSystemLogs() {
 try {
 // Only System Administrator and Admin Kantor can read system logs
 await requireRole(['System Administrator','Admin Kantor']);
 await ensureLogsTableExists();
 
 const res = await query(`
 SELECT id, level, message, context, error_stack, path, user_id, environment, 
 is_resolved, created_at AT TIME ZONE'Asia/Jakarta'as timestamp
 FROM system_logs
 ORDER BY created_at DESC
 LIMIT 500
`);
 
 return res.rows;
 } catch (err) {
 logger.error({ message:'Failed to fetch system logs:', error: err, path:'action'});
 return [];
 }
}

export async function clearSystemLogs() {
 try {
 // Only System Administrator and Admin Kantor can clear system logs
 await requireRole(['System Administrator','Admin Kantor']);
 await ensureLogsTableExists();
 
 await query('DELETE FROM system_logs');
 
 console.log('System logs cleared manually by admin');
 return { success: true };
 } catch (err) {
 logger.error({ message:'Failed to clear system logs:', error: err, path:'action'});
 return { success: false, error: String(err) };
 }
}

export async function resolveSystemLog(logId: number, resolved: boolean) {
 try {
 // Only System Administrator and Admin Kantor can resolve system logs
 await requireRole(['System Administrator','Admin Kantor']);
 await ensureLogsTableExists();
 
 await query('UPDATE system_logs SET is_resolved = $1 WHERE id = $2', [resolved, logId]);
 
 console.log(`System log ID ${logId} marked as ${resolved ?'Resolved':'Unresolved'}`);
 return { success: true };
 } catch (err) {
 logger.error({ message:`Failed to resolve system log ${logId}:`, error: err, path:'action'});
 return { success: false, error: String(err) };
 }
}
