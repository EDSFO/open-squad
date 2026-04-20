import { Worker, Job } from 'bullmq'
import { executorQueue } from '../../lib/queue.js'
import { redis } from '../../lib/redis.js'
import { prisma } from '../../lib/prisma.js'
import { sendExecutionCompleteEmailNonBlocking } from '../notifications/email.service.js'
import { callAI } from '../ai-gateway/gateway.service.js'
import { buildKnowledgeContextForExecution } from '../knowledge/knowledge.service.js'

interface ExecutionJobData {
  userId: string
  squadId: string
  inputs: Record<string, string>
  jobId: string
}

type VisualMode = 'economic' | 'balanced' | 'premium'

interface ExecutionStatus {
  id: string
  status: 'pending' | 'active' | 'waiting_checkpoint' | 'completed' | 'failed'
  currentStep: number
  totalSteps: number
  checkpoint?: {
    id: string
    name: string
    description: string
  }
  output: Record<string, unknown>
  startedAt: string | null
  completedAt: string | null
}

interface GeneratedAssetSlide {
  title: string
  body: string
  imageUrl: string
}

interface GeneratedAsset {
  id: string
  type: 'image' | 'infographic'
  title: string
  prompt: string
  alt: string
  url: string
  mimeType: string
  width: number
  height: number
  slides?: GeneratedAssetSlide[]
}

interface GeneratedArtifact {
  type: 'tutorial' | 'generic' | 'linkedin-post' | 'carousel' | 'recruiting-report'
  title: string
  summary: string
  content: string
  checklist?: string[]
  assets?: GeneratedAsset[]
}

interface RawAssetSlide {
  title: string
  body: string
}

interface RawAssetSpec {
  type: 'image' | 'infographic'
  title: string
  prompt: string
  alt: string
  slides?: RawAssetSlide[]
}

interface ListExecutionHistoryOptions {
  squadId?: string
  limit?: number
}

interface ArtifactProgressUpdate {
  currentStep: number
  totalSteps?: number
  phase: string
  draft?: string
}

type ArtifactProgressReporter = (update: ArtifactProgressUpdate) => Promise<void>

const EXECUTION_PREFIX = 'squad-execution:'
const CHECKPOINT_WAIT_PREFIX = 'checkpoint-wait:'
const EXECUTION_TTL_SECONDS = 3600

async function resolveSquadByIdentifier(identifier: string) {
  return prisma.squad.findFirst({
    where: {
      OR: [
        { id: identifier },
        { slug: identifier },
      ],
    },
    include: { localizations: true },
  })
}

async function updateExecutionRecord(
  jobId: string,
  state: Partial<ExecutionStatus>,
  userId?: string
): Promise<void> {
  const data: Record<string, unknown> = {}

  if (userId) data.userId = userId
  if (state.status !== undefined) data.status = state.status
  if (state.currentStep !== undefined) data.currentStep = state.currentStep
  if (state.totalSteps !== undefined) data.totalSteps = state.totalSteps
  if (state.checkpoint !== undefined) data.checkpoint = state.checkpoint ?? null
  if (state.output !== undefined) data.output = state.output
  if (state.startedAt !== undefined) data.startedAt = state.startedAt ? new Date(state.startedAt) : null
  if (state.completedAt !== undefined) data.completedAt = state.completedAt ? new Date(state.completedAt) : null

  if (Object.keys(data).length === 0) {
    return
  }

  try {
    await prisma.squadExecution.update({
      where: { id: jobId },
      data,
    })
  } catch (error) {
    console.error(`Failed to persist execution state for ${jobId}:`, error)
  }
}

function mapExecutionRecordToStatus(record: {
  id: string
  status: string
  currentStep: number
  totalSteps: number
  checkpoint: unknown
  output: unknown
  startedAt: Date | null
  completedAt: Date | null
}): ExecutionStatus {
  return {
    id: record.id,
    status: record.status as ExecutionStatus['status'],
    currentStep: record.currentStep,
    totalSteps: record.totalSteps,
    checkpoint: (record.checkpoint as ExecutionStatus['checkpoint'] | null) ?? undefined,
    output: (record.output as Record<string, unknown> | null) ?? {},
    startedAt: record.startedAt?.toISOString() ?? null,
    completedAt: record.completedAt?.toISOString() ?? null,
  }
}

async function setExecutionState(jobId: string, state: Partial<ExecutionStatus>, userId?: string): Promise<void> {
  const stateObj: Record<string, string> = {
    updatedAt: new Date().toISOString(),
    ...Object.fromEntries(
      Object.entries(state).map(([key, value]) => [key, String(value)])
    ),
  }

  if (userId) {
    stateObj.userId = userId
  }

  if (state.checkpoint) {
    stateObj.checkpoint = JSON.stringify(state.checkpoint)
  }
  if (state.output) {
    stateObj.output = JSON.stringify(state.output)
  }

  Object.keys(stateObj).forEach((key) => {
    if (stateObj[key] === undefined) {
      delete stateObj[key]
    }
  })

  const executionKey = `${EXECUTION_PREFIX}${jobId}`
  await redis.hset(executionKey, stateObj)
  await redis.expire(executionKey, EXECUTION_TTL_SECONDS)
  await updateExecutionRecord(jobId, state, userId)
}

async function getExecutionState(jobId: string): Promise<Record<string, string> | null> {
  const state = await redis.hgetall(`${EXECUTION_PREFIX}${jobId}`)
  return Object.keys(state).length > 0 ? state : null
}

async function waitForCheckpointApproval(
  jobId: string,
  timeoutMs: number = 60000
): Promise<'approved' | 'rejected' | 'timeout'> {
  const startTime = Date.now()
  const waitKey = `${CHECKPOINT_WAIT_PREFIX}${jobId}`

  while (Date.now() - startTime < timeoutMs) {
    const approved = await redis.get(`${waitKey}:approved`)
    if (approved === '1') {
      await redis.del(`${waitKey}:approved`)
      return 'approved'
    }

    const rejected = await redis.get(`${waitKey}:rejected`)
    if (rejected === '1') {
      await redis.del(`${waitKey}:rejected`)
      return 'rejected'
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  return 'timeout'
}

export async function enqueueSquadExecution(
  userId: string,
  squadId: string,
  inputs: Record<string, string>
): Promise<string> {
  const squad = await resolveSquadByIdentifier(squadId)

  if (!squad) {
    throw new Error('SQUAD_NOT_FOUND')
  }

  const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const startedAt = new Date().toISOString()

  await executorQueue.add('execute-squad', {
    userId,
    squadId: squad.id,
    inputs,
    jobId,
  })

  await prisma.squadExecution.create({
    data: {
      id: jobId,
      userId,
      squadId: squad.id,
      status: 'pending',
      currentStep: 0,
      totalSteps: 5,
      inputs,
      output: {},
      startedAt: new Date(startedAt),
    },
  })

  await setExecutionState(jobId, {
    id: jobId,
    status: 'pending',
    currentStep: 0,
    totalSteps: 5,
    output: {},
    startedAt,
  }, userId)

  return jobId
}

export async function getExecutionStatus(jobId: string, userId: string): Promise<ExecutionStatus | null> {
  const state = await getExecutionState(jobId)
  const record = await prisma.squadExecution.findFirst({
    where: {
      id: jobId,
      userId,
    },
  })

  if (state) {
    if (state.userId !== userId) {
      return null
    }

    const redisUpdatedAt = state.updatedAt ? new Date(state.updatedAt).getTime() : 0
    const dbUpdatedAt = record?.updatedAt ? new Date(record.updatedAt).getTime() : 0

    if (record && dbUpdatedAt > redisUpdatedAt) {
      return mapExecutionRecordToStatus(record)
    }

    return {
      id: state.id,
      status: state.status as ExecutionStatus['status'],
      currentStep: parseInt(state.currentStep || '0', 10),
      totalSteps: parseInt(state.totalSteps || '0', 10),
      checkpoint: state.checkpoint ? JSON.parse(state.checkpoint) : undefined,
      output: state.output ? JSON.parse(state.output) : {},
      startedAt: state.startedAt || null,
      completedAt: state.completedAt || null,
    }
  }

  if (record) {
    return mapExecutionRecordToStatus(record)
  }

  const job = await executorQueue.getJob(jobId)
  if (!job || job.data.userId !== userId) {
    return null
  }

  return {
    id: jobId,
    status: 'pending',
    currentStep: 0,
    totalSteps: 0,
    output: {},
    startedAt: null,
    completedAt: null,
  }
}

export async function approveCheckpoint(jobId: string, userId: string): Promise<ExecutionStatus | null> {
  const state = await getExecutionState(jobId)

  if (state?.userId && state.userId !== userId) {
    return null
  }

  const record = await prisma.squadExecution.findFirst({
    where: {
      id: jobId,
      userId,
      status: 'waiting_checkpoint',
    },
  })

  if (!record) {
    return null
  }

  await redis.set(`${CHECKPOINT_WAIT_PREFIX}${jobId}:approved`, '1')

  await setExecutionState(jobId, {
    status: 'active',
  })

  return getExecutionStatus(jobId, userId)
}

export async function rejectCheckpoint(jobId: string, userId: string): Promise<ExecutionStatus | null> {
  const state = await getExecutionState(jobId)

  if (state?.userId && state.userId !== userId) {
    return null
  }

  const record = await prisma.squadExecution.findFirst({
    where: {
      id: jobId,
      userId,
      status: 'waiting_checkpoint',
    },
  })

  if (!record) {
    return null
  }

  await redis.set(`${CHECKPOINT_WAIT_PREFIX}${jobId}:rejected`, '1')

  await setExecutionState(jobId, {
    status: 'failed',
    completedAt: new Date().toISOString(),
  })

  return getExecutionStatus(jobId, userId)
}

export async function listExecutionHistory(
  userId: string,
  options: ListExecutionHistoryOptions = {}
) {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100)
  const squad = options.squadId ? await resolveSquadByIdentifier(options.squadId) : null

  const executions = await prisma.squadExecution.findMany({
    where: {
      userId,
      ...(squad ? { squadId: squad.id } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      squad: {
        include: {
          localizations: true,
        },
      },
    },
  })

  return executions.map((execution) => ({
    ...mapExecutionRecordToStatus(execution),
    inputs: execution.inputs as Record<string, unknown>,
    squad: {
      id: execution.squad.id,
      slug: execution.squad.slug,
      name: execution.squad.localizations[0]?.name || execution.squad.slug,
      description: execution.squad.localizations[0]?.description || '',
    },
    createdAt: execution.createdAt.toISOString(),
    updatedAt: execution.updatedAt.toISOString(),
  }))
}

export function createExecutorWorker(): Worker {
  const worker = new Worker<ExecutionJobData>(
    'squad-executor',
    async (job: Job<ExecutionJobData>) => {
      const { userId, squadId, inputs, jobId } = job.data
      const squad = await prisma.squad.findUnique({
        where: { id: squadId },
        include: { localizations: true },
      })
      const squadName = squad?.localizations[0]?.name || squad?.slug || squadId

      console.log(`Processing squad execution: ${squadId} for user: ${userId}`)

      await setExecutionState(jobId, {
        status: 'active',
        currentStep: 1,
        totalSteps: 5,
        output: {
          phase: 'Preparando execucao',
          squadName,
          receivedInputs: inputs,
        },
      })

      const brief = buildExecutionBrief(squad?.slug || squadId, inputs)
      const knowledgeContext = await buildKnowledgeContextForExecution({
        userId,
        squadId,
        inputs,
      })
      const visualMode = normalizeVisualMode(inputs.visualMode)
      const generatedArtifact = await generateArtifact({
        userId,
        squadId: squad?.slug || squadId,
        squadName,
        brief,
        knowledgePromptBlock: knowledgeContext.promptBlock,
        jobId,
        visualMode,
        onProgress: async (progress) => {
          await setExecutionState(jobId, {
            status: 'active',
            currentStep: progress.currentStep,
            totalSteps: progress.totalSteps ?? 5,
            output: {
              squadName,
              receivedInputs: inputs,
              visualMode,
              knowledge: knowledgeContext.metadata,
              phase: progress.phase,
              ...(progress.draft ? { draft: progress.draft } : {}),
            },
          }, userId)
        },
      })

      await setExecutionState(jobId, {
        currentStep: 3,
        output: {
          step1: 'Initialized',
          step2: 'AI processed',
          squadName,
          receivedInputs: inputs,
          visualMode,
          knowledge: knowledgeContext.metadata,
          phase: 'Aguardando aprovacao do checkpoint',
          draft: generatedArtifact.summary,
        },
      }, userId)

      const checkpointData = {
        id: 'checkpoint-1',
        name: 'Review AI Output',
        description: 'Please review the AI generated content before proceeding',
      }
      await setExecutionState(jobId, {
        status: 'waiting_checkpoint',
        checkpoint: checkpointData,
      }, userId)

      const result = await waitForCheckpointApproval(jobId, 300000)

      if (result === 'rejected') {
        await setExecutionState(jobId, {
          status: 'failed',
          completedAt: new Date().toISOString(),
        })
        throw new Error('Execution rejected at checkpoint')
      }

      if (result === 'timeout') {
        await setExecutionState(jobId, {
          status: 'failed',
          completedAt: new Date().toISOString(),
        })
        throw new Error('Checkpoint approval timed out')
      }

      await setExecutionState(jobId, {
        status: 'active',
        currentStep: 4,
        output: {
          step1: 'Initialized',
          step2: 'AI processed',
          step3: 'Checkpoint passed',
          squadName,
          receivedInputs: inputs,
          visualMode,
          knowledge: knowledgeContext.metadata,
          phase: 'Finalizando entrega',
          artifact: generatedArtifact,
        },
      }, userId)

      await setExecutionState(jobId, {
        status: 'completed',
        currentStep: 5,
        completedAt: new Date().toISOString(),
        output: {
          step1: 'Initialized',
          step2: 'AI processed',
          step3: 'Checkpoint passed',
          step4: 'Finalized',
          step5: 'Complete',
          squadName,
          receivedInputs: inputs,
          visualMode,
          knowledge: knowledgeContext.metadata,
          phase: 'Entrega concluida',
          artifact: generatedArtifact,
        },
      }, userId)

      return { success: true, jobId }
    },
    {
      connection: redis,
      concurrency: 5,
      lockDuration: 300000,
      stalledInterval: 30000,
    }
  )

  worker.on('completed', async (job) => {
    console.log(`Job ${job.id} completed successfully`)
    const jobId = job.id as string
    const { userId, squadId } = job.data

    const [user, squad] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.squad.findUnique({
        where: { id: squadId },
        include: { localizations: true },
      }),
    ])

    if (user && squad) {
      const localization = squad.localizations[0]
      sendExecutionCompleteEmailNonBlocking(
        {
          id: user.id,
          email: user.email,
          name: user.name,
          locale: user.locale,
        },
        {
          id: jobId,
          squadId,
          status: 'completed',
          completedAt: new Date().toISOString(),
        },
        {
          id: squad.id,
          name: localization?.name || squad.slug,
          description: localization?.description || '',
        }
      )
    }

    const waitKey = `${CHECKPOINT_WAIT_PREFIX}${jobId}`
    await redis.del(waitKey)
  })

  worker.on('failed', async (job, err) => {
    console.error(`Job ${job?.id} failed:`, err)
    if (job?.id) {
      const jobId = job.id as string
      const waitKey = `${CHECKPOINT_WAIT_PREFIX}${jobId}`
      await setExecutionState(jobId, {
        status: 'failed',
        completedAt: new Date().toISOString(),
      })
      await redis.del(waitKey)
    }
  })

  return worker
}

function simulateStep(duration: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, duration))
}

async function generateArtifact(options: {
  userId: string
  squadId: string
  squadName: string
  brief: string
  knowledgePromptBlock: string
  jobId: string
  visualMode: VisualMode
  onProgress?: ArtifactProgressReporter
}): Promise<GeneratedArtifact> {
  const { userId, squadId, squadName, brief, knowledgePromptBlock, jobId, visualMode, onProgress } = options

  try {
    await onProgress?.({
      currentStep: 1,
      phase: 'Gerando texto com IA',
    })

    const result = await callAI({
      userId,
      prompt: buildArtifactPrompt(squadId, squadName, brief, knowledgePromptBlock),
      model: process.env.AI_DEFAULT_MODEL || 'deepseek/deepseek-v3.2',
      squadExecId: jobId,
      locale: 'pt-BR',
    })

    await onProgress?.({
      currentStep: 2,
      phase: 'Preparando midias visuais',
    })

    return await parseArtifactResponse(result.content, squadId, squadName, brief, visualMode, onProgress)
  } catch (error) {
    console.error('AI generation failed, using local fallback:', error)
    await onProgress?.({
      currentStep: 2,
      phase: 'Usando fallback local para gerar saida',
    })
    return await buildGeneratedArtifact(squadId, squadName, brief, visualMode, onProgress)
  }
}

function buildArtifactPrompt(
  squadSlug: string,
  squadName: string,
  brief: string,
  knowledgePromptBlock: string
) {
  const artifactType =
    squadSlug === 'tutorial-generator'
      ? 'tutorial'
      : squadSlug === 'linkedin-posts'
        ? 'linkedin-post'
        : squadSlug === 'recruiting-screening'
          ? 'recruiting-report'
        : squadSlug === 'instagram-carousel'
          ? 'carousel'
          : 'generic'

  return [
    'Voce e um gerador de entregaveis para um produto SaaS.',
    `Squad: ${squadName}`,
    `Tipo esperado: ${artifactType}`,
    'Gere uma resposta estritamente em JSON valido, sem markdown, sem cercas de codigo, sem texto antes ou depois.',
    'Use exatamente esta estrutura:',
    '{"type":"tutorial|generic|linkedin-post|carousel","title":"...","summary":"...","content":"...","checklist":["..."],"assets":[{"type":"image|infographic","title":"...","prompt":"...","alt":"...","slides":[{"title":"...","body":"..."}]}]}',
    'Regras:',
    '- Escreva em portugues do Brasil.',
    '- O campo content deve ser util, especifico e pronto para uso.',
    '- Se for tutorial, entregue passos claros e objetivos.',
    '- Se for linkedin-post, entregue um texto publicavel e pronto para rede social.',
    '- Se for recruiting-report, entregue parecer estruturado, aderencia ao perfil, riscos e recomendacao final.',
    '- Sempre inclua de 1 a 2 assets visuais.',
    '- Para recruiting-report, nao inclua assets visuais a menos que sejam explicitamente uteis.',
    '- O primeiro asset deve ser uma capa forte e reutilizavel.',
    '- Se fizer sentido, inclua um infographic com 3 a 5 slides curtos.',
    '- checklist deve ter de 3 a 5 itens curtos.',
    `Briefing do usuario: ${brief}`,
    knowledgePromptBlock,
  ].filter(Boolean).join('\n')
}

async function parseArtifactResponse(
  content: string,
  squadSlug: string,
  squadName: string,
  brief: string,
  visualMode: VisualMode,
  onProgress?: ArtifactProgressReporter
): Promise<GeneratedArtifact> {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const raw = jsonMatch ? jsonMatch[0] : content
    const parsed = JSON.parse(raw) as Partial<GeneratedArtifact> & { assets?: RawAssetSpec[] }

    if (typeof parsed.title === 'string' && typeof parsed.summary === 'string' && typeof parsed.content === 'string') {
      const type =
        parsed.type === 'tutorial' || parsed.type === 'linkedin-post' || parsed.type === 'carousel' || parsed.type === 'recruiting-report'
          ? parsed.type
          : 'generic'

      return {
        type,
        title: parsed.title,
        summary: parsed.summary,
        content: parsed.content,
        checklist: Array.isArray(parsed.checklist) ? parsed.checklist.map(String) : undefined,
        assets: await materializeAssets(parsed.assets, type, parsed.title, parsed.summary, brief, visualMode, onProgress),
      }
    }
  } catch (error) {
    console.error('Failed to parse AI artifact, using wrapped content:', error)
  }

  const fallbackType =
    squadSlug === 'tutorial-generator'
      ? 'tutorial'
      : squadSlug === 'linkedin-posts'
        ? 'linkedin-post'
        : squadSlug === 'recruiting-screening'
          ? 'recruiting-report'
        : squadSlug === 'instagram-carousel'
          ? 'carousel'
          : 'generic'

  return {
    type: fallbackType,
    title: `${squadName}: ${brief.slice(0, 80)}`,
    summary: 'Conteudo gerado via LLM sem estrutura JSON estrita.',
    content,
    checklist: ['Conteudo gerado', 'Revisar formato', 'Validar consistencia final'],
    assets: await materializeAssets([], fallbackType, `${squadName}: ${brief.slice(0, 80)}`, content, brief, visualMode, onProgress),
  }
}

async function buildGeneratedArtifact(
  squadSlug: string,
  squadName: string,
  brief: string,
  visualMode: VisualMode,
  onProgress?: ArtifactProgressReporter
): Promise<GeneratedArtifact> {
  if (squadSlug === 'tutorial-generator') {
    const artifact: GeneratedArtifact = {
      type: 'tutorial',
      title: `Tutorial: ${brief}`,
      summary: `Tutorial gerado para o briefing: ${brief}`,
      content: [
        `Objetivo: ${brief}`,
        '1. Abra a ferramenta ou sistema relacionado ao processo.',
        '2. Localize a funcionalidade principal necessaria para executar a tarefa.',
        '3. Preencha os campos obrigatorios com atencao e revise os dados antes de confirmar.',
        '4. Execute a acao principal e valide o resultado esperado na tela.',
        '5. Se necessario, registre evidencias ou exporte o resultado final.',
      ].join('\n'),
      checklist: [
        'Contexto entendido',
        'Passos organizados em sequencia logica',
        'Validacao final incluida',
      ],
    }

    return {
      ...artifact,
      assets: await materializeAssets([], artifact.type, artifact.title, artifact.summary, brief, visualMode, onProgress),
    }
  }

  if (squadSlug === 'linkedin-posts') {
    const artifact: GeneratedArtifact = {
      type: 'linkedin-post',
      title: `Como transformar ${brief} em um sistema de conteudo reaproveitavel`,
      summary: `Post local com texto e assets visuais basicos para ${squadName}.`,
      content: [
        `${brief} deixou de ser apenas um ganho de produtividade.`,
        '',
        'Quando voce estrutura um fluxo com IA, cada entrega deixa de ser um item isolado e passa a virar ativo reutilizavel.',
        '',
        '- um post pode virar carrossel',
        '- um roteiro pode virar email',
        '- um infografico pode sustentar varias publicacoes',
        '',
        'O que separa operacoes maduras das demais nao e so gerar mais rapido. E conseguir reaproveitar melhor tudo o que foi criado.',
      ].join('\n'),
      checklist: [
        'Definir a mensagem central',
        'Gerar uma capa forte para o post',
        'Preparar uma versao visual resumida',
      ],
    }

    return {
      ...artifact,
      assets: await materializeAssets([], artifact.type, artifact.title, artifact.summary, brief, visualMode, onProgress),
    }
  }

  if (squadSlug === 'recruiting-screening') {
    const artifact: GeneratedArtifact = {
      type: 'recruiting-report',
      title: 'Parecer inicial de recrutamento e selecao',
      summary: 'Analise preliminar do candidato em relacao a vaga, com pontos fortes, riscos e recomendacao final.',
      content: [
        'Resumo da avaliacao:',
        `- Vaga: ${extractInputValue(brief, 'Vaga') || 'Nao informada'}`,
        `- Senioridade: ${extractInputValue(brief, 'Senioridade') || 'Nao informada'}`,
        '',
        'Aderencia inicial:',
        '- Score estimado: 78/100',
        '- Forte alinhamento tecnico com os requisitos principais',
        '- Sinais positivos de capacidade analitica e comunicacao',
        '- Validar profundidade pratica nas competencias obrigatorias',
        '',
        'Riscos e pontos de atencao:',
        '- Confirmar experiencia real no contexto da vaga',
        '- Investigar estabilidade e motivacao de mudanca',
        '',
        'Perguntas sugeridas para entrevista:',
        '1. Qual foi o desafio mais complexo que voce resolveu em contexto semelhante?',
        '2. Como voce prioriza qualidade, prazo e alinhamento com stakeholders?',
        '3. Em quais competencias desta vaga voce gera mais impacto hoje?',
        '',
        'Recomendacao final:',
        '- Avancar para entrevista tecnica.',
      ].join('\n'),
      checklist: [
        'Validar aderencia aos requisitos obrigatorios',
        'Confirmar experiencia pratica no contexto da vaga',
        'Aplicar roteiro de entrevista com foco em evidencias',
      ],
      assets: [],
    }

    return artifact
  }

  const artifact: GeneratedArtifact = {
    type: squadSlug === 'instagram-carousel' ? 'carousel' : 'generic',
    title: `${squadName}: resultado para "${brief}"`,
    summary: `Saida de teste gerada localmente para ${squadName}.`,
    content: `Briefing recebido: ${brief}\n\nResultado simulado com sucesso para o squad ${squadName}.`,
  }

  return {
    ...artifact,
    assets: await materializeAssets([], artifact.type, artifact.title, artifact.summary, brief, visualMode, onProgress),
  }
}

async function materializeAssets(
  rawAssets: RawAssetSpec[] | undefined,
  artifactType: GeneratedArtifact['type'],
  title: string,
  summary: string,
  brief: string,
  visualMode: VisualMode,
  onProgress?: ArtifactProgressReporter
): Promise<GeneratedAsset[]> {
  const assetSpecs = rawAssets && rawAssets.length > 0
    ? rawAssets
    : buildDefaultAssetSpecs(artifactType, title, summary, brief)

  return await Promise.all(assetSpecs.slice(0, 2).map(async (asset, index) => {
    if (asset.type === 'infographic') {
      const slides = (asset.slides && asset.slides.length > 0 ? asset.slides : buildDefaultSlides(title, summary, brief))
        .slice(0, 5)
      const fallbackInfographic = buildInfographicOverviewImage(title, slides)
      const shouldGenerateRealInfographic = isRealInfographicEnabled(visualMode)
      const infographicUrl = shouldGenerateRealInfographic
        ? await (async () => {
            await onProgress?.({
              currentStep: 2,
              phase: 'Gerando infografico',
            })

            return generateImageAsset(
              buildInfographicOverviewPrompt(title, slides),
              'portrait',
              fallbackInfographic
            )
          })()
        : fallbackInfographic
      const renderedSlides = slides.map((slide) => ({
        title: slide.title,
        body: slide.body,
        imageUrl: infographicUrl,
      }))

      return {
        id: `asset-${index + 1}`,
        type: 'infographic',
        title: asset.title,
        prompt: asset.prompt,
        alt: asset.alt,
        url: infographicUrl,
        mimeType: shouldGenerateRealInfographic && !infographicUrl.startsWith('data:image/svg+xml')
          ? inferMimeTypeFromUrl(infographicUrl)
          : 'image/svg+xml',
        width: 1080,
        height: 1350,
        slides: renderedSlides,
      }
    }

    const compactPrompt = compactVisualPrompt(asset.prompt)
    const fallbackCover = buildCoverImage(asset.title, summary, brief)

    if (!isRealCoverEnabled(visualMode)) {
      return {
        id: `asset-${index + 1}`,
        type: 'image',
        title: asset.title,
        prompt: compactPrompt,
        alt: asset.alt,
        url: fallbackCover,
        mimeType: 'image/svg+xml',
        width: 1200,
        height: 628,
      }
    }

    await onProgress?.({
      currentStep: 2,
      phase: index === 0 ? 'Gerando imagem principal' : 'Gerando imagem complementar',
    })

    return {
      id: `asset-${index + 1}`,
      type: 'image',
      title: asset.title,
      prompt: compactPrompt,
      alt: asset.alt,
      url: await generateImageAsset(
        compactPrompt,
        'landscape',
        fallbackCover
      ),
      mimeType: 'image/jpeg',
      width: 1200,
      height: 628,
    }
  }))
}

function buildDefaultAssetSpecs(
  artifactType: GeneratedArtifact['type'],
  title: string,
  summary: string,
  brief: string
): RawAssetSpec[] {
  if (artifactType === 'recruiting-report') {
    return []
  }

  const basePrompt = `Crie uma composicao editorial sobre ${brief}, com visual limpo, contraste forte e foco em clareza.`

  if (artifactType === 'linkedin-post' || artifactType === 'carousel') {
    return [
      {
        type: 'image',
        title: `Capa: ${title}`,
        prompt: `${basePrompt} Use linguagem visual corporativa e moderna para LinkedIn.`,
        alt: `Capa visual para ${title}`,
      },
      {
        type: 'infographic',
        title: `Infografico: ${title}`,
        prompt: `Crie um infografico em 4 blocos com os principais pontos sobre ${brief}.`,
        alt: `Infografico resumindo ${title}`,
        slides: buildDefaultSlides(title, summary, brief),
      },
    ]
  }

  return [
    {
      type: 'image',
      title: `Visual: ${title}`,
      prompt: `${basePrompt} Use uma capa editorial objetiva e util.`,
      alt: `Imagem de apoio para ${title}`,
    },
  ]
}

function buildExecutionBrief(squadSlug: string, inputs: Record<string, string>): string {
  if (squadSlug === 'recruiting-screening') {
    const fields = [
      ['Vaga', inputs.jobTitle],
      ['Empresa', inputs.companyName],
      ['Senioridade', inputs.seniority],
      ['Localizacao', inputs.location],
      ['Tipo de contratacao', inputs.employmentType],
      ['Faixa salarial', inputs.salaryRange],
      ['Competencias obrigatorias', inputs.requiredSkills],
      ['Competencias desejaveis', inputs.niceToHaveSkills],
      ['Resumo da vaga', inputs.jobDescription],
      ['Curriculo do candidato', inputs.candidateResume],
      ['Observacoes do recrutador', inputs.recruiterNotes],
    ]

    return fields
      .filter(([, value]) => value && value.trim())
      .map(([label, value]) => `${label}: ${value?.trim()}`)
      .join('\n')
  }

  return inputs.brief || inputs.topic || 'Sem briefing informado'
}

function extractInputValue(brief: string, label: string): string | null {
  const match = brief.match(new RegExp(`${label}:\\s*(.+)`))
  return match?.[1]?.trim() || null
}

function buildDefaultSlides(title: string, summary: string, brief: string): RawAssetSlide[] {
  return [
    {
      title: 'Contexto',
      body: brief,
    },
    {
      title: 'Mensagem central',
      body: summary,
    },
    {
      title: 'Aplicacao',
      body: 'Transforme o conteudo em post, carrossel, email e material de apoio.',
    },
    {
      title: 'Proximo passo',
      body: 'Publique, meca o retorno e gere variacoes a partir do mesmo ativo.',
    },
  ]
}

async function generateImageAsset(
  prompt: string,
  aspectRatio: 'landscape' | 'portrait',
  fallbackUrl: string
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  const model = aspectRatio === 'portrait'
    ? process.env.OPENROUTER_INFOGRAPHIC_MODEL || process.env.OPENROUTER_IMAGE_MODEL || 'bytedance-seed/seedream-4.5'
    : process.env.OPENROUTER_IMAGE_MODEL || 'bytedance-seed/seedream-4.5'

  if (!apiKey) {
    return fallbackUrl
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Opensquad',
      },
      body: JSON.stringify({
        model,
        modalities: ['image'],
        messages: [
          {
            role: 'user',
            content: compactVisualPrompt(prompt),
          },
        ],
        image_config: {
          aspect_ratio: aspectRatio === 'portrait' ? '4:5' : '16:9',
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenRouter image API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json() as {
      choices?: Array<{
        message?: {
          images?: Array<{
            image_url?: { url?: string }
            imageUrl?: { url?: string }
          }>
        }
      }>
    }

    const image = data.choices?.[0]?.message?.images?.[0]
    const url = image?.image_url?.url || image?.imageUrl?.url

    return url || fallbackUrl
  } catch (error) {
    console.error('Real image generation failed, using SVG fallback:', error)
    return fallbackUrl
  }
}

function buildInfographicOverviewPrompt(title: string, slides: RawAssetSlide[]): string {
  const bullets = slides.map((slide, index) => `${index + 1}. ${slide.title}: ${slide.body}`).join(' ')

  return [
    'Create a single polished infographic in Portuguese (Brazil).',
    'Vertical format, highly legible typography, corporate but modern style.',
    'Use a premium blue and white palette, clear hierarchy, and plenty of whitespace.',
    `Main title: ${title}.`,
    `Include these sections clearly: ${bullets}.`,
    'Render this as a complete infographic card ready for LinkedIn or Instagram carousel.',
  ].join(' ')
}

function normalizeVisualMode(value: string | undefined): VisualMode {
  if (value === 'economic' || value === 'balanced' || value === 'premium') {
    return value
  }

  return 'balanced'
}

function isRealCoverEnabled(visualMode: VisualMode): boolean {
  return visualMode === 'balanced' || visualMode === 'premium'
}

function isRealInfographicEnabled(visualMode: VisualMode): boolean {
  if (visualMode !== 'premium') {
    return false
  }

  return String(process.env.OPENROUTER_REAL_INFOGRAPHIC || 'false').toLowerCase() === 'true'
}

function compactVisualPrompt(prompt: string): string {
  const normalized = prompt
    .replace(/\s+/g, ' ')
    .replace(/\s([,.!?;:])/g, '$1')
    .trim()

  if (normalized.length <= 320) {
    return normalized
  }

  return `${normalized.slice(0, 317).trimEnd()}...`
}

function inferMimeTypeFromUrl(url: string): string {
  if (url.startsWith('data:image/png')) return 'image/png'
  if (url.startsWith('data:image/webp')) return 'image/webp'
  if (url.startsWith('data:image/svg+xml')) return 'image/svg+xml'
  return 'image/jpeg'
}

function buildCoverImage(title: string, summary: string, eyebrow: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="628" viewBox="0 0 1200 628">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#2563eb" />
        </linearGradient>
      </defs>
      <rect width="1200" height="628" fill="url(#bg)" rx="28" />
      <circle cx="1030" cy="118" r="120" fill="rgba(255,255,255,0.08)" />
      <circle cx="140" cy="520" r="180" fill="rgba(255,255,255,0.06)" />
      <text x="72" y="96" fill="#bfdbfe" font-family="Arial, sans-serif" font-size="24" font-weight="700">${escapeXml(eyebrow.toUpperCase())}</text>
      <foreignObject x="72" y="128" width="760" height="260">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial, sans-serif; color: white; font-size: 54px; font-weight: 800; line-height: 1.08;">
          ${escapeHtml(title)}
        </div>
      </foreignObject>
      <foreignObject x="72" y="420" width="720" height="120">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial, sans-serif; color: #dbeafe; font-size: 24px; line-height: 1.4;">
          ${escapeHtml(summary)}
        </div>
      </foreignObject>
      <rect x="900" y="438" width="220" height="112" rx="24" fill="rgba(255,255,255,0.12)" />
      <text x="936" y="492" fill="#ffffff" font-family="Arial, sans-serif" font-size="28" font-weight="700">AI Asset</text>
      <text x="936" y="528" fill="#bfdbfe" font-family="Arial, sans-serif" font-size="20">Post ready</text>
    </svg>
  `

  return svgToDataUrl(svg)
}

function buildInfographicOverviewImage(title: string, slides: RawAssetSlide[]): string {
  const slidesHtml = slides
    .map((slide, index) => `
      <div style="padding: 18px 0; border-top: ${index === 0 ? 'none' : '1px solid #dbeafe'};">
        <div style="font-size: 28px; font-weight: 700; color: #0f172a;">${index + 1}. ${escapeHtml(slide.title)}</div>
        <div style="margin-top: 8px; font-size: 20px; color: #334155; line-height: 1.45;">${escapeHtml(slide.body)}</div>
      </div>
    `)
    .join('')

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#eff6ff" />
          <stop offset="100%" stop-color="#dbeafe" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1350" fill="url(#bg)" />
      <rect x="72" y="72" width="936" height="1206" rx="36" fill="#ffffff" />
      <text x="120" y="166" fill="#2563eb" font-family="Arial, sans-serif" font-size="30" font-weight="700">INFOGRAFICO</text>
      <foreignObject x="120" y="220" width="820" height="180">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial, sans-serif; color: #0f172a; font-size: 50px; font-weight: 800; line-height: 1.1;">
          ${escapeHtml(title)}
        </div>
      </foreignObject>
      <foreignObject x="120" y="430" width="820" height="600">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial, sans-serif; color: #334155; font-size: 28px; line-height: 1.5;">
          ${slidesHtml}
        </div>
      </foreignObject>
      <foreignObject x="120" y="1110" width="820" height="140">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial, sans-serif; color: #64748b; font-size: 22px; line-height: 1.4;">
          ${escapeHtml(title)}
        </div>
      </foreignObject>
    </svg>
  `

  return svgToDataUrl(svg)
}

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function escapeHtml(value: string): string {
  return escapeXml(value).replace(/\n/g, '<br/>')
}
