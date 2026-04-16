import { stripe } from '../../lib/stripe'
import { prisma } from '../../lib/prisma'
import Stripe from 'stripe'
import { sendPurchaseConfirmationEmailNonBlocking } from '../notifications/email.service'

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

export interface CheckoutSessionResult {
  success: boolean
  sessionId?: string
  url?: string
  error?: string
}

export interface PortalSessionResult {
  success: boolean
  url?: string
  error?: string
}

export async function createCheckoutSession(
  userId: string,
  squadId: string
): Promise<CheckoutSessionResult> {
  try {
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    // Get squad with localization
    const squad = await prisma.squad.findUnique({
      where: { id: squadId },
      include: {
        localizations: {
          where: { locale: user.locale || 'pt-BR' },
        },
      },
    })

    if (!squad) {
      return { success: false, error: 'Squad not found' }
    }

    const localization = squad.localizations[0]
    if (!localization) {
      return { success: false, error: 'Squad localization not found' }
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      })
      customerId = customer.id

      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      })
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: localization.name,
              description: localization.description,
            },
            unit_amount: localization.price, // Already in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${FRONTEND_URL}/dashboard/meus-squads?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/dashboard/marketplace?canceled=true`,
      metadata: {
        userId,
        squadId,
      },
    })

    return { success: true, sessionId: session.id, url: session.url! }
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create checkout session',
    }
  }
}

export async function createCustomerPortalSession(
  userId: string
): Promise<PortalSessionResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    if (!user.stripeCustomerId) {
      return { success: false, error: 'No Stripe customer found. Please make a purchase first.' }
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${FRONTEND_URL}/dashboard/settings`,
    })

    return { success: true, url: session.url }
  } catch (error) {
    console.error('Error creating portal session:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create portal session',
    }
  }
}

export async function handleWebhookEvent(
  event: Stripe.Event
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return { success: true }
  } catch (error) {
    console.error('Error handling webhook event:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to handle webhook event',
    }
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const squadId = session.metadata?.squadId

  if (!userId || !squadId) {
    console.error('Missing metadata in checkout session')
    return
  }

  // Fetch user and squad for email
  const [user, squad] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.squad.findUnique({
      where: { id: squadId },
      include: { localizations: true }
    }),
  ])

  // Store the payment ID on the user
  if (session.payment_intent && typeof session.payment_intent === 'string') {
    await prisma.userSquad.upsert({
      where: {
        userId_squadId: {
          userId,
          squadId,
        },
      },
      update: {
        stripePaymentId: session.payment_intent,
        isActive: true,
        purchasedAt: new Date(),
      },
      create: {
        userId,
        squadId,
        stripePaymentId: session.payment_intent,
        isActive: true,
      },
    })
  }

  // Send purchase confirmation email (non-blocking)
  if (user && squad) {
    const localization = squad.localizations[0]
    sendPurchaseConfirmationEmailNonBlocking(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        locale: user.locale,
      },
      {
        id: squad.id,
        name: localization?.name || squad.slug,
        description: localization?.description || '',
      }
    )
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  })

  if (!user) {
    console.error('User not found for subscription update')
    return
  }

  // Map Stripe subscription status to plan
  let plan = user.plan
  let squadLimit = user.squadLimit

  if (subscription.items.data[0]?.price?.id) {
    const priceId = subscription.items.data[0].price.id

    if (priceId === process.env.STRIPE_PRICE_ID_STARTER) {
      plan = 'STARTER'
      squadLimit = 1
    } else if (priceId === process.env.STRIPE_PRICE_ID_GROWTH) {
      plan = 'GROWTH'
      squadLimit = 3
    } else if (priceId === process.env.STRIPE_PRICE_ID_SCALE) {
      plan = 'SCALE'
      squadLimit = 5
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionId: subscription.id,
      plan,
      squadLimit,
      isActive: subscription.status === 'active',
    },
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  })

  if (!user) {
    console.error('User not found for subscription deletion')
    return
  }

  // Downgrade to free tier
  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionId: null,
      plan: 'STARTER',
      squadLimit: 1,
      isActive: true, // Keep active but with limited squads
    },
  })
}
