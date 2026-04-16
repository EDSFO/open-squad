'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, ExternalLink, CreditCard } from 'lucide-react'
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

      // Redirect to Stripe Customer Portal
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <CreditCard className="h-5 w-5 text-blue-600" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">{t('title')}</h2>
      </div>

      <p className="text-sm text-slate-600 mb-4">
        {hasSubscription ? t('description.manage') : t('description.noSubscription')}
      </p>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <Button
        onClick={handleOpenPortal}
        disabled={isLoading}
        className="bg-blue-600 hover:bg-blue-700"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <ExternalLink className="h-4 w-4 mr-2" />
            {hasSubscription ? t('manageSubscription') : t('openPortal')}
          </>
        )}
      </Button>
    </div>
  )
}
