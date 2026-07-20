import { Queue, Worker } from "bullmq";
import { config } from "./config";
import { runCleanup } from "./cleanup";
import { monitorWorker } from "./sentry-monitor";

const connection = { host: config.redis.host, port: config.redis.port };

// 1. The worker — runs the cleanup whenever a job lands on the "cleanup"
//    queue, whether from the nightly schedule or a manual trigger.
const worker = new Worker(
  "cleanup",
  async () => {
    console.log(`\n[cleanup] running at ${new Date().toISOString()}`);
    await runCleanup();
  },
  { connection: { ...connection, maxRetriesPerRequest: null } }
);

monitorWorker(worker, "cleanup");

worker.on("completed", () => console.log("[cleanup] run completed ✓"));
worker.on("failed", (_job, err) => console.error(`[cleanup] run failed ✗ — ${err.message}`));

// 2. Register (or update) the nightly schedule — every day at 03:00 EAT.
async function scheduleNightly() {
  const queue = new Queue("cleanup", { connection });
  await queue.upsertJobScheduler(
    "nightly-cleanup",
    { pattern: "0 3 * * *", tz: "Africa/Mogadishu" },
    { name: "cleanup-run" }
  );
  await queue.close();
  console.log("Cleanup worker listening. Nightly schedule set for 03:00 EAT.");
}

scheduleNightly().catch((e) => {
  console.error("Failed to register cleanup schedule:", e);
  process.exit(1);
});