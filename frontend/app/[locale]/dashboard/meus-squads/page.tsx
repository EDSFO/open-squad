'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { UserSquadList } from '@/components/dashboard/UserSquadList'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

interface UserSquad {
  id: string
  squadId: string
  slug: string
  name: string
  description: string
  price: number
  currency: 'BRL' | 'USD'
  isActive: boolean
  category: string
}

interface BackendUserSquad {
  id: string
  slug: string
  localization?: {
    name: string
    description: string
    price: number
  } | null
}

export default function MeusSquadsPage() {
  const t = useTranslations('meuSquads')
  const router = useRouter()
  const pathname = usePathname()
  const locale = pathname.startsWith('/pt-BR') ? 'pt-BR' : 'en-US'

  const [squads, setSquads] = useState<UserSquad[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [executingId, setExecutingId] = useState<string | null>(null)
  const [managingRagId, setManagingRagId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    fetchUserSquads()
  }, [])

  const fetchUserSquads = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No token found')
      }

      const response = await fetch(`${BACKEND_URL}/squads/mine`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch squads')
      }

      const data = await response.json()
      const normalizedSquads: UserSquad[] = (data.squads || []).map((squad: BackendUserSquad) => ({
        id: squad.id,
        squadId: squad.id,
        slug: squad.slug,
        name: squad.localization?.name || squad.slug,
        description: squad.localization?.description || '',
        price: (squad.localization?.price || 0) / 100,
        currency: locale === 'pt-BR' ? 'BRL' : 'USD',
        isActive: true,
        category: squad.slug.includes('instagram') ? 'social' : squad.slug.includes('linkedin') ? 'marketing' : 'content',
      }))
      setSquads(normalizedSquads)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExecute = async (squadSlug: string) => {
    setExecutingId(squadSlug)
    router.push(`/${locale}/dashboard/execute/${squadSlug}`)
  }

  const handleManageRag = async (squadSlug: string) => {
    setManagingRagId(squadSlug)
    router.push(`/${locale}/dashboard/rag/${squadSlug}`)
  }

  const handleToggleActive = async (squadId: string, newIsActive: boolean) => {
    setTogglingId(squadId)
    setSquads((prev) =>
      prev.map((squad) =>
        squad.id === squadId ? { ...squad, isActive: newIsActive } : squad
      )
    )
    setTimeout(() => setTogglingId(null), 200)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-slate-600">{t('subtitle')}</p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Squads list */}
      {!isLoading && !error && (
        <UserSquadList
          squads={squads}
          onExecute={handleExecute}
          onManageRag={handleManageRag}
          onToggleActive={handleToggleActive}
          executingId={executingId}
          managingRagId={managingRagId}
          togglingId={togglingId}
        />
      )}
    </div>
  )
}
