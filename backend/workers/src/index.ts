import Fastify from 'fastify';
import dotenv from 'dotenv';
import "./instrument";
import './summary-worker';

// import * as Sentry from "@sentry/node";
// Sentry.captureMessage("workers sentry test");

dotenv.config();

// Start every background worker. Each module self-registers its BullMQ Worker on import.
import './worker';              // transaction-processing → processTransactionJob (parse + insert)
import './notification-worker'; // notifications         → processNotificationJob (+ FCM push)
import './report-worker';       // reports               → scheduled report notifications
import './cleanup-worker';      // cleanup               → retention cleanup

const server = Fastify({ logger: true });

server.get('/health', async () => ({
  status: 'ok',
  service: 'workers',
  timestamp: new Date().toISOString(),
}));

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3003;
    const host = process.env.HOST || '0.0.0.0';
    await server.listen({ port, host });
    console.log(`Workers service running on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();


// import Fastify from 'fastify';
// import dotenv from 'dotenv';
// import { Worker, Queue } from 'bullmq';

// dotenv.config();

// const server = Fastify({
//   logger: true
// });

// const redisConnection = {
//   host: process.env.REDIS_HOST || 'localhost',
//   port: Number(process.env.REDIS_PORT) || 6379
// };

// // Health check
// server.get('/health', async (request, reply) => {
//   return {
//     status: 'ok',
//     service: 'workers',
//     timestamp: new Date().toISOString()
//   };
// });

// // SMS processing worker
// const smsWorker = new Worker(
//   'sms-processing',
//   async (job) => {
//     console.log(`Processing job ${job.id} of type ${job.name}`);
//     console.log('Job data:', job.data);
//     // Actual SMS parsing logic will be added here later
//   },
//   { connection: redisConnection }
// );

// smsWorker.on('completed', (job) => {
//   console.log(`Job ${job.id} completed`);
// });

// smsWorker.on('failed', (job, err) => {
//   console.error(`Job ${job?.id} failed:`, err);
// });

// const start = async () => {
//   try {
//     const port = Number(process.env.PORT) || 3003;
//     const host = process.env.HOST || '0.0.0.0';
//     await server.listen({ port, host });
//     console.log(`Workers service running on port ${port}`);
//   } catch (err) {
//     server.log.error(err);
//     process.exit(1);
//   }
// };

// start();