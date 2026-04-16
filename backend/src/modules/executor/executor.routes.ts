import { FastifyInstance } from 'fastify'
import {
  startExecutionHandler,
  getStatusHandler,
  approveCheckpointHandler,
  rejectCheckpointHandler,
  listHistoryHandler,
} from './executor.controller'

export async function executorRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /executor/start - Start squad execution (JWT protected)
  fastify.post('/start', {
    onRequest: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['squadId'],
        properties: {
          squadId: { type: 'string', minLength: 1 },
          inputs: { type: 'object', additionalProperties: { type: 'string' } },
        },
      },
    },
  }, startExecutionHandler)

  // GET /executor/status/:jobId - Get execution status (JWT protected)
  fastify.get('/status/:jobId', {
    onRequest: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          jobId: { type: 'string', minLength: 1 },
        },
      },
    },
  }, getStatusHandler)

  // GET /executor/history - List saved execution outputs (JWT protected)
  fastify.get('/history', {
    onRequest: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          squadId: { type: 'string' },
          limit: { type: 'number', minimum: 1, maximum: 100 },
        },
      },
    },
  }, listHistoryHandler)

  // POST /executor/checkpoint/:jobId/approve - Approve checkpoint (JWT protected)
  fastify.post('/checkpoint/:jobId/approve', {
    onRequest: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          jobId: { type: 'string', minLength: 1 },
        },
      },
    },
  }, approveCheckpointHandler)

  // POST /executor/checkpoint/:jobId/reject - Reject checkpoint (JWT protected)
  fastify.post('/checkpoint/:jobId/reject', {
    onRequest: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          jobId: { type: 'string', minLength: 1 },
        },
      },
    },
  }, rejectCheckpointHandler)
}
