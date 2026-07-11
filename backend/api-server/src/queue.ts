import { Queue } from "bullmq";
import { config } from "./config";

// Same "notifications" queue the workers consume. We enqueue a "stored" job so the
// worker (which owns FCM) pushes an already-inserted notification by id.
const notificationQueue = new Queue("notifications", {
  connection: { host: config.redis.host, port: config.redis.port },
});

// Best-effort: the notification row is already committed, so a queue failure must
// NEVER fail the request. Log and move on.
export async function enqueueStoredPush(notificationId: string, userId: string): Promise<void> {
  try {
    await notificationQueue.add("stored", { notificationId, userId }, {
      removeOnComplete: 1000, removeOnFail: 5000,
    });
  } catch (err) {
    console.error(`stored-push enqueue failed: ${(err as Error).message}`);
  }
}