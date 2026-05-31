import { NextResponse } from'next/server';
import { refreshAgingMV } from'@/actions/customers';
import { refreshPredictions } from'@/actions/predictions';
import { logger } from'@/lib/logger';
import { query } from'@/lib/db';

import { refreshDashboardMV } from'@/actions/dashboard';
import { refreshProfitabilityMV } from'@/actions/profitability';
import { refreshExecutiveMV } from'@/actions/executive';

export async function GET(request: Request) {
 try {
 const cronSecret = process.env.CRON_SECRET;
 if (!cronSecret || cronSecret.length < 32) {
 return NextResponse.json({ error:'Internal Server Configuration Error'}, { status: 500 });
 }

 const authHeader = request.headers.get('authorization');
 if (authHeader !==`Bearer ${cronSecret}`) {
 return NextResponse.json({ error:'Unauthorized'}, { status: 401 });
 }

 if (process.env.NODE_ENV ==='development') console.log("VERCEL CRON: Starting refresh of materialized views...");
 
 await Promise.all([
 refreshAgingMV(),
 refreshPredictions(),
 refreshDashboardMV(),
 refreshProfitabilityMV(),
 refreshExecutiveMV()
 ]);

 // Clean up old system logs, login logs (> 30 days) and expired rate limits
 await query("DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL'30 days'");
 await query("DELETE FROM login_logs WHERE login_timestamp < NOW() - INTERVAL'30 days'");
 await query("DELETE FROM rate_limits WHERE expire_at < NOW()");
 
 if (process.env.NODE_ENV ==='development') console.log("VERCEL CRON: Refresh and log cleanup completed successfully.");
 return NextResponse.json({ success: true, message:'Cron job executed successfully'});
 } catch (error: unknown) {
 const err = error instanceof Error ? error : new Error(String(error));
 logger.error({ message:"VERCEL CRON ERROR:", error: err, path:"server"});
 return NextResponse.json({ error:'Internal Server Error', details: err.message }, { status: 500 });
 }
}
