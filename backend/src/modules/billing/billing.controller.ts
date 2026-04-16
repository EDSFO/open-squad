import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import {
  createCheckoutSession,
  createCustomerPortalSession,
  handleWebhookEvent,
} from './billing.service'
import { stripe } from '../../lib/stripe'
import Stripe from 'stripe'

const checkoutSchema = z.object({
  squadId: z.string(),
})

export async function createCheckoutHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const parsed = checkoutSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.status(400).send({ error: 'Validation error', details: parsed.error.errors })
      return
    }

    const { squadId } = parsed.data
    const result = await createCheckoutSession(request.user.userId, squadId)

    if (!result.success) {
      reply.status(400).send({ error: result.error })
      return
    }

    reply.send({
      sessionId: result.sessionId,
      url: result.url,
    })
  } catch (error) {
    console.error('Error in createCheckoutHandler:', error)
    reply.status(500).send({ error: 'Internal server error' })
  }
}

export async function createPortalHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const result = await createCustomerPortalSession(request.user.userId)

    if (!result.success) {
      reply.status(400).send({ error: result.error })
      return
    }

    reply.send({
      url: result.url,
    })
  } catch (error) {
    console.error('Error in createPortalHandler:', error)
    reply.status(500).send({ error: 'Internal server error' })
  }
}

export async function webhookHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const sig = request.headers['stripe-signature'] as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    reply.status(500).send({ error: 'Webhook secret not configured' })
    return
  }

  let event: Stripe.Event

  try {
    const rawBody = request.rawBody || request.body
    event = stripe.webhooks.constructEvent(
      rawBody as Buffer | string,
      sig,
      webhookSecret
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    reply.status(400).send({ error: 'Webhook signature verification failed' })
    return
  }

  const result = await handleWebhookEvent(event)

  if (!result.success) {
    reply.status(500).send({ error: result.error })
    return
  }

  reply.send({ received: true })
}
