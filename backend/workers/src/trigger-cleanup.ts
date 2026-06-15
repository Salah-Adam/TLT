import { Queue } from "bullmq";
import { config } from "./config";

async function main() {
  const queue = new Queue("cleanup", {
    connection: { host: config.redis.host, port: config.redis.port },
  });
  await queue.add("cleanup-run", {});
  console.log("Enqueued a one-off cleanup job.");
  await queue.close();
}

main().catch((e) => { console.error(e); process.exit(1); });