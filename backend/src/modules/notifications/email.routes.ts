import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import {
  sendWelcomeEmail,
  sendPurchaseConfirmationEmail,
  sendExecutionCompleteEmail,
} from './email.service'
import { prisma } from '../../lib/prisma'

interface TestEmailBody {
  type: 'welcome' | 'purchase' | 'execution'
  email?: string
  userId?: string
  squadId?: string
  executionId?: string
}

async function handleSendTestEmail(
  request: FastifyRequest<{ Body: TestEmailBody }>,
  reply: FastifyReply
): Promise<void> {
  const { type, email, userId, squadId, executionId } = request.body

  // For testing, use provided email or fetch user
  let targetEmail = email
  let user = null

  if (!targetEmail && userId) {
    user = await prisma.user.findUnique({
      where: { id: userId },
    })
    if (user) {
      targetEmail = user.email
    }
  }

  if (!targetEmail) {
    reply.status(400).send({ error: 'Email or userId is required' })
    return
  }

  const userData = user || {
    id: 'test-user',
    email: targetEmail,
    name: 'Test User',
    locale: 'pt-BR',
  }

  try {
    switch (type) {
      case 'welcome':
        await sendWelcomeEmail(userData)
        break

      case 'purchase':
        if (!squadId) {
          reply.status(400).send({ error: 'squadId is required for purchase email' })
          return
        }
        const squad = await prisma.squad.findUnique({
          where: { id: squadId },
          include: { localizations: true }
        })
        if (!squad) {
          reply.status(404).send({ error: 'Squad not found' })
          return
        }
        const squadLocalization = squad.localizations[0]
        await sendPurchaseConfirmationEmail(userData, {
          id: squad.id,
          name: squadLocalization?.name || squad.slug,
          description: squadLocalization?.description || '',
        })
        break

      case 'execution':
        if (!executionId) {
          reply.status(400).send({ error: 'executionId is required for execution email' })
          return
        }
        // For execution, we need to get the execution data from Redis or create a mock
        const execution = {
          id: executionId,
          squadId: squadId || 'test-squad',
          status: 'completed',
          completedAt: new Date().toISOString(),
          output: { test: 'output' },
        }
        const execSquadData = squadId
          ? await prisma.squad.findUnique({
              where: { id: squadId },
              include: { localizations: true }
            })
          : null
        const execSquad = execSquadData
          ? {
              id: execSquadData.id,
              name: execSquadData.localizations[0]?.name || execSquadData.slug,
              description: execSquadData.localizations[0]?.description || '',
            }
          : { id: 'test-squad', name: 'Test Squad', description: '' }
        if (squadId && !execSquadData) {
          reply.status(404).send({ error: 'Squad not found' })
          return
        }
        await sendExecutionCompleteEmail(userData, execution, execSquad)
        break

      default:
        reply.status(400).send({ error: 'Invalid email type' })
        return
    }

    reply.send({ success: true, message: `Test ${type} email sent to ${targetEmail}` })
  } catch (error) {
    console.error('Error sending test email:', error)
    reply.status(500).send({
      error: 'Failed to send test email',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

export async function emailRoutes(fastify: FastifyInstance): Promise<void> {
  // Test endpoint for sending emails
  fastify.post('/notifications/send-test', {
    schema: {
      body: {
        type: 'object',
        required: ['type'],
        properties: {
          type: {
            type: 'string',
            enum: ['welcome', 'purchase', 'execution'],
          },
          email: { type: 'string', format: 'email' },
          userId: { type: 'string' },
          squadId: { type: 'string' },
          executionId: { type: 'string' },
        },
      },
    },
  }, handleSendTestEmail)
}
