const express = require("express");
const { Queue } = require("bullmq");
const { createBullBoard } = require("@bull-board/api");
const { BullMQAdapter } = require("@bull-board/api/bullMQAdapter");
const { ExpressAdapter } = require("@bull-board/express");

const connection = { host: "localhost", port: 6379 };
const queues = ["transaction-processing", "summaries", "notifications", "cleanup", "reports"]
  .map((name) => new BullMQAdapter(new Queue(name, { connection })));

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");
createBullBoard({ queues, serverAdapter });

const app = express();
app.use("/admin/queues", serverAdapter.getRouter());
app.listen(3010, () => console.log("Bull Board -> http://localhost:3010/admin/queues"));