import { FastifyInstance } from 'fastify'
import {
  createKnowledgeHandler,
  deleteKnowledgeHandler,
  listKnowledgeHandler,
  uploadKnowledgeHandler,
} from './knowledge.controller'

export async function knowledgeRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/squads/:squadId/knowledge', {
    onRequest: [fastify.authenticate],
  }, listKnowledgeHandler)

  fastify.post('/squads/:squadId/knowledge', {
    onRequest: [fastify.authenticate],
  }, createKnowledgeHandler)

  fastify.post('/squads/:squadId/knowledge/upload', {
    onRequest: [fastify.authenticate],
  }, uploadKnowledgeHandler)

  fastify.delete('/squads/:squadId/knowledge/:entryId', {
    onRequest: [fastify.authenticate],
  }, deleteKnowledgeHandler)
}
