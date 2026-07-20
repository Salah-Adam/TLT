// edits aren't in summaries. So the only trigger is a category change → recompute that transaction's day + month.
// I'll do it by enqueuing a recompute job to the worker, so the recompute logic stays in exactly one place (the workers' summaries.ts) — no risk of a second copy drifting from the worker/backfill. Touches api-server + workers → rebuild both.

import { Worker, Job } from "bullmq";
import { config } from "./config";
import { pool } from "./db";
import { recomputeDailySummary, recomputeMonthlySummary } from "./services/summaries";
import { monitorWorker } from "./sentry-monitor";

type RecomputeJob = { userId: string; phoneNumberId: string; date: string; year: number; month: number };

const worker = new Worker<RecomputeJob>(
  "summaries",
  async (job: Job<RecomputeJob>) => {
    const { userId, phoneNumberId, date, year, month } = job.data;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await recomputeDailySummary(client, userId, phoneNumberId, date);
      await recomputeMonthlySummary(client, userId, phoneNumberId, year, month);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  },
  { connection: { host: config.redis.host, port: config.redis.port, maxRetriesPerRequest: null } }
);
monitorWorker(worker, "summaries");
worker.on("completed", (job) => console.log(`[summaries ${job.id}] recomputed ✓`));
console.log("Summary worker listening on queue 'summaries'...");