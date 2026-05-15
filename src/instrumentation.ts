
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const cron = await import("node-cron");
    const { refreshAgingMV } = await import("./actions/customers");
    const { refreshPredictions } = await import("./actions/predictions");
    const { refreshDashboardMV } = await import("./actions/dashboard");
    const { refreshProfitabilityMV } = await import("./actions/profitability");
    const { refreshExecutiveMV } = await import("./actions/executive");

    // 1. Jalankan job SEGERA saat server aktif (Startup Job)
    // Semua MV di-refresh secara non-blocking agar TTFB tidak terpengaruh
    console.log("STARTUP: Running initial refresh of all materialized views...");
    refreshAgingMV().catch(err => console.error("STARTUP ERROR: Failed initial aging refresh", err));
    refreshPredictions().catch(err => console.error("STARTUP ERROR: Failed initial prediction refresh", err));
    refreshDashboardMV().catch(err => console.error("STARTUP ERROR: Failed initial dashboard MV refresh", err));
    refreshProfitabilityMV().catch(err => console.error("STARTUP ERROR: Failed initial profitability MV refresh", err));
    refreshExecutiveMV().catch(err => console.error("STARTUP ERROR: Failed initial executive MV refresh", err));

    // Disable node-cron on Vercel to save memory (use Vercel Cron instead)
    if (process.env.VERCEL !== "1") {
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
        timezone: "Asia/Jakarta"
      });

      console.log("CRON: Daily refresh scheduler registered (00:00 WIB) + Startup jobs triggered.");
    } else {
      console.log("CRON: Running on Vercel. Native node-cron disabled. Using Vercel Cron.");
    }
  }
}
