import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import {
  getProfileHandler,
  updateProfileHandler,
  changePasswordHandler,
} from './user.controller'

export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/me', {
    onRequest: [fastify.authenticate],
  }, getProfileHandler)

  fastify.patch('/me', {
    onRequest: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          locale: { type: 'string', enum: ['pt-BR', 'en-US'] },
        },
      },
    },
  }, updateProfileHandler)

  fastify.post('/me/password', {
    onRequest: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['oldPassword', 'newPassword'],
        properties: {
          oldPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 8 },
        },
      },
    },
  }, changePasswordHandler)
}
