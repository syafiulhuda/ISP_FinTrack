import { refreshAgingMV } from "./actions/customers";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const cron = await import("node-cron");
    const { refreshAgingMV } = await import("./actions/customers");

    // 1. Jalankan job SEGERA saat server aktif (Startup Job)
    console.log("STARTUP: Running initial refresh of ar_aging_mv...");
    refreshAgingMV().catch(err => console.error("STARTUP ERROR: Failed initial refresh", err));

    // 2. Jadwalkan refresh rutin setiap hari pukul 00:00 WIB
    cron.schedule("0 0 * * *", async () => {
      console.log("SCHEDULED TASK: Starting daily refresh of ar_aging_mv...");
      await refreshAgingMV();
    }, {
      timezone: "Asia/Jakarta"
    });

    console.log("CRON: Daily refresh scheduler registered (00:00 WIB) + Startup job triggered.");
  }
}
