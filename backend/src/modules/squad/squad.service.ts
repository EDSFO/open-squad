import { prisma } from '../../lib/prisma'

export interface SquadLocalizationData {
  id: string
  locale: string
  name: string
  description: string
  price: number
}

export interface SquadData {
  id: string
  slug: string
  isPublished: boolean
  creatorUserId?: string | null
  localization: SquadLocalizationData | null
}

export interface SquadDetailData extends SquadData {
  localizations: SquadLocalizationData[]
}

export interface AuthorSquadData extends SquadDetailData {
  globalKnowledgeCount: number
}

interface UpsertLocalizationInput {
  locale: 'pt-BR' | 'en-US'
  name: string
  description: string
  price: number
}

interface CreateAuthorSquadInput {
  userId: string
  slug: string
  localizations: UpsertLocalizationInput[]
  isPublished?: boolean
}

interface UpdateAuthorSquadInput extends CreateAuthorSquadInput {
  squadId: string
}

export async function getPublishedSquads(locale: string = 'pt-BR'): Promise<SquadData[]> {
  const squads = await prisma.squad.findMany({
    where: { isPublished: true },
    select: {
      id: true,
      slug: true,
      isPublished: true,
      creatorUserId: true,
      localizations: {
        where: { locale },
        select: {
          id: true,
          locale: true,
          name: true,
          description: true,
          price: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return squads.map((squad) => ({
    id: squad.id,
    slug: squad.slug,
    isPublished: squad.isPublished,
    creatorUserId: squad.creatorUserId,
    localization: squad.localizations[0] || null,
  }))
}

export async function getSquadBySlug(
  slug: string,
  locale: string = 'pt-BR'
): Promise<SquadDetailData | null> {
  const squad = await prisma.squad.findUnique({
    where: { slug, isPublished: true },
    include: {
      localizations: {
        select: {
          id: true,
          locale: true,
          name: true,
          description: true,
          price: true,
        },
      },
    },
  })

  if (!squad) {
    return null
  }

  return {
    id: squad.id,
    slug: squad.slug,
    isPublished: squad.isPublished,
    creatorUserId: squad.creatorUserId,
    localizations: squad.localizations,
    localization: squad.localizations.find((l) => l.locale === locale) || null,
  }
}

export async function getUserSquads(userId: string, locale: string = 'pt-BR'): Promise<SquadData[]> {
  const userSquads = await prisma.userSquad.findMany({
    where: {
      userId,
      isActive: true,
    },
    select: {
      squad: {
        select: {
          id: true,
          slug: true,
          isPublished: true,
          creatorUserId: true,
          localizations: {
            where: { locale },
            select: {
              id: true,
              locale: true,
              name: true,
              description: true,
              price: true,
            },
          },
        },
      },
      purchasedAt: true,
    },
    orderBy: { purchasedAt: 'desc' },
  })

  return userSquads.map((userSquad) => ({
    id: userSquad.squad.id,
    slug: userSquad.squad.slug,
    isPublished: userSquad.squad.isPublished,
    creatorUserId: userSquad.squad.creatorUserId,
    localization: userSquad.squad.localizations[0] || null,
  }))
}

export async function purchaseSquad(
  userId: string,
  squadId: string,
  stripePaymentId?: string
): Promise<{ success: boolean; error?: string; userSquad?: object }> {
  return await prisma.$transaction(async (tx) => {
    // Check if squad exists
    const squad = await tx.squad.findUnique({
      where: { id: squadId },
    })

    if (!squad) {
      return { success: false, error: 'Squad not found' }
    }

    // Check if user already owns this squad
    const existingUserSquad = await tx.userSquad.findUnique({
      where: {
        userId_squadId: {
          userId,
          squadId,
        },
      },
    })

    if (existingUserSquad) {
      if (existingUserSquad.isActive) {
        return { success: false, error: 'User already owns this squad' }
      }
      // Reactivate the squad
      const reactivated = await tx.userSquad.update({
        where: { id: existingUserSquad.id },
        data: {
          isActive: true,
          stripePaymentId,
          purchasedAt: new Date(),
        },
      })
      return { success: true, userSquad: reactivated }
    }

    // Check squad limit enforcement
    const user = await tx.user.findUnique({ where: { id: userId } })
    if (!user) {
      return { success: false, error: 'User not found' }
    }
    const activeSquadCount = await tx.userSquad.count({ where: { userId, isActive: true } })
    if (activeSquadCount >= user.squadLimit) {
      return { success: false, error: 'Squad limit reached. Upgrade your plan to add more squads.' }
    }

    // Create new UserSquad record
    const userSquad = await tx.userSquad.create({
      data: {
        userId,
        squadId,
        stripePaymentId,
        isActive: true,
      },
    })

    return { success: true, userSquad }
  })
}

export async function getAuthorSquads(
  userId: string,
  locale: string = 'pt-BR'
): Promise<AuthorSquadData[]> {
  const squads = await prisma.squad.findMany({
    where: {
      creatorUserId: userId,
    },
    include: {
      localizations: {
        select: {
          id: true,
          locale: true,
          name: true,
          description: true,
          price: true,
        },
      },
      _count: {
        select: {
          knowledgeEntries: {
            where: {
              scope: 'GLOBAL',
            },
          },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return squads.map((squad) => ({
    id: squad.id,
    slug: squad.slug,
    isPublished: squad.isPublished,
    creatorUserId: squad.creatorUserId,
    localizations: squad.localizations,
    localization: squad.localizations.find((item) => item.locale === locale) || null,
    globalKnowledgeCount: squad._count.knowledgeEntries,
  }))
}

export async function getClaimableSquads(
  locale: string = 'pt-BR'
): Promise<SquadData[]> {
  const squads = await prisma.squad.findMany({
    where: {
      creatorUserId: null,
    },
    select: {
      id: true,
      slug: true,
      isPublished: true,
      creatorUserId: true,
      localizations: {
        where: { locale },
        select: {
          id: true,
          locale: true,
          name: true,
          description: true,
          price: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return squads.map((squad) => ({
    id: squad.id,
    slug: squad.slug,
    isPublished: squad.isPublished,
    creatorUserId: squad.creatorUserId,
    localization: squad.localizations[0] || null,
  }))
}

export async function createAuthorSquad(input: CreateAuthorSquadInput): Promise<AuthorSquadData> {
  const squad = await prisma.squad.create({
    data: {
      slug: input.slug,
      creatorUserId: input.userId,
      isPublished: input.isPublished ?? false,
      localizations: {
        create: input.localizations.map((localization) => ({
          locale: localization.locale,
          name: localization.name.trim(),
          description: localization.description.trim(),
          price: localization.price,
        })),
      },
    },
    include: {
      localizations: true,
      _count: {
        select: {
          knowledgeEntries: {
            where: {
              scope: 'GLOBAL',
            },
          },
        },
      },
    },
  })

  return {
    id: squad.id,
    slug: squad.slug,
    isPublished: squad.isPublished,
    creatorUserId: squad.creatorUserId,
    localizations: squad.localizations,
    localization: squad.localizations[0] || null,
    globalKnowledgeCount: squad._count.knowledgeEntries,
  }
}

export async function updateAuthorSquad(input: UpdateAuthorSquadInput): Promise<AuthorSquadData | null> {
  const existing = await prisma.squad.findFirst({
    where: {
      id: input.squadId,
      creatorUserId: input.userId,
    },
    include: {
      localizations: true,
    },
  })

  if (!existing) {
    return null
  }

  const slugConflict = await prisma.squad.findFirst({
    where: {
      slug: input.slug,
      NOT: {
        id: input.squadId,
      },
    },
    select: { id: true },
  })

  if (slugConflict) {
    throw new Error('SLUG_ALREADY_EXISTS')
  }

  await prisma.$transaction(async (tx) => {
    await tx.squad.update({
      where: { id: input.squadId },
      data: {
        slug: input.slug,
        isPublished: input.isPublished ?? existing.isPublished,
      },
    })

    for (const localization of input.localizations) {
      await tx.squadLocalization.upsert({
        where: {
          squadId_locale: {
            squadId: input.squadId,
            locale: localization.locale,
          },
        },
        update: {
          name: localization.name.trim(),
          description: localization.description.trim(),
          price: localization.price,
        },
        create: {
          squadId: input.squadId,
          locale: localization.locale,
          name: localization.name.trim(),
          description: localization.description.trim(),
          price: localization.price,
        },
      })
    }
  })

  const updated = await prisma.squad.findUnique({
    where: { id: input.squadId },
    include: {
      localizations: true,
      _count: {
        select: {
          knowledgeEntries: {
            where: {
              scope: 'GLOBAL',
            },
          },
        },
      },
    },
  })

  if (!updated) {
    return null
  }

  return {
    id: updated.id,
    slug: updated.slug,
    isPublished: updated.isPublished,
    creatorUserId: updated.creatorUserId,
    localizations: updated.localizations,
    localization: updated.localizations[0] || null,
    globalKnowledgeCount: updated._count.knowledgeEntries,
  }
}

export async function setSquadPublishState(
  userId: string,
  squadId: string,
  isPublished: boolean
): Promise<AuthorSquadData | null> {
  const squad = await prisma.squad.findFirst({
    where: {
      id: squadId,
      creatorUserId: userId,
    },
  })

  if (!squad) {
    return null
  }

  await prisma.squad.update({
    where: { id: squadId },
    data: { isPublished },
  })

  const updated = await getAuthorSquads(userId)
  return updated.find((item) => item.id === squadId) || null
}

export async function claimSquadOwnership(
  userId: string,
  squadId: string
): Promise<AuthorSquadData | null> {
  const squad = await prisma.squad.findUnique({
    where: { id: squadId },
  })

  if (!squad) {
    return null
  }

  if (squad.creatorUserId && squad.creatorUserId !== userId) {
    throw new Error('SQUAD_ALREADY_CLAIMED')
  }

  await prisma.squad.update({
    where: { id: squadId },
    data: {
      creatorUserId: userId,
    },
  })

  const updated = await getAuthorSquads(userId)
  return updated.find((item) => item.id === squadId) || null
}
