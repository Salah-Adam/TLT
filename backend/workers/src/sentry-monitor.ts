import * as Sentry from "@sentry/node";
import type { Worker } from "bullmq";

// BullMQ turns a throwing job into a 'failed' event — it never crashes the process, so
// failures are otherwise silent. Report them (and worker-level errors) to Sentry.
export function monitorWorker(worker: Worker, name: string): void {
  worker.on("failed", (job, err) => {
    Sentry.captureException(err, { tags: { worker: name }, extra: { jobId: job?.id, jobName: job?.name } });
  });
  worker.on("error", (err) => { Sentry.captureException(err, { tags: { worker: name } }); });
}