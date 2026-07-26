import { Worker, Job } from "bullmq";
import { config } from "./config";
import { NormalisedStructuredJob } from "./types/job";
import { processTransactionJob } from "./processor";
import { monitorWorker } from "./sentry-monitor";

const worker = new Worker<NormalisedStructuredJob>(
  "transaction-processing",
  async (job: Job<NormalisedStructuredJob>) => {
    console.log(`\n[job ${job.id}] provider=${job.data.provider} user=${job.data.userId}`);
    await processTransactionJob(job.data);
  },
  {
    connection: {
      host: config.redis.host,
      port: config.redis.port,
      maxRetriesPerRequest: null,
    },
  }
);
// …after const worker = new Worker(...):
monitorWorker(worker, "transaction");


worker.on("completed", (job) => console.log(`[job ${job.id}] completed ✓`));
worker.on("failed", (job, err) => console.error(`[job ${job?.id}] failed ✗ — ${err.message}`));

console.log("Transaction worker listening on queue 'transaction-processing'...");


