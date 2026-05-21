import { NextResponse } from 'next/server';
import { refreshAgingMV } from '@/actions/customers';
import { refreshPredictions } from '@/actions/predictions';
import { logger } from '@/lib/logger';

import { refreshDashboardMV } from '@/actions/dashboard';
import { refreshProfitabilityMV } from '@/actions/profitability';
import { refreshExecutiveMV } from '@/actions/executive';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (process.env.NODE_ENV === 'development') console.log("VERCEL CRON: Starting refresh of materialized views...");
    
    await Promise.all([
      refreshAgingMV(),
      refreshPredictions(),
      refreshDashboardMV(),
      refreshProfitabilityMV(),
      refreshExecutiveMV()
    ]);
    
    if (process.env.NODE_ENV === 'development') console.log("VERCEL CRON: Refresh completed successfully.");
    return NextResponse.json({ success: true, message: 'Cron job executed successfully' });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ message: "VERCEL CRON ERROR:", error: err, path: "server" });
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
