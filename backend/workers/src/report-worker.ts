import { Queue, Worker } from "bullmq";
import { config } from "./config";
import { runReportNotifications, ReportPeriod } from "./report-notifications";
import { monitorWorker } from "./sentry-monitor";

const connection = { host: config.redis.host, port: config.redis.port };

const worker = new Worker(
  "reports",
  async (job) => {
    const period = job.data.period as ReportPeriod;
    console.log(`\n[reports] running ${period} at ${new Date().toISOString()}`);
    await runReportNotifications(period);
  },
  { connection: { ...connection, maxRetriesPerRequest: null } }
);

monitorWorker(worker, "report");

worker.on("completed", (job) => console.log(`[reports] ${job.data?.period} completed ✓`));
worker.on("failed", (job, err) => console.error(`[reports] ${job?.data?.period} failed ✗ — ${err.message}`));

// EAT schedules: daily 22:00, weekly Friday 06:00, monthly 1st 06:00.
async function scheduleReports() {
  const queue = new Queue("reports", { connection });
  await queue.upsertJobScheduler("daily-report",   { pattern: "0 22 * * *", tz: "Africa/Mogadishu" }, { name: "report", data: { period: "daily" } });
  await queue.upsertJobScheduler("weekly-report",  { pattern: "0 6 * * 5",  tz: "Africa/Mogadishu" }, { name: "report", data: { period: "weekly" } });
  await queue.upsertJobScheduler("monthly-report", { pattern: "0 6 1 * *",  tz: "Africa/Mogadishu" }, { name: "report", data: { period: "monthly" } });
  await queue.close();
  console.log("Report worker listening. Schedules: daily 22:00, weekly Fri 06:00, monthly 1st 06:00 (EAT).");
}

scheduleReports().catch((e) => {
  console.error("Failed to register report schedules:", e);
  process.exit(1);
});