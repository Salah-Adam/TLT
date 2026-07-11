import { Worker, Job } from "bullmq";
import { config } from "./config";
import { processNotificationJob, pushStoredNotification } from "./notification-processor";
import type { TransactionNotification } from "./services/notifications";

const worker = new Worker(
  "notifications",
  async (job: Job) => {
    if (job.name === "stored") {
      const { notificationId, userId } = job.data as { notificationId: string; userId: string };
      console.log(`\n[notif ${job.id}] stored push id=${notificationId}`);
      await pushStoredNotification(notificationId, userId);
      return;
    }
    const d = job.data as TransactionNotification;
    console.log(`\n[notif ${job.id}] user=${d.userId} tx=${d.transactionId}`);
    await processNotificationJob(d);
  },
  { connection: { host: config.redis.host, port: config.redis.port, maxRetriesPerRequest: null } }
);

worker.on("completed", (job) => console.log(`[notif ${job.id}] completed ✓`));
worker.on("failed", (job, err) => console.error(`[notif ${job?.id}] failed ✗ — ${err.message}`));

console.log("Notification worker listening on queue 'notifications'...");



// import { Worker, Job } from "bullmq";
// import { config } from "./config";
// import { processNotificationJob } from "./notification-processor";
// import type { TransactionNotification } from "./services/notifications";

// const worker = new Worker<TransactionNotification>(
//   "notifications",
//   async (job: Job<TransactionNotification>) => {
//     console.log(`\n[notif ${job.id}] user=${job.data.userId} tx=${job.data.transactionId}`);
//     await processNotificationJob(job.data);
//   },
//   {
//     connection: {
//       host: config.redis.host,
//       port: config.redis.port,
//       maxRetriesPerRequest: null,
//     },
//   }
// );

// worker.on("completed", (job) => console.log(`[notif ${job.id}] completed ✓`));
// worker.on("failed", (job, err) => console.error(`[notif ${job?.id}] failed ✗ — ${err.message}`));

// console.log("Notification worker listening on queue 'notifications'...");