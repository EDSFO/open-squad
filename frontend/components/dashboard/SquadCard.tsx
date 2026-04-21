'use client'

import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SquadCardProps {
  id: string
  name: string
  description: string
  price: number
  currency: 'BRL' | 'USD'
  isLoading?: boolean
  onBuy?: (id: string) => void
}

export function SquadCard({
  id,
  name,
  description,
  price,
  currency,
  isLoading = false,
  onBuy,
}: SquadCardProps) {
  const t = useTranslations('marketplace')

  const formattedPrice = currency === 'BRL'
    ? `R$${price.toFixed(2).replace('.', ',')}`
    : `$${price.toFixed(2)}`

  return (
    <div className="dashboard-card transition-transform duration-300 hover:-translate-y-1">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold text-white">{name}</h3>
          <span className="dashboard-chip uppercase">{currency}</span>
        </div>

        <p className="line-clamp-3 text-sm leading-6 text-zinc-400">{description}</p>

        <div className="h-px w-full bg-gradient-to-r from-white/20 to-transparent" />

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-3xl font-semibold text-white">{formattedPrice}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.24em] text-zinc-500">license</p>
          </div>
        </div>

        <Button onClick={() => onBuy?.(id)} disabled={isLoading} className="w-full">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('buy')}
        </Button>
      </div>
    </div>
  )
}
