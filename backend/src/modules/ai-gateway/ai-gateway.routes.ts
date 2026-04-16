import { FastifyInstance } from 'fastify'
import { callAIHandler, getAIUsageStatsHandler } from './gateway.controller'

export async function aiGatewayRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /ai/call - Call AI with fallback chain (JWT protected)
  fastify.post('/ai/call', {
    onRequest: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['prompt'],
        properties: {
          prompt: { type: 'string', minLength: 1 },
          model: { type: 'string', default: 'deepseek/deepseek-v3.2' },
          squadExecId: { type: 'string' },
          locale: { type: 'string', default: 'pt-BR' },
        },
      },
    },
  }, callAIHandler)

  // GET /ai/stats - Get user's AI usage statistics (JWT protected)
  fastify.get('/ai/stats', {
    onRequest: [fastify.authenticate],
  }, getAIUsageStatsHandler)
}
