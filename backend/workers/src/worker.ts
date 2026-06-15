import { Worker, Job } from "bullmq";
import { config } from "./config";
import { NormalisedStructuredJob } from "./types/job";
import { processTransactionJob } from "./processor";

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

worker.on("completed", (job) => console.log(`[job ${job.id}] completed ✓`));
worker.on("failed", (job, err) => console.error(`[job ${job?.id}] failed ✗ — ${err.message}`));

console.log("Transaction worker listening on queue 'transaction-processing'...");




// import { Worker, Job } from "bullmq";
// import { config } from "./config";
// import { NormalisedStructuredJob } from "./types/job";
// import { parsePayload } from "./services/parser";

// const worker = new Worker<NormalisedStructuredJob>(
//   "transaction-processing",
//   async (job: Job<NormalisedStructuredJob>) => {
//     const data = job.data;
//     console.log(`\n[job ${job.id}] provider=${data.provider} user=${data.userId}`);

//     const result = await parsePayload(
//       data.provider,
//       data.structuredPayload,
//       data.receivedAt
//     );

//     console.log(`  parsed : ${result.type} / ${result.direction} / ${result.amount} ${result.currency}`);
//     console.log(`  party  : ${result.counterparty_name} / ${result.counterparty_number}`);
//     console.log(`  balance: ${result.balance}  fee: ${result.service_charge}  conf: ${result.confidence}`);
//   },
//   {
//     connection: {
//       host: config.redis.host,
//       port: config.redis.port,
//       maxRetriesPerRequest: null,
//     },
//   }
// );

// worker.on("completed", (job) => console.log(`[job ${job.id}] completed ✓`));
// worker.on("failed", (job, err) => console.error(`[job ${job?.id}] failed ✗ — ${err.message}`));

// console.log("Transaction worker listening on queue 'transaction-processing'...");