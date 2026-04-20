import { FastifyInstance } from 'fastify'
import {
  claimSquadOwnershipHandler,
  createAuthorSquadHandler,
  getClaimableSquadsHandler,
  getMyAuthorSquadsHandler,
  getSquadsHandler,
  getSquadBySlugHandler,
  getMySquadsHandler,
  purchaseSquadHandler,
  setSquadPublishStateHandler,
  updateAuthorSquadHandler,
} from './squad.controller'

export async function squadRoutes(fastify: FastifyInstance): Promise<void> {
  // Public routes
  fastify.get('/squads', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          locale: { type: 'string', enum: ['pt-BR', 'en-US'] },
        },
      },
    },
  }, getSquadsHandler)

  fastify.get('/squads/:slug', {
    schema: {
      params: {
        type: 'object',
        required: ['slug'],
        properties: {
          slug: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          locale: { type: 'string', enum: ['pt-BR', 'en-US'] },
        },
      },
    },
  }, getSquadBySlugHandler)

  // Protected routes
  fastify.get('/squads/mine', {
    onRequest: [fastify.authenticate],
  }, getMySquadsHandler)

  fastify.post('/squads/:id/purchase', {
    onRequest: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          stripePaymentId: { type: 'string' },
        },
      },
    },
  }, purchaseSquadHandler)

  fastify.get('/squads/admin/mine', {
    onRequest: [fastify.authenticate],
  }, getMyAuthorSquadsHandler)

  fastify.get('/squads/admin/claimable', {
    onRequest: [fastify.authenticate],
  }, getClaimableSquadsHandler)

  fastify.post('/squads/admin', {
    onRequest: [fastify.authenticate],
  }, createAuthorSquadHandler)

  fastify.put('/squads/admin/:id', {
    onRequest: [fastify.authenticate],
  }, updateAuthorSquadHandler)

  fastify.patch('/squads/admin/:id/publish', {
    onRequest: [fastify.authenticate],
  }, setSquadPublishStateHandler)

  fastify.post('/squads/admin/:id/claim', {
    onRequest: [fastify.authenticate],
  }, claimSquadOwnershipHandler)
}
