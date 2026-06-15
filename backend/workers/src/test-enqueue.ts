import { Queue } from "bullmq";
import { config } from "./config";

const queue = new Queue("transaction-processing", {
  connection: {
    host: config.redis.host,
    port: config.redis.port,
  },
});

const sampleJob = {
  provider: "evcplus",
  phoneNumberId: "00000000-0000-0000-0000-000000000000",
  userId: "00000000-0000-0000-0000-000000000000",
  receivedAt: new Date().toISOString(),
  structuredPayload: {
    event_id: "evt_test_1",
    event_type: "transaction.completed",
    created_at: "2026-06-13T11:34:22Z",
    api_version: "2026-01-01",
    data: {
      transaction_id: "TXN773019284",
      channel: "EVC_PLUS",
      type: "SEND_MONEY",
      currency: "USD",
      amount: 1.0,
      fee: 0.0,
      user_phone: "252610838368",
      counterparty: {
        phone: "252610838369",
        name: "FARDOWSA MAXAMED MAXAMUUD",
        type: "INDIVIDUAL",
      },
      user_running_balance: 7.36,
      status: "SUCCESS",
    },
  },
};

async function main() {
  const job = await queue.add("webhook-evcplus", sampleJob, { jobId: `test-${Date.now()}` });
  console.log("Enqueued job:", job.id);
  await queue.close();
}

main().catch((e) => { console.error(e); process.exit(1); });