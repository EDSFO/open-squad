import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import {
  claimSquadOwnership,
  createAuthorSquad,
  getAuthorSquads,
  getClaimableSquads,
  getPublishedSquads,
  getSquadBySlug,
  getUserSquads,
  purchaseSquad,
  setSquadPublishState,
  updateAuthorSquad,
} from './squad.service'

const localeSchema = z.enum(['pt-BR', 'en-US']).default('pt-BR')

const purchaseSquadSchema = z.object({
  stripePaymentId: z.string().optional(),
})

const localizationSchema = z.object({
  locale: z.enum(['pt-BR', 'en-US']),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(3000),
  price: z.number().int().min(0),
})

const authorSquadSchema = z.object({
  slug: z.string().trim().min(3).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  isPublished: z.boolean().optional(),
  localizations: z.array(localizationSchema).min(1).max(2),
})

const publishStateSchema = z.object({
  isPublished: z.boolean(),
})

type LocaleQuery = { locale?: string }

export async function getSquadsHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const query = request.query as LocaleQuery
    const queryResult = localeSchema.safeParse(query.locale)
    const locale = queryResult.success ? queryResult.data : 'pt-BR'

    const squads = await getPublishedSquads(locale)
    reply.send({ squads })
  } catch (error) {
    reply.status(500).send({ error: 'Internal server error' })
  }
}

export async function getSquadBySlugHandler(
  request: FastifyRequest<{ Params: { slug: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { slug } = request.params
    const query = request.query as LocaleQuery
    const queryResult = localeSchema.safeParse(query.locale)
    const locale = queryResult.success ? queryResult.data : 'pt-BR'

    const squad = await getSquadBySlug(slug, locale)
    if (!squad) {
      reply.status(404).send({ error: 'Squad not found' })
      return
    }
    reply.send({ squad })
  } catch (error) {
    reply.status(500).send({ error: 'Internal server error' })
  }
}

export async function getMySquadsHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Get user locale from their profile
    const user = await prisma.user.findUnique({
      where: { id: request.user.userId },
      select: { locale: true },
    })

    const locale = user?.locale || 'pt-BR'
    const squads = await getUserSquads(request.user.userId, locale)

    reply.send({ squads })
  } catch (error) {
    reply.status(500).send({ error: 'Internal server error' })
  }
}

export async function purchaseSquadHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { id: squadId } = request.params
    const parsed = purchaseSquadSchema.safeParse(request.body)
    const stripePaymentId = parsed.success ? parsed.data.stripePaymentId : undefined

    const result = await purchaseSquad(request.user.userId, squadId, stripePaymentId)

    if (!result.success) {
      if (result.error === 'Squad not found') {
        reply.status(404).send({ error: result.error })
        return
      }
      if (result.error === 'User already owns this squad') {
        reply.status(409).send({ error: result.error })
        return
      }
      reply.status(400).send({ error: result.error })
      return
    }

    reply.status(201).send({ message: 'Squad purchased successfully', userSquad: result.userSquad })
  } catch (error) {
    reply.status(500).send({ error: 'Internal server error' })
  }
}

export async function getMyAuthorSquadsHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: request.user.userId },
      select: { locale: true },
    })

    const locale = user?.locale || 'pt-BR'
    const squads = await getAuthorSquads(request.user.userId, locale)

    reply.send({ squads })
  } catch (error) {
    reply.status(500).send({ error: 'Internal server error' })
  }
}

export async function getClaimableSquadsHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: request.user.userId },
      select: { locale: true },
    })

    const locale = user?.locale || 'pt-BR'
    const squads = await getClaimableSquads(locale)

    reply.send({ squads })
  } catch (error) {
    reply.status(500).send({ error: 'Internal server error' })
  }
}

export async function createAuthorSquadHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const parsed = authorSquadSchema.safeParse(request.body)

    if (!parsed.success) {
      reply.status(400).send({ error: 'Invalid squad payload', details: parsed.error.flatten() })
      return
    }

    const squad = await createAuthorSquad({
      userId: request.user.userId,
      slug: parsed.data.slug,
      isPublished: parsed.data.isPublished,
      localizations: parsed.data.localizations.map((localization) => ({
        locale: localization.locale,
        name: localization.name,
        description: localization.description,
        price: localization.price,
      })),
    })

    reply.status(201).send({ squad })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      reply.status(409).send({ error: 'Slug already exists' })
      return
    }

    reply.status(500).send({ error: 'Internal server error' })
  }
}

export async function updateAuthorSquadHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const parsed = authorSquadSchema.safeParse(request.body)

    if (!parsed.success) {
      reply.status(400).send({ error: 'Invalid squad payload', details: parsed.error.flatten() })
      return
    }

    const squad = await updateAuthorSquad({
      userId: request.user.userId,
      squadId: request.params.id,
      slug: parsed.data.slug,
      isPublished: parsed.data.isPublished,
      localizations: parsed.data.localizations.map((localization) => ({
        locale: localization.locale,
        name: localization.name,
        description: localization.description,
        price: localization.price,
      })),
    })

    if (!squad) {
      reply.status(404).send({ error: 'Squad not found' })
      return
    }

    reply.send({ squad })
  } catch (error) {
    if (error instanceof Error && error.message === 'SLUG_ALREADY_EXISTS') {
      reply.status(409).send({ error: 'Slug already exists' })
      return
    }

    reply.status(500).send({ error: 'Internal server error' })
  }
}

export async function setSquadPublishStateHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const parsed = publishStateSchema.safeParse(request.body)

    if (!parsed.success) {
      reply.status(400).send({ error: 'Invalid publish payload', details: parsed.error.flatten() })
      return
    }

    const squad = await setSquadPublishState(
      request.user.userId,
      request.params.id,
      parsed.data.isPublished
    )

    if (!squad) {
      reply.status(404).send({ error: 'Squad not found' })
      return
    }

    reply.send({ squad })
  } catch (error) {
    reply.status(500).send({ error: 'Internal server error' })
  }
}

export async function claimSquadOwnershipHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const squad = await claimSquadOwnership(request.user.userId, request.params.id)

    if (!squad) {
      reply.status(404).send({ error: 'Squad not found' })
      return
    }

    reply.send({ squad })
  } catch (error) {
    if (error instanceof Error && error.message === 'SQUAD_ALREADY_CLAIMED') {
      reply.status(409).send({ error: 'Squad already claimed by another creator' })
      return
    }

    reply.status(500).send({ error: 'Internal server error' })
  }
}
