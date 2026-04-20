import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import {
  createKnowledgeEntry,
  createKnowledgeEntriesFromFile,
  deleteKnowledgeEntry,
  KnowledgeAccessError,
  listKnowledgeEntries,
} from './knowledge.service'
import { KnowledgeDocumentError } from './knowledge.document'

const knowledgeBodySchema = z.object({
  scope: z.enum(['GLOBAL', 'PRIVATE']),
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(12000),
  source: z.string().trim().max(240).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
})

const knowledgeUploadSchema = z.object({
  scope: z.enum(['GLOBAL', 'PRIVATE']),
  title: z.string().trim().max(120).optional(),
  source: z.string().trim().max(240).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
})

export async function listKnowledgeHandler(
  request: FastifyRequest<{ Params: { squadId: string } }>,
  reply: FastifyReply
) {
  try {
    const result = await listKnowledgeEntries({
      userId: request.user.userId,
      squadIdOrSlug: request.params.squadId,
    })

    return reply.send(result)
  } catch (error) {
    return handleKnowledgeError(request, reply, error)
  }
}

export async function createKnowledgeHandler(
  request: FastifyRequest<{ Params: { squadId: string } }>,
  reply: FastifyReply
) {
  try {
    const parsed = knowledgeBodySchema.parse(request.body)
    const entry = await createKnowledgeEntry({
      userId: request.user.userId,
      squadIdOrSlug: request.params.squadId,
      scope: parsed.scope,
      title: parsed.title,
      content: parsed.content,
      source: parsed.source,
      tags: parsed.tags,
    })

    return reply.status(201).send({ entry })
  } catch (error) {
    return handleKnowledgeError(request, reply, error)
  }
}

export async function deleteKnowledgeHandler(
  request: FastifyRequest<{ Params: { squadId: string; entryId: string } }>,
  reply: FastifyReply
) {
  try {
    await deleteKnowledgeEntry({
      userId: request.user.userId,
      squadIdOrSlug: request.params.squadId,
      entryId: request.params.entryId,
    })

    return reply.status(204).send()
  } catch (error) {
    return handleKnowledgeError(request, reply, error)
  }
}

export async function uploadKnowledgeHandler(
  request: FastifyRequest<{ Params: { squadId: string } }>,
  reply: FastifyReply
) {
  try {
    const file = await request.file({
      limits: {
        files: 1,
        fileSize: 12 * 1024 * 1024,
      },
    })

    if (!file) {
      return reply.status(400).send({
        error: 'Nenhum arquivo foi enviado',
        code: 'MISSING_FILE',
      })
    }

    const parsed = knowledgeUploadSchema.parse({
      scope: readMultipartField(file.fields, 'scope'),
      title: readMultipartField(file.fields, 'title'),
      source: readMultipartField(file.fields, 'source'),
      tags: parseMultipartTags(readMultipartField(file.fields, 'tags')),
    })

    const entries = await createKnowledgeEntriesFromFile({
      userId: request.user.userId,
      squadIdOrSlug: request.params.squadId,
      scope: parsed.scope,
      title: parsed.title,
      source: parsed.source,
      tags: parsed.tags,
      fileName: file.filename,
      fileBuffer: await file.toBuffer(),
      mimeType: file.mimetype,
    })

    return reply.status(201).send({
      entries,
      importedCount: entries.length,
    })
  } catch (error) {
    return handleKnowledgeError(request, reply, error)
  }
}

function handleKnowledgeError(
  request: FastifyRequest,
  reply: FastifyReply,
  error: unknown
) {
  if (error instanceof z.ZodError) {
    return reply.status(400).send({
      error: 'Invalid knowledge payload',
      code: 'INVALID_PAYLOAD',
      details: error.flatten(),
    })
  }

  if (error instanceof KnowledgeDocumentError) {
    const statusMap: Record<string, number> = {
      UNSUPPORTED_FILE_TYPE: 400,
      EMPTY_DOCUMENT: 400,
    }

    return reply.status(statusMap[error.code] || 400).send({
      error: error.message,
      code: error.code,
    })
  }

  if (error instanceof KnowledgeAccessError) {
    const statusMap: Record<string, number> = {
      SQUAD_NOT_FOUND: 404,
      ENTRY_NOT_FOUND: 404,
      FORBIDDEN_GLOBAL: 403,
      FORBIDDEN_PRIVATE: 403,
    }

    return reply.status(statusMap[error.code] || 400).send({
      error: error.message,
      code: error.code,
    })
  }

  request.log.error(error)
  return reply.status(500).send({
    error: 'Knowledge operation failed',
    code: 'KNOWLEDGE_ERROR',
  })
}

function readMultipartField(fields: Record<string, any> | undefined, key: string) {
  const value = fields?.[key]
  if (!value) {
    return undefined
  }

  if (Array.isArray(value)) {
    return value[0]?.value
  }

  return value.value
}

function parseMultipartTags(rawTags: string | undefined) {
  if (!rawTags) {
    return undefined
  }

  return rawTags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}
