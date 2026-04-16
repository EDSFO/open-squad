import Fastify from 'fastify'
import cors from '@fastify/cors'
import authPlugin from './modules/auth/index'
import { userRoutes } from './modules/user/user.routes'
import { squadRoutes } from './modules/squad/squad.routes'
import { billingRoutes } from './modules/billing/billing.routes'
import { aiGatewayRoutes } from './modules/ai-gateway/ai-gateway.routes'
import { executorRoutes } from './modules/executor/executor.routes'
import { emailRoutes } from './modules/notifications/email.routes'
import { recruitingRoutes } from './modules/recruiting/recruiting.routes'
import { createExecutorWorker } from './modules/executor/executor.service'

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
})

// Add content type parser for raw body (needed for Stripe webhooks)
fastify.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
  try {
    req.rawBody = body
    done(null, JSON.parse(body.toString()))
  } catch (err) {
    done(err as Error, undefined)
  }
})

async function start() {
  try {
    // Register CORS
    await fastify.register(cors, {
      origin: true,
      credentials: true,
    })

    // Register auth plugin (includes JWT setup and routes)
    await fastify.register(authPlugin)

    // Register user routes
    await fastify.register(userRoutes, { prefix: '/user' })

    // Register squad routes
    await fastify.register(squadRoutes)

    // Register billing routes
    await fastify.register(billingRoutes)

    // Register AI Gateway routes
    await fastify.register(aiGatewayRoutes)

    // Register executor routes
    await fastify.register(executorRoutes, { prefix: '/executor' })

    // Register recruiting routes
    await fastify.register(recruitingRoutes, { prefix: '/recruiting' })

    // Register email notification routes
    await fastify.register(emailRoutes)

    // Start the executor worker
    const executorWorker = createExecutorWorker()
    console.log('Executor worker started')

    // Health check endpoint
    fastify.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() }
    })

    // Start server
    const port = parseInt(process.env.PORT || '3001', 10)
    const host = process.env.HOST || '0.0.0.0'

    await fastify.listen({ port, host })
    console.log(`Server running at http://${host}:${port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()

export { fastify }
