
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const cron = await import("node-cron");
    const { refreshAgingMV } = await import("./actions/customers");
    const { refreshPredictions } = await import("./actions/predictions");

    // 1. Jalankan job SEGERA saat server aktif (Startup Job)
    console.log("STARTUP: Running initial refresh of materialized views...");
    refreshAgingMV().catch(err => console.error("STARTUP ERROR: Failed initial aging refresh", err));
    refreshPredictions().catch(err => console.error("STARTUP ERROR: Failed initial prediction refresh", err));

    // 2. Jadwalkan refresh rutin setiap hari pukul 00:00 WIB
    cron.schedule("0 0 * * *", async () => {
      console.log("SCHEDULED TASK: Starting daily refresh of materialized views...");
      try {
        await Promise.all([
          refreshAgingMV(),
          refreshPredictions()
        ]);
        console.log("SCHEDULED TASK: Refresh completed successfully.");
      } catch (err) {
        console.error("SCHEDULED TASK ERROR: Refresh failed", err);
      }
    }, {
      timezone: "Asia/Jakarta"
    });

    console.log("CRON: Daily refresh scheduler registered (00:00 WIB) + Startup jobs triggered.");
  }
}
