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
      const phoneNumber = await validateWebhookToken(token, provider)

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
      await transactionQueue.add(
        `webhook-${provider}`,
        normalisedJob,
        { jobId: `${provider}-${phoneNumber.id}-${Date.now()}` }
      )

      app.log.info({
        event:         'webhook_queued',
        provider,
        phoneNumberId: phoneNumber.id,
        userId:        phoneNumber.user_id,
      })

      // Step 4 — Respond immediately
      return reply.status(200).send({ received: true })
    }
  )

  app.post('/webhooks/*', async (_request, reply) => {
    return reply.status(404).send({ error: 'Unknown provider' })
  })
}



// ---------------------------------

// import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
// import { validateWebhookToken } from '../services/auth'
// import { transactionQueue } from '../queue'
// import {
//   RawWebhookPayload,
//   EVCPlusWebhookPayload,
//   EDahabWebhookPayload,
//   NormalisedStructuredJob
//   // NormalisedSMSJob
// } from '../types/webhook'

// const SUPPORTED_PROVIDERS = ['evcplus', 'edahab'] as const
// type Provider = typeof SUPPORTED_PROVIDERS[number]

// interface WebhookParams {
//   provider: Provider
// }

// // ── Provider-specific SMS extraction ─────────────────────────────────────────
// // Each provider sends the SMS text in the same "message" field,
// // but other fields differ (msisdn vs sender/receiver).
// // These small functions know each provider's payload shape.
// // The route handler calls them and gets back the same simple object.
// // This is the normalisation — provider differences handled here,
// // never seen by anything downstream.

// function extractEVCPlus(payload: EVCPlusWebhookPayload): { rawMessage: string | null, senderNumber: string | null } {
//   return {
//     rawMessage:   payload.message   || null,
//     // msisdn is the subscriber's own number — the account that made the transaction
//     senderNumber: payload.msisdn    || null,
//   }
// }

// function extractEDahab(payload: EDahabWebhookPayload): { rawMessage: string | null, senderNumber: string | null } {
//   return {
//     rawMessage:   payload.message  || null,
//     // eDahab sends both sender and receiver — we store sender
//     // (the one who initiated the transaction)
//     senderNumber: payload.sender   || payload.receiver || null,
//   }
// }

// // Map provider names to their extraction functions
// // When adding Telesom or Sahal, add one line here
// const EXTRACTORS: Record<string, (payload: RawWebhookPayload) => { rawMessage: string | null, senderNumber: string | null }> = {
//   evcplus: (p) => extractEVCPlus(p as EVCPlusWebhookPayload),
//   edahab:  (p) => extractEDahab(p  as EDahabWebhookPayload),
// }

// export async function webhookRoutes(app: FastifyInstance): Promise<void> {

//   app.post<{ Params: WebhookParams }>(
//     '/webhooks/:provider',
//     {
//       schema: {
//         params: {
//           type: 'object',
//           required: ['provider'],
//           properties: {
//             provider: { type: 'string', enum: SUPPORTED_PROVIDERS },
//           },
//         },
//       },
//     },
//     async (request: FastifyRequest<{ Params: WebhookParams }>, reply: FastifyReply) => {

//       const { provider } = request.params

//       // Step 1 — Validate token against database
//       const token = request.headers['x-webhook-token'] as string | undefined

//       const phoneNumber = await validateWebhookToken(token, provider)

//       if (!phoneNumber) {
//         app.log.warn({
//           event:    'unauthorized_webhook',
//           provider,
//           ip:       request.ip,
//           hasToken: !!token,
//         })
//         return reply.status(401).send({ error: 'Unauthorized' })
//       }

//       // Step 2 — Extract and normalise the payload
//       // Get the correct extractor for this provider
//       const extractor = EXTRACTORS[provider]
//       const { rawMessage, senderNumber } = extractor(request.body as RawWebhookPayload)

//       // Guard: if SMS text is missing, log and reject
//       // A webhook with no SMS text cannot be processed
//       if (!rawMessage) {
//         app.log.error({
//           event:    'webhook_missing_message',
//           provider,
//           phoneNumberId: phoneNumber.id,
//         })
//         return reply.status(400).send({ error: 'Missing SMS message in payload' })
//       }

//       // Step 3 — Build the normalised job
//       // The worker always reads rawMessage — it never sees the raw payload shape
//       // Step 3 — Build the normalised job
//       // Pass the entire structured payload — the Python adapter
//       // handles all field extraction on the parser service side
//       const normalisedJob: NormalisedStructuredJob = {
//         provider,
//         phoneNumberId: phoneNumber.id,
//         userId:        phoneNumber.user_id,
//         receivedAt:    new Date().toISOString(),
//         structuredPayload: request.body as Record<string, unknown>,
//       }

//       // Step 4 — Push to queue
//       await transactionQueue.add(
//         `webhook-${provider}`,
//         normalisedJob,
//         { jobId: `${provider}-${phoneNumber.id}-${Date.now()}` }
//       )

//       // const normalisedJob: NormalisedSMSJob = {
//       //   provider,
//       //   phoneNumberId: phoneNumber.id,
//       //   userId:        phoneNumber.user_id,
//       //   receivedAt:    new Date().toISOString(),
//       //   rawMessage,     // the SMS text extracted from this provider's payload
//       //   senderNumber,   // the phone number, extracted consistently regardless of field name
//       // }

//       // // Step 4 — Push normalised job into queue
//       // await transactionQueue.add(
//       //   `webhook-${provider}`,
//       //   normalisedJob,
//       //   {
//       //     jobId: `${provider}-${phoneNumber.id}-${Date.now()}`,
//       //   }
//       // )

//       app.log.info({
//         event:         'webhook_queued',
//         provider,
//         phoneNumberId: phoneNumber.id,
//         userId:        phoneNumber.user_id,
//       })

//       // Step 5 — Respond immediately
//       return reply.status(200).send({ received: true })
//     }
//   )

//   app.post('/webhooks/*', async (_request, reply) => {
//     return reply.status(404).send({ error: 'Unknown provider' })
//   })
// }


// ---------------------------------------------------------



// import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
// import { validateWebhookToken } from '../services/auth'
// import { transactionQueue } from '../queue'
// import { RawWebhookPayload } from '../types/webhook'

// // Supported providers — matches providers.code in database
// const SUPPORTED_PROVIDERS = ['evcplus', 'edahab'] as const
// type Provider = typeof SUPPORTED_PROVIDERS[number]

// interface WebhookParams {
//   provider: Provider
// }

// export async function webhookRoutes(app: FastifyInstance): Promise<void> {

//   // Single route handles all providers via :provider param
//   // POST /webhooks/evcplus
//   // POST /webhooks/edahab
//   // POST /webhooks/telesom
//   // POST /webhooks/sahal
//   app.post<{ Params: WebhookParams }>(
//     '/webhooks/:provider',
//     {
//       schema: {
//         params: {
//           type: 'object',
//           required: ['provider'],
//           properties: {
//             provider: {
//               type: 'string',
//               enum: SUPPORTED_PROVIDERS,
//             },
//           },
//         },
//       },
//     },
//     async (request: FastifyRequest<{ Params: WebhookParams }>, reply: FastifyReply) => {

//       const { provider } = request.params

//       // Step 1 — Extract token from header
//       const token = request.headers['x-webhook-token'] as string | undefined

//       // Step 2 — Validate token against database
//       const phoneNumber = await validateWebhookToken(token, provider)

//       if (!phoneNumber) {
//         // Log unauthorized attempt without exposing why it failed
//         app.log.warn({
//           event: 'unauthorized_webhook',
//           provider,
//           ip: request.ip,
//           hasToken: !!token,
//         })
//         return reply.status(401).send({ error: 'Unauthorized' })
//       }

//       // Step 3 — Push job to queue immediately
//       const jobData = {
//         provider,
//         phoneNumberId: phoneNumber.id,
//         userId: phoneNumber.user_id,
//         rawWebhook: request.body as RawWebhookPayload,
//         receivedAt: new Date().toISOString(),
//       }

//       await transactionQueue.add(
//         `webhook-${provider}`,  // job name for filtering in dashboard
//         jobData,
//         {
//           // Job ID based on content helps with deduplication at queue level
//           // Full idempotency check happens in the worker
//           jobId: `${provider}-${phoneNumber.id}-${Date.now()}`,
//         }
//       )

//       app.log.info({
//         event: 'webhook_queued',
//         provider,
//         phoneNumberId: phoneNumber.id,
//         userId: phoneNumber.user_id,
//       })

//       // Step 4 — Respond immediately
//       // Telecom considers delivery successful. Done.
//       return reply.status(200).send({ received: true })
//     }
//   )

//   // Catch-all for unknown providers (Fastify schema validation
//   // handles this, but explicit is better)
//   app.post('/webhooks/*', async (_request, reply) => {
//     return reply.status(404).send({ error: 'Unknown provider' })
//   })
// }










// ---------
