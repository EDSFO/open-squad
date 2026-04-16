'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { SquadCard } from '@/components/dashboard/SquadCard'
import { SquadFilter } from '@/components/dashboard/SquadFilter'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

interface Squad {
  id: string
  slug: string
  name: string
  description: string
  price: number
  currency: 'BRL' | 'USD'
  category: string
}

interface BackendSquad {
  id: string
  slug: string
  localization?: {
    name: string
    description: string
    price: number
  } | null
}

export default function MarketplacePage() {
  const t = useTranslations('marketplace')
  const locale = useLocale()

  const [squads, setSquads] = useState<Squad[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [buyingId, setBuyingId] = useState<string | null>(null)

  useEffect(() => {
    fetchSquads()
  }, [locale])

  const fetchSquads = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${BACKEND_URL}/squads?locale=${locale}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (!response.ok) {
        throw new Error('Failed to fetch squads')
      }

      const data = await response.json()
      const normalizedSquads: Squad[] = (data.squads || []).map((squad: BackendSquad) => ({
        id: squad.id,
        slug: squad.slug,
        name: squad.localization?.name || squad.slug,
        description: squad.localization?.description || '',
        price: (squad.localization?.price || 0) / 100,
        currency: locale === 'pt-BR' ? 'BRL' : 'USD',
        category: squad.slug.includes('instagram') ? 'social' : squad.slug.includes('linkedin') ? 'marketing' : 'content',
      }))
      setSquads(normalizedSquads)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBuy = async (squadId: string) => {
    setBuyingId(squadId)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No token found')
      }

      const response = await fetch(`${BACKEND_URL}/billing/checkout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ squadId }),
      })

      const data = await response.json()

      if (!response.ok) {
        const purchaseResponse = await fetch(`${BACKEND_URL}/squads/${squadId}/purchase`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        })

        const purchaseData = await purchaseResponse.json()

        if (!purchaseResponse.ok) {
          throw new Error(data.error || purchaseData.error || 'Failed to purchase squad')
        }

        await fetchSquads()
        alert('Squad adicionado com sucesso para teste local.')
        return
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred')
      setBuyingId(null)
    }
  }

  const filteredSquads = selectedCategory === 'all'
    ? squads
    : squads.filter(squad => squad.category === selectedCategory)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {t('subtitle')}
        </p>
      </div>

      {/* Filter */}
      <SquadFilter
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

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

      {/* Empty state */}
      {!isLoading && !error && filteredSquads.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          <p className="text-slate-600">{t('empty')}</p>
        </div>
      )}

      {/* Squads grid */}
      {!isLoading && !error && filteredSquads.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSquads.map((squad) => (
            <SquadCard
              key={squad.id}
              id={squad.id}
              name={squad.name}
              description={squad.description}
              price={squad.price}
              currency={squad.currency}
              isLoading={buyingId === squad.id}
              onBuy={handleBuy}
            />
          ))}
        </div>
      )}
    </div>
  )
}
