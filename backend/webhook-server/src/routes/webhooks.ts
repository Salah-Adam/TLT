import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { validateWebhookToken } from '../services/auth'
import { transactionQueue } from '../queue'
import { NormalisedStructuredJob } from '../types/webhook'

const SUPPORTED_PROVIDERS = ['evcplus', 'edahab'] as const
type Provider = typeof SUPPORTED_PROVIDERS[number]

interface WebhookParams {
  provider: Provider
}

export async function webhookRoutes(app: FastifyInstance): Promise<void> {

  app.post<{ Params: WebhookParams }>(
    '/webhooks/:provider',
    {
      schema: {
        params: {
          type: 'object',
          required: ['provider'],
          properties: {
            provider: { type: 'string', enum: SUPPORTED_PROVIDERS },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: WebhookParams }>, reply: FastifyReply) => {

      const { provider } = request.params

      // Step 1 — Validate token against database
      const token = request.headers['x-webhook-token'] as string | undefined

      let phoneNumber
      try {
        phoneNumber = await validateWebhookToken(token, provider)
      } catch (err) {
        // We could not VERIFY the token (DB down, pool exhausted, timeout).
        // That's our fault, not the provider's — 503 tells them to retry.
        // A 401 here would make them treat it as permanent and drop the message.
        app.log.error({ event: 'webhook_token_check_failed', provider, err })
        return reply.status(503).header('Retry-After', '30').send({ error: 'Service Unavailable' })
      }

      if (!phoneNumber) {
        app.log.warn({
          event:    'unauthorized_webhook',
          provider,
          ip:       request.ip,
          hasToken: !!token,
        })
        return reply.status(401).send({ error: 'Unauthorized' })
      }

      // Step 2 — Build the normalised job
      // Pass the entire structured JSON payload as-is.
      // The Python adapter on the parser service extracts everything it needs.
      const normalisedJob: NormalisedStructuredJob = {
        provider,
        phoneNumberId:     phoneNumber.id,
        userId:            phoneNumber.user_id,
        receivedAt:        new Date().toISOString(),
        structuredPayload: request.body as Record<string, unknown>,
      }

      // Step 3 — Push to queue
      try {
        await transactionQueue.add(
          `webhook-${provider}`,
          normalisedJob,
          { jobId: `${provider}-${phoneNumber.id}-${Date.now()}` }
        )
      } catch (err) {
        // Could NOT durably queue the job (Redis down/unreachable).
        // Do NOT ack — an ack here would lose the message permanently.
        app.log.error({ event: 'webhook_enqueue_failed', provider, phoneNumberId: phoneNumber.id, err })
        return reply.status(503).header('Retry-After', '30').send({ error: 'Service Unavailable' })
      }

      // Step 4 — Respond immediately
      return reply.status(200).send({ received: true })
    }
  )

  app.post('/webhooks/*', async (_request, reply) => {
    return reply.status(404).send({ error: 'Unknown provider' })
  })
}

