import { FastifyInstance } from 'fastify'
import {
  analyzeRecruitingCandidateHandler,
  createInterviewAnalysisHandler,
  createRecruitingCandidateHandler,
  createRecruitingJobHandler,
  getRecruitingJobHandler,
  listRecruitingJobsHandler,
} from './recruiting.controller.js'

export async function recruitingRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/jobs', { onRequest: [fastify.authenticate] }, listRecruitingJobsHandler)
  fastify.post('/jobs', { onRequest: [fastify.authenticate] }, createRecruitingJobHandler)
  fastify.get('/jobs/:jobId', { onRequest: [fastify.authenticate] }, getRecruitingJobHandler)
  fastify.post('/jobs/:jobId/candidates', { onRequest: [fastify.authenticate] }, createRecruitingCandidateHandler)
  fastify.post('/candidates/:candidateId/analyze', { onRequest: [fastify.authenticate] }, analyzeRecruitingCandidateHandler)
  fastify.post('/candidates/:candidateId/interviews', { onRequest: [fastify.authenticate] }, createInterviewAnalysisHandler)
}
