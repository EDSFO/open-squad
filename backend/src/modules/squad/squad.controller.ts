import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import {
  getPublishedSquads,
  getSquadBySlug,
  getUserSquads,
  purchaseSquad,
} from './squad.service'

const localeSchema = z.enum(['pt-BR', 'en-US']).default('pt-BR')

const purchaseSquadSchema = z.object({
  stripePaymentId: z.string().optional(),
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
