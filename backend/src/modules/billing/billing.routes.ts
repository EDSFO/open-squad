import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import {
  createCheckoutHandler,
  createPortalHandler,
  webhookHandler,
} from './billing.controller'

export async function billingRoutes(fastify: FastifyInstance): Promise<void> {
  // Protected routes (require JWT)
  fastify.post('/billing/checkout', {
    onRequest: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['squadId'],
        properties: {
          squadId: { type: 'string' },
        },
      },
    },
  }, createCheckoutHandler)

  fastify.post('/billing/portal', {
    onRequest: [fastify.authenticate],
  }, createPortalHandler)

  // Webhook route (Stripe sends raw body, no JWT)
  // Note: This route should be registered before JSON parsing middleware
  fastify.post('/billing/webhook', {
    config: {
      rawBody: true,
    },
  }, webhookHandler)
}
