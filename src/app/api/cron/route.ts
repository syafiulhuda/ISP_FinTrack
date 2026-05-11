import { NextResponse } from 'next/server';
import { refreshAgingMV } from '@/actions/customers';
import { refreshPredictions } from '@/actions/predictions';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("VERCEL CRON: Starting refresh of materialized views...");
    
    await Promise.all([
      refreshAgingMV(),
      refreshPredictions()
    ]);
    
    console.log("VERCEL CRON: Refresh completed successfully.");
    return NextResponse.json({ success: true, message: 'Cron job executed successfully' });
  } catch (error: any) {
    console.error("VERCEL CRON ERROR:", error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
