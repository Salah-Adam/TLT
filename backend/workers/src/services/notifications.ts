import { Queue } from "bullmq";
import { config } from "../config";

// The shape Step 4's notification worker will consume.
export interface TransactionNotification {
  userId: string;
  transactionId: string;
  direction: "in" | "out";
  amount: number;
  currency: string;
  balanceAfter: number | null;
}

const notificationQueue = new Queue("notifications", {
  connection: { host: config.redis.host, port: config.redis.port },
});

/**
 * Queue a push for a processed transaction. Best-effort by design:
 * a transaction is already safely committed before we get here, so a
 * failure to queue the notification must NOT fail the job (which would
 * pointlessly retry the whole transaction). We log and move on.
 */
export async function enqueueTransactionNotification(n: TransactionNotification): Promise<void> {
  try {
    await notificationQueue.add("transaction", n, {
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  } catch (err) {
    console.error(`  notification enqueue failed: ${(err as Error).message}`);
  }
}

// Lets short-lived scripts/tests close the Redis connection and exit cleanly.
export async function closeNotificationQueue(): Promise<void> {
  await notificationQueue.close();
}