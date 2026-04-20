import { SquadKnowledgeEntry, SquadKnowledgeScope } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { chunkKnowledgeDocument, extractTextFromKnowledgeFile } from './knowledge.document'

export interface KnowledgeEntryData {
  id: string
  squadId: string
  scope: 'GLOBAL' | 'PRIVATE'
  title: string
  content: string
  source: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface KnowledgeAccessSummary {
  canManageGlobal: boolean
  canManagePrivate: boolean
  hasPrivateAccess: boolean
}

interface CreateKnowledgeEntryInput {
  userId: string
  squadIdOrSlug: string
  scope: 'GLOBAL' | 'PRIVATE'
  title: string
  content: string
  source?: string
  tags?: string[]
}

interface CreateKnowledgeEntriesFromFileInput {
  userId: string
  squadIdOrSlug: string
  scope: 'GLOBAL' | 'PRIVATE'
  fileName: string
  fileBuffer: Buffer
  mimeType?: string
  title?: string
  source?: string
  tags?: string[]
}

interface ListKnowledgeEntriesInput {
  userId: string
  squadIdOrSlug: string
}

interface DeleteKnowledgeEntryInput {
  userId: string
  squadIdOrSlug: string
  entryId: string
}

export class KnowledgeAccessError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

export async function resolveSquadKnowledgeContext(userId: string, squadIdOrSlug: string) {
  const squad = await prisma.squad.findFirst({
    where: {
      OR: [
        { id: squadIdOrSlug },
        { slug: squadIdOrSlug },
      ],
    },
    include: {
      userSquads: {
        where: {
          userId,
          isActive: true,
        },
        take: 1,
      },
    },
  })

  if (!squad) {
    throw new KnowledgeAccessError('SQUAD_NOT_FOUND', 'Squad not found')
  }

  const userSquad = squad.userSquads[0] || null
  const hasPrivateAccess = Boolean(userSquad)
  const canManageGlobal = squad.creatorUserId === userId

  return {
    squad,
    userSquad,
    access: {
      canManageGlobal,
      canManagePrivate: hasPrivateAccess,
      hasPrivateAccess,
    } satisfies KnowledgeAccessSummary,
  }
}

export async function listKnowledgeEntries(input: ListKnowledgeEntriesInput): Promise<{
  globalEntries: KnowledgeEntryData[]
  privateEntries: KnowledgeEntryData[]
  access: KnowledgeAccessSummary
}> {
  const { squad, userSquad, access } = await resolveSquadKnowledgeContext(input.userId, input.squadIdOrSlug)

  const [globalEntries, privateEntries] = await Promise.all([
    prisma.squadKnowledgeEntry.findMany({
      where: {
        squadId: squad.id,
        scope: SquadKnowledgeScope.GLOBAL,
      },
      orderBy: { updatedAt: 'desc' },
    }),
    access.hasPrivateAccess
      ? prisma.squadKnowledgeEntry.findMany({
          where: {
            squadId: squad.id,
            userSquadId: userSquad?.id,
            scope: SquadKnowledgeScope.PRIVATE,
          },
          orderBy: { updatedAt: 'desc' },
        })
      : Promise.resolve([]),
  ])

  return {
    globalEntries: globalEntries.map(mapKnowledgeEntry),
    privateEntries: privateEntries.map(mapKnowledgeEntry),
    access,
  }
}

export async function createKnowledgeEntry(input: CreateKnowledgeEntryInput): Promise<KnowledgeEntryData> {
  const { squad, userSquad, access } = await resolveSquadKnowledgeContext(input.userId, input.squadIdOrSlug)
  const normalizedTags = normalizeTags(input.tags)

  if (input.scope === 'GLOBAL' && !access.canManageGlobal) {
    throw new KnowledgeAccessError('FORBIDDEN_GLOBAL', 'Only the squad creator can manage global knowledge')
  }

  if (input.scope === 'PRIVATE' && !userSquad) {
    throw new KnowledgeAccessError('FORBIDDEN_PRIVATE', 'Only users who own this squad can manage private knowledge')
  }

  const entry = await prisma.squadKnowledgeEntry.create({
    data: {
      squadId: squad.id,
      userSquadId: input.scope === 'PRIVATE' ? userSquad?.id : null,
      scope: input.scope,
      title: input.title.trim(),
      content: input.content.trim(),
      source: input.source?.trim() || null,
      tags: normalizedTags,
    },
  })

  return mapKnowledgeEntry(entry)
}

export async function deleteKnowledgeEntry(input: DeleteKnowledgeEntryInput): Promise<void> {
  const { squad, userSquad, access } = await resolveSquadKnowledgeContext(input.userId, input.squadIdOrSlug)

  const entry = await prisma.squadKnowledgeEntry.findFirst({
    where: {
      id: input.entryId,
      squadId: squad.id,
    },
  })

  if (!entry) {
    throw new KnowledgeAccessError('ENTRY_NOT_FOUND', 'Knowledge entry not found')
  }

  if (entry.scope === SquadKnowledgeScope.GLOBAL && !access.canManageGlobal) {
    throw new KnowledgeAccessError('FORBIDDEN_GLOBAL', 'Only the squad creator can delete global knowledge')
  }

  if (
    entry.scope === SquadKnowledgeScope.PRIVATE &&
    (!userSquad || entry.userSquadId !== userSquad.id)
  ) {
    throw new KnowledgeAccessError('FORBIDDEN_PRIVATE', 'Only the owner can delete private knowledge')
  }

  await prisma.squadKnowledgeEntry.delete({
    where: { id: entry.id },
  })
}

export async function createKnowledgeEntriesFromFile(
  input: CreateKnowledgeEntriesFromFileInput
): Promise<KnowledgeEntryData[]> {
  const { squad, userSquad, access } = await resolveSquadKnowledgeContext(input.userId, input.squadIdOrSlug)
  const normalizedTags = normalizeTags(input.tags)

  if (input.scope === 'GLOBAL' && !access.canManageGlobal) {
    throw new KnowledgeAccessError('FORBIDDEN_GLOBAL', 'Only the squad creator can manage global knowledge')
  }

  if (input.scope === 'PRIVATE' && !userSquad) {
    throw new KnowledgeAccessError('FORBIDDEN_PRIVATE', 'Only users who own this squad can manage private knowledge')
  }

  const extracted = await extractTextFromKnowledgeFile({
    buffer: input.fileBuffer,
    fileName: input.fileName,
    mimeType: input.mimeType,
  })

  const chunks = chunkKnowledgeDocument(extracted.text)
  const baseTitle = buildKnowledgeTitle(input.title, extracted.normalizedFileName)
  const source = buildKnowledgeSource({
    providedSource: input.source,
    fileName: extracted.normalizedFileName,
    detectedType: extracted.detectedType,
  })

  const createdEntries = await prisma.$transaction(
    chunks.map((chunk, index) =>
      prisma.squadKnowledgeEntry.create({
        data: {
          squadId: squad.id,
          userSquadId: input.scope === 'PRIVATE' ? userSquad?.id : null,
          scope: input.scope,
          title: chunks.length > 1 ? `${baseTitle} (parte ${index + 1})` : baseTitle,
          content: chunk,
          source,
          tags: normalizedTags,
        },
      })
    )
  )

  return createdEntries.map(mapKnowledgeEntry)
}

export async function buildKnowledgeContextForExecution(options: {
  userId: string
  squadId: string
  inputs: Record<string, string>
  maxEntries?: number
}): Promise<{
  promptBlock: string
  metadata: {
    globalCount: number
    privateCount: number
    selectedGlobalCount: number
    selectedPrivateCount: number
  }
}> {
  const maxEntries = Math.min(Math.max(options.maxEntries ?? 6, 1), 12)
  const squad = await prisma.squad.findUnique({
    where: { id: options.squadId },
    include: {
      userSquads: {
        where: {
          userId: options.userId,
          isActive: true,
        },
        take: 1,
      },
      knowledgeEntries: {
        orderBy: { updatedAt: 'desc' },
      },
    },
  })

  if (!squad) {
    return {
      promptBlock: '',
      metadata: {
        globalCount: 0,
        privateCount: 0,
        selectedGlobalCount: 0,
        selectedPrivateCount: 0,
      },
    }
  }

  const userSquad = squad.userSquads[0] || null
  const globalEntries = squad.knowledgeEntries.filter((entry) => entry.scope === SquadKnowledgeScope.GLOBAL)
  const privateEntries = userSquad
    ? squad.knowledgeEntries.filter((entry) => entry.scope === SquadKnowledgeScope.PRIVATE && entry.userSquadId === userSquad.id)
    : []

  const retrievalQuery = Object.values(options.inputs)
    .join(' ')
    .trim()

  const selectedGlobal = rankKnowledgeEntries(globalEntries, retrievalQuery).slice(0, Math.ceil(maxEntries / 2))
  const selectedPrivate = rankKnowledgeEntries(privateEntries, retrievalQuery).slice(0, maxEntries - selectedGlobal.length)
  const combined = [...selectedGlobal, ...selectedPrivate]

  return {
    promptBlock: combined.length > 0 ? formatKnowledgePromptBlock(combined) : '',
    metadata: {
      globalCount: globalEntries.length,
      privateCount: privateEntries.length,
      selectedGlobalCount: selectedGlobal.length,
      selectedPrivateCount: selectedPrivate.length,
    },
  }
}

function rankKnowledgeEntries(entries: SquadKnowledgeEntry[], query: string): SquadKnowledgeEntry[] {
  const queryTokens = tokenize(query)

  return [...entries].sort((a, b) => scoreKnowledgeEntry(b, queryTokens) - scoreKnowledgeEntry(a, queryTokens))
}

function scoreKnowledgeEntry(entry: SquadKnowledgeEntry, queryTokens: string[]): number {
  const haystack = tokenize([entry.title, entry.content, entry.source, entry.tags.join(' ')].filter(Boolean).join(' '))
  if (haystack.length === 0) {
    return 0
  }

  const haystackSet = new Set(haystack)
  const overlapScore = queryTokens.reduce((acc, token) => acc + (haystackSet.has(token) ? 3 : 0), 0)
  const recencyScore = Math.max(0, 20 - Math.floor((Date.now() - entry.updatedAt.getTime()) / (1000 * 60 * 60 * 24)))

  return overlapScore + recencyScore
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3)
}

function formatKnowledgePromptBlock(entries: SquadKnowledgeEntry[]): string {
  const lines = entries.map((entry, index) => {
    const scopeLabel = entry.scope === SquadKnowledgeScope.GLOBAL ? 'GLOBAL' : 'PRIVATE'
    const source = entry.source ? ` | Fonte: ${entry.source}` : ''
    const tags = entry.tags.length > 0 ? ` | Tags: ${entry.tags.join(', ')}` : ''

    return [
      `${index + 1}. [${scopeLabel}] ${entry.title}${source}${tags}`,
      entry.content.trim(),
    ].join('\n')
  })

  return [
    'Base de conhecimento recuperada para esta execucao:',
    'Use os itens abaixo como contexto prioritario quando forem relevantes ao pedido do usuario.',
    'Se houver conflito entre briefing atual e conhecimento recuperado, sinalize a tensao e priorize o briefing do usuario.',
    lines.join('\n\n'),
  ].join('\n')
}

function normalizeTags(tags: string[] | undefined): string[] {
  return Array.from(new Set((tags || [])
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12)))
}

function buildKnowledgeTitle(customTitle: string | undefined, fileName: string) {
  const rawTitle = customTitle?.trim() || fileName.replace(/\.[^.]+$/, '')
  return rawTitle.slice(0, 120)
}

function buildKnowledgeSource(input: {
  providedSource?: string
  fileName: string
  detectedType: string
}) {
  if (input.providedSource?.trim()) {
    return input.providedSource.trim()
  }

  return `Arquivo enviado: ${input.fileName} (${input.detectedType})`
}

function mapKnowledgeEntry(entry: SquadKnowledgeEntry): KnowledgeEntryData {
  return {
    id: entry.id,
    squadId: entry.squadId,
    scope: entry.scope,
    title: entry.title,
    content: entry.content,
    source: entry.source,
    tags: entry.tags,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  }
}
