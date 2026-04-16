import { FastifyRequest, FastifyReply } from 'fastify'
import { callAI, getAIUsageStats, AIGatewayError } from './gateway.service'

interface CallAIBody {
  prompt: string
  model?: string
  squadExecId?: string
  locale?: string
}

interface GetStatsParams {
  userId: string
}

export async function callAIHandler(
  request: FastifyRequest<{ Body: CallAIBody }>,
  reply: FastifyReply
) {
  try {
    const { prompt, model = process.env.AI_DEFAULT_MODEL || 'deepseek/deepseek-v3.2', squadExecId, locale } = request.body
    const userId = request.user.userId

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return reply.status(400).send({
        error: 'Prompt is required and must be a non-empty string',
        code: 'INVALID_PROMPT',
      })
    }

    const result = await callAI({
      userId,
      prompt: prompt.trim(),
      model,
      squadExecId,
      locale,
    })

    return reply.send(result)
  } catch (error) {
    if (error instanceof AIGatewayError) {
      const response: Record<string, unknown> = {
        error: error.message,
        code: error.code,
      }

      if (error.rateLimitInfo) {
        response.rateLimit = error.rateLimitInfo
      }

      return reply.status(error.statusCode).send(response)
    }

    request.log.error(error)
    return reply.status(500).send({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    })
  }
}

export async function getAIUsageStatsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userId = request.user.userId
    const stats = await getAIUsageStats(userId)
    return reply.send(stats)
  } catch (error) {
    request.log.error(error)
    return reply.status(500).send({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    })
  }
}
