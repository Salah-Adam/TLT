import Fastify, {FastifyError} from 'fastify'
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

// ── Global error handler ────────────────────────────────────────────────
// Catches anything a route throws that wasn't handled locally, so we never
// return Fastify's default 500 (which includes the raw error text) to a telecom.
app.setErrorHandler((error: FastifyError, request, reply) => {
  request.log.error(error)
  const status = error.statusCode ?? 500
  if (status >= 500) {
    // Our problem → tell them to retry, and reveal nothing internal.
    return reply.status(503).header('Retry-After', '30').send({ error: 'Service Unavailable' })
  }
  // 4xx (e.g. schema validation) → the message is safe and useful.
  return reply.status(status).send({ error: error.message })
})

// Webhook routes
// v5 compatible — explicit plugin wrapping
app.register(async (instance) => {
  await webhookRoutes(instance)
})

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

