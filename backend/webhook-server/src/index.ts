import Fastify from 'fastify'
import helmet from '@fastify/helmet'
import { config } from './config'
import { webhookRoutes } from './routes/webhooks'

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty' }   // readable logs in development
      : undefined,                   // JSON logs in production
  },
})

// Security headers on every response
app.register(helmet)

// Webhook routes
// v5 compatible — explicit plugin wrapping
app.register(async (instance) => {
  await webhookRoutes(instance)
})
// app.register(webhookRoutes)

// Health check — kept from Phase 1
app.get('/health', async () => {
  return {
    status: 'ok',
    service: 'webhook-server',
    timestamp: new Date().toISOString(),
  }
})

// Start server
const start = async (): Promise<void> => {
  try {
    await app.listen({
      port: config.server.port,
      host: config.server.host,
    })
    console.log(`Webhook server running on port ${config.server.port}`)
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

start()