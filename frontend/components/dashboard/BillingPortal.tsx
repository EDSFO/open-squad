'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { CreditCard, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

interface BillingPortalProps {
  hasSubscription?: boolean
}

export function BillingPortal({ hasSubscription = false }: BillingPortalProps) {
  const t = useTranslations('billing')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOpenPortal = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No token found')
      }

      const response = await fetch(`${BACKEND_URL}/billing/portal`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session')
      }

      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsLoading(false)
    }
  }

  return (
    <div className="dashboard-card">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-2xl border border-white/10 bg-[#ef233c]/12 p-3">
          <CreditCard className="h-5 w-5 text-[#ff758f]" />
        </div>
        <h2 className="text-lg font-semibold text-white">{t('title')}</h2>
      </div>

      <p className="mb-4 text-sm text-zinc-400">
        {hasSubscription ? t('description.manage') : t('description.noSubscription')}
      </p>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <Button onClick={handleOpenPortal} disabled={isLoading}>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <ExternalLink className="mr-2 h-4 w-4" />
            {hasSubscription ? t('manageSubscription') : t('openPortal')}
          </>
        )}
      </Button>
    </div>
  )
}
