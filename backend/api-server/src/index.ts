import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';

dotenv.config();

const server = Fastify({
  logger: true
});

server.register(cors, {
  origin: true
});

// Health check
server.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    service: 'api-server',
    timestamp: new Date().toISOString()
  };
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3002;
    const host = process.env.HOST || '0.0.0.0';
    await server.listen({ port, host });
    console.log(`API server running on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();