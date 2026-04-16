import { prisma } from '../../lib/prisma.js'
import { callAI } from '../ai-gateway/gateway.service.js'

const prismaClient = prisma as any

export interface CreateRecruitingJobInput {
  title: string
  companyName?: string
  seniority: string
  location?: string
  employmentType?: string
  salaryRange?: string
  requiredSkills: string
  niceToHaveSkills?: string
  description: string
  notes?: string
}

export interface CreateRecruitingCandidateInput {
  name: string
  email?: string
  source?: string
  resumeText: string
  notes?: string
}

export interface InterviewAnalysisInput {
  transcriptText: string
}

export async function createRecruitingJob(userId: string, input: CreateRecruitingJobInput) {
  return prismaClient.recruitingJob.create({
    data: {
      userId,
      ...input,
    },
  })
}

export async function listRecruitingJobs(userId: string) {
  return prismaClient.recruitingJob.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      candidates: {
        orderBy: { createdAt: 'desc' },
        include: {
          interviews: {
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
  })
}

export async function getRecruitingJob(userId: string, jobId: string) {
  return prismaClient.recruitingJob.findFirst({
    where: {
      id: jobId,
      userId,
    },
    include: {
      candidates: {
        orderBy: { createdAt: 'desc' },
        include: {
          interviews: {
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
  })
}

export async function createRecruitingCandidate(userId: string, jobId: string, input: CreateRecruitingCandidateInput) {
  const job = await prismaClient.recruitingJob.findFirst({
    where: {
      id: jobId,
      userId,
    },
  })

  if (!job) {
    throw new Error('JOB_NOT_FOUND')
  }

  return prismaClient.recruitingCandidate.create({
    data: {
      userId,
      jobId,
      ...input,
    },
  })
}

export async function analyzeRecruitingCandidate(userId: string, candidateId: string) {
  const candidate = await prismaClient.recruitingCandidate.findFirst({
    where: {
      id: candidateId,
      userId,
    },
    include: {
      job: true,
    },
  })

  if (!candidate) {
    throw new Error('CANDIDATE_NOT_FOUND')
  }

  const analysis = await generateCandidateScreening(userId, candidate)

  return prismaClient.recruitingCandidate.update({
    where: { id: candidate.id },
    data: {
      screeningScore: analysis.score,
      screeningStatus: analysis.status,
      screeningRecommendation: analysis.recommendation,
      screeningAnalysis: analysis,
    },
    include: {
      interviews: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })
}

export async function createInterviewAnalysis(userId: string, candidateId: string, input: InterviewAnalysisInput) {
  const candidate = await prismaClient.recruitingCandidate.findFirst({
    where: {
      id: candidateId,
      userId,
    },
    include: {
      job: true,
    },
  })

  if (!candidate) {
    throw new Error('CANDIDATE_NOT_FOUND')
  }

  const analysis = await generateInterviewAnalysis(userId, candidate, input.transcriptText)

  return prismaClient.recruitingInterview.create({
    data: {
      userId,
      jobId: candidate.jobId,
      candidateId: candidate.id,
      transcriptText: input.transcriptText,
      analysis,
      finalScore: analysis.score,
      finalRecommendation: analysis.recommendation,
    },
  })
}

async function generateCandidateScreening(
  userId: string,
  candidate: {
    id: string
    name: string
    resumeText: string
    notes: string | null
    job: {
      title: string
      companyName: string | null
      seniority: string
      location: string | null
      employmentType: string | null
      salaryRange: string | null
      requiredSkills: string
      niceToHaveSkills: string | null
      description: string
      notes: string | null
    }
  }
) {
  const prompt = [
    'Voce e um analista de recrutamento e selecao.',
    'Avalie a aderencia do candidato a vaga e responda estritamente em JSON valido.',
    'Use este formato:',
    '{"score":0,"status":"fit|partial-fit|low-fit","recommendation":"advance|talent-pool|reject","summary":"...","strengths":["..."],"gaps":["..."],"interviewQuestions":["..."],"decisionRationale":"..."}',
    `Vaga: ${candidate.job.title}`,
    `Empresa: ${candidate.job.companyName || 'Nao informada'}`,
    `Senioridade: ${candidate.job.seniority}`,
    `Localizacao: ${candidate.job.location || 'Nao informada'}`,
    `Tipo de contratacao: ${candidate.job.employmentType || 'Nao informado'}`,
    `Faixa salarial: ${candidate.job.salaryRange || 'Nao informada'}`,
    `Competencias obrigatorias: ${candidate.job.requiredSkills}`,
    `Competencias desejaveis: ${candidate.job.niceToHaveSkills || 'Nao informadas'}`,
    `Descricao da vaga: ${candidate.job.description}`,
    `Observacoes da vaga: ${candidate.job.notes || 'Nenhuma'}`,
    `Candidato: ${candidate.name}`,
    `Curriculo: ${candidate.resumeText}`,
    `Observacoes do recrutador: ${candidate.notes || 'Nenhuma'}`,
  ].join('\n')

  try {
    const result = await callAI({
      userId,
      prompt,
      model: process.env.AI_DEFAULT_MODEL || 'deepseek/deepseek-v3.2',
      locale: 'pt-BR',
    })

    return parseJsonWithFallback(result.content, buildCandidateFallback(candidate))
  } catch (error) {
    return buildCandidateFallback(candidate)
  }
}

async function generateInterviewAnalysis(
  userId: string,
  candidate: {
    name: string
    screeningScore: number | null
    screeningRecommendation: string | null
    job: {
      title: string
      seniority: string
      requiredSkills: string
      niceToHaveSkills: string | null
      description: string
    }
  },
  transcriptText: string
) {
  const prompt = [
    'Voce e um analista sênior de recrutamento e selecao.',
    'Analise a transcricao de entrevista e responda estritamente em JSON valido.',
    'Use este formato:',
    '{"score":0,"recommendation":"advance|hold|reject","summary":"...","evidence":["..."],"concerns":["..."],"nextSteps":["..."],"finalRationale":"..."}',
    `Vaga: ${candidate.job.title}`,
    `Senioridade: ${candidate.job.seniority}`,
    `Competencias obrigatorias: ${candidate.job.requiredSkills}`,
    `Competencias desejaveis: ${candidate.job.niceToHaveSkills || 'Nao informadas'}`,
    `Descricao da vaga: ${candidate.job.description}`,
    `Candidato: ${candidate.name}`,
    `Score anterior: ${candidate.screeningScore ?? 'Nao calculado'}`,
    `Recomendacao anterior: ${candidate.screeningRecommendation ?? 'Nao calculada'}`,
    `Transcricao da entrevista: ${transcriptText}`,
  ].join('\n')

  try {
    const result = await callAI({
      userId,
      prompt,
      model: process.env.AI_DEFAULT_MODEL || 'deepseek/deepseek-v3.2',
      locale: 'pt-BR',
    })

    return parseJsonWithFallback(result.content, buildInterviewFallback(transcriptText))
  } catch (error) {
    return buildInterviewFallback(transcriptText)
  }
}

function parseJsonWithFallback<T>(content: string, fallback: T): T {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const raw = jsonMatch ? jsonMatch[0] : content
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function buildCandidateFallback(candidate: { job: { requiredSkills: string }, resumeText: string }) {
  const resume = candidate.resumeText.toLowerCase()
  const required = candidate.job.requiredSkills
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)

  const matched = required.filter((skill) => resume.includes(skill.toLowerCase()))
  const score = required.length > 0 ? Math.min(95, Math.round((matched.length / required.length) * 100)) : 70

  return {
    score,
    status: score >= 75 ? 'fit' : score >= 50 ? 'partial-fit' : 'low-fit',
    recommendation: score >= 75 ? 'advance' : score >= 50 ? 'talent-pool' : 'reject',
    summary: 'Analise inicial baseada em correspondencia textual entre vaga e curriculo.',
    strengths: matched.slice(0, 5),
    gaps: required.filter((skill) => !matched.includes(skill)).slice(0, 5),
    interviewQuestions: [
      'Quais resultados concretos voce gerou em experiencias semelhantes?',
      'Como sua experiencia se conecta com os requisitos principais da vaga?',
      'Quais competencias voce considera mais fortes para esta posicao?',
    ],
    decisionRationale: 'Fallback local aplicado por indisponibilidade ou falha do modelo.',
  }
}

function buildInterviewFallback(transcriptText: string) {
  const normalized = transcriptText.toLowerCase()
  const positiveSignals = ['resultado', 'lider', 'entreg', 'projeto', 'impacto'].filter((signal) => normalized.includes(signal)).length
  const score = Math.min(90, 55 + positiveSignals * 7)

  return {
    score,
    recommendation: score >= 75 ? 'advance' : score >= 60 ? 'hold' : 'reject',
    summary: 'Parecer preliminar baseado em sinais textuais da entrevista.',
    evidence: [
      'Ha indicios de experiencia pratica na narrativa da entrevista.',
      'A transcricao contem sinais de ownership e entrega.',
    ],
    concerns: [
      'Validar profundidade tecnica com exemplos concretos.',
      'Confirmar consistencia entre discurso e historico profissional.',
    ],
    nextSteps: [
      'Realizar validacao tecnica com foco em casos reais.',
      'Checar aderencia cultural e alinhamento com a vaga.',
    ],
    finalRationale: 'Fallback local aplicado por indisponibilidade ou falha do modelo.',
  }
}
