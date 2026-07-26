import Fastify from 'fastify';
import dotenv from 'dotenv';
import "./instrument";
import './summary-worker';

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

