import { Worker, Job } from "bullmq";
import { config } from "./config";
import { processNotificationJob } from "./notification-processor";
import type { TransactionNotification } from "./services/notifications";

const worker = new Worker<TransactionNotification>(
  "notifications",
  async (job: Job<TransactionNotification>) => {
    console.log(`\n[notif ${job.id}] user=${job.data.userId} tx=${job.data.transactionId}`);
    await processNotificationJob(job.data);
  },
  {
    connection: {
      host: config.redis.host,
      port: config.redis.port,
      maxRetriesPerRequest: null,
    },
  }
);

worker.on("completed", (job) => console.log(`[notif ${job.id}] completed ✓`));
worker.on("failed", (job, err) => console.error(`[notif ${job?.id}] failed ✗ — ${err.message}`));

console.log("Notification worker listening on queue 'notifications'...");