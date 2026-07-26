// Standalone Bull Board — an ops dashboard for the BullMQ queues.
// Run from THIS folder:  node bull-board.js  ->  http://localhost:3010/admin/queues
// It can READ job payloads and RETRY/DELETE jobs, so it must never be public.

const express = require("express");
const { Queue } = require("bullmq");
const { createBullBoard } = require("@bull-board/api");
const { BullMQAdapter } = require("@bull-board/api/bullMQAdapter");
const { ExpressAdapter } = require("@bull-board/express");

// 127.0.0.1 (not "localhost") avoids the IPv6 ::1 gotcha.
const connection = { host: "127.0.0.1", port: 6379 };

const QUEUE_NAMES = ["transaction-processing", "summaries", "notifications", "cleanup", "reports"];
const queues = QUEUE_NAMES.map((name) => new BullMQAdapter(new Queue(name, { connection })));

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");
createBullBoard({ queues, serverAdapter });

const app = express();

// ── Auth ─────────────────────────────────────────────────────────────────────
// DEV: no password needed — the localhost bind below makes this unreachable from
// the network, which is the protection.
//
// TO EXPOSE ON A SERVER LATER:
//   1) `npm i express-basic-auth`
//   2) uncomment this block
//   3) change the listen() host from "127.0.0.1" to "0.0.0.0"
//   4) set a strong BULLBOARD_PASSWORD in the environment (never commit it)
//   ...and ideally keep it behind a VPN / reverse proxy on top of this.
//
// const basicAuth = require("express-basic-auth");
// app.use("/admin/queues", basicAuth({
//   users: { admin: process.env.BULLBOARD_PASSWORD || "" },
//   challenge: true,   // shows the browser login prompt
// }));

app.use("/admin/queues", serverAdapter.getRouter());

// Bind to localhost ONLY — not reachable from other machines.
app.listen(3010, "127.0.0.1", () => {
  console.log("Bull Board -> http://localhost:3010/admin/queues  (localhost only)");
});


// const express = require("express");
// const { Queue } = require("bullmq");
// const { createBullBoard } = require("@bull-board/api");
// const { BullMQAdapter } = require("@bull-board/api/bullMQAdapter");
// const { ExpressAdapter } = require("@bull-board/express");

// const connection = { host: "localhost", port: 6379 };
// const queues = ["transaction-processing", "summaries", "notifications", "cleanup", "reports"]
//   .map((name) => new BullMQAdapter(new Queue(name, { connection })));

// const serverAdapter = new ExpressAdapter();
// serverAdapter.setBasePath("/admin/queues");
// createBullBoard({ queues, serverAdapter });

// const app = express();
// app.use("/admin/queues", serverAdapter.getRouter());
// app.listen(3010, () => console.log("Bull Board -> http://localhost:3010/admin/queues"));