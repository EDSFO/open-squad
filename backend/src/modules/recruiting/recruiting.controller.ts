import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import {
  analyzeRecruitingCandidate,
  createInterviewAnalysis,
  CreateRecruitingCandidateInput,
  CreateRecruitingJobInput,
  createRecruitingCandidate,
  createRecruitingJob,
  getRecruitingJob,
  InterviewAnalysisInput,
  listRecruitingJobs,
} from './recruiting.service.js'

const createJobSchema = z.object({
  title: z.string().min(1),
  companyName: z.string().optional(),
  seniority: z.string().min(1),
  location: z.string().optional(),
  employmentType: z.string().optional(),
  salaryRange: z.string().optional(),
  requiredSkills: z.string().min(1),
  niceToHaveSkills: z.string().optional(),
  description: z.string().min(1),
  notes: z.string().optional(),
})

const createCandidateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  source: z.string().optional(),
  resumeText: z.string().min(1),
  notes: z.string().optional(),
})

const interviewSchema = z.object({
  transcriptText: z.string().min(1),
})

export async function listRecruitingJobsHandler(request: FastifyRequest, reply: FastifyReply) {
  const jobs = await listRecruitingJobs(request.user.userId)
  return reply.send({ jobs })
}

export async function createRecruitingJobHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = createJobSchema.safeParse(request.body)
  if (!parsed.success) {
    return reply.status(400).send({ error: 'Validation error', details: parsed.error.errors })
  }

  const payload: CreateRecruitingJobInput = {
    title: parsed.data.title,
    companyName: parsed.data.companyName,
    seniority: parsed.data.seniority,
    location: parsed.data.location,
    employmentType: parsed.data.employmentType,
    salaryRange: parsed.data.salaryRange,
    requiredSkills: parsed.data.requiredSkills,
    niceToHaveSkills: parsed.data.niceToHaveSkills,
    description: parsed.data.description,
    notes: parsed.data.notes,
  }

  const job = await createRecruitingJob(request.user.userId, payload)
  return reply.status(201).send({ job })
}

export async function getRecruitingJobHandler(
  request: FastifyRequest<{ Params: { jobId: string } }>,
  reply: FastifyReply
) {
  const job = await getRecruitingJob(request.user.userId, request.params.jobId)
  if (!job) {
    return reply.status(404).send({ error: 'Job not found' })
  }

  return reply.send({ job })
}

export async function createRecruitingCandidateHandler(
  request: FastifyRequest<{ Params: { jobId: string } }>,
  reply: FastifyReply
) {
  const parsed = createCandidateSchema.safeParse(request.body)
  if (!parsed.success) {
    return reply.status(400).send({ error: 'Validation error', details: parsed.error.errors })
  }

  try {
    const payload: CreateRecruitingCandidateInput = {
      name: parsed.data.name,
      email: parsed.data.email || undefined,
      source: parsed.data.source,
      resumeText: parsed.data.resumeText,
      notes: parsed.data.notes,
    }

    const candidate = await createRecruitingCandidate(request.user.userId, request.params.jobId, payload)
    return reply.status(201).send({ candidate })
  } catch (error) {
    if (error instanceof Error && error.message === 'JOB_NOT_FOUND') {
      return reply.status(404).send({ error: 'Job not found' })
    }
    throw error
  }
}

export async function analyzeRecruitingCandidateHandler(
  request: FastifyRequest<{ Params: { candidateId: string } }>,
  reply: FastifyReply
) {
  try {
    const candidate = await analyzeRecruitingCandidate(request.user.userId, request.params.candidateId)
    return reply.send({ candidate })
  } catch (error) {
    if (error instanceof Error && error.message === 'CANDIDATE_NOT_FOUND') {
      return reply.status(404).send({ error: 'Candidate not found' })
    }
    throw error
  }
}

export async function createInterviewAnalysisHandler(
  request: FastifyRequest<{ Params: { candidateId: string } }>,
  reply: FastifyReply
) {
  const parsed = interviewSchema.safeParse(request.body)
  if (!parsed.success) {
    return reply.status(400).send({ error: 'Validation error', details: parsed.error.errors })
  }

  try {
    const payload: InterviewAnalysisInput = {
      transcriptText: parsed.data.transcriptText,
    }

    const interview = await createInterviewAnalysis(request.user.userId, request.params.candidateId, payload)
    return reply.status(201).send({ interview })
  } catch (error) {
    if (error instanceof Error && error.message === 'CANDIDATE_NOT_FOUND') {
      return reply.status(404).send({ error: 'Candidate not found' })
    }
    throw error
  }
}
