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
  localization: SquadLocalizationData | null
}

export interface SquadDetailData extends SquadData {
  localizations: SquadLocalizationData[]
}

export async function getPublishedSquads(locale: string = 'pt-BR'): Promise<SquadData[]> {
  const squads = await prisma.squad.findMany({
    where: { isPublished: true },
    select: {
      id: true,
      slug: true,
      isPublished: true,
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
