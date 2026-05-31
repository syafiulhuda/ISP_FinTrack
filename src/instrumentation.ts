export async function register() {
 if (process.env.NEXT_RUNTIME ==="nodejs") {
 const cron = await import("node-cron");
 const { refreshAgingMV } = await import("./actions/customers");
 const { refreshPredictions } = await import("./actions/predictions");
 const { refreshDashboardMV } = await import("./actions/dashboard");
 const { refreshProfitabilityMV } = await import("./actions/profitability");
 const { refreshExecutiveMV } = await import("./actions/executive");
 const { pool } = await import("./lib/db");

 // 0. WARM UP DATABASE POOL
 console.log("STARTUP: Warming up DB pool...");
 pool.query("SELECT 1").catch(err => console.error("STARTUP ERROR: DB Warmup failed", err));

  // Helper: retry async fn up to maxRetries times with delay
  const withRetry = async (fn: () => Promise<unknown>, name: string, maxRetries = 3, delayMs = 2000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await fn();
        return;
      } catch (err) {
        console.error(`STARTUP ERROR: ${name} failed (attempt ${attempt}/${maxRetries})`, err);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          console.error(`STARTUP ERROR: ${name} permanently failed after ${maxRetries} attempts.`);
        }
      }
    }
  };

  // 1. Jalankan job SEGERA saat server aktif (Startup Job)
  // Semua MV di-refresh secara non-blocking agar TTFB tidak terpengaruh
  console.log("STARTUP: Running initial refresh of all materialized views...");
  withRetry(refreshAgingMV, "Aging MV");
  withRetry(refreshPredictions, "Predictions MV");
  withRetry(refreshDashboardMV, "Dashboard MV");
  withRetry(refreshProfitabilityMV, "Profitability MV");
  withRetry(refreshExecutiveMV, "Executive MV");

 // Disable node-cron on Vercel to save memory (use Vercel Cron instead)
 if (process.env.VERCEL !=="1") {
 // 2. Jadwalkan refresh rutin setiap hari pukul 00:00 WIB
 cron.schedule("0 0 * * *", async () => {
 console.log("SCHEDULED TASK: Starting daily refresh of all materialized views...");
 try {
 await Promise.all([
 refreshAgingMV(),
 refreshPredictions(),
 refreshDashboardMV(),
 refreshProfitabilityMV(),
 refreshExecutiveMV(),
 ]);
 console.log("SCHEDULED TASK: All materialized views refreshed successfully.");
 } catch (err) {
 console.error("SCHEDULED TASK ERROR: Refresh failed", err);
 }
 }, {
 timezone:"Asia/Jakarta"
 });

 console.log("CRON: Daily refresh scheduler registered (00:00 WIB) + Startup jobs triggered.");
 } else {
 console.log("CRON: Running on Vercel. Native node-cron disabled. Using Vercel Cron.");
 }
 }
}
