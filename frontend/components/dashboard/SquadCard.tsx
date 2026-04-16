'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

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

  const handleBuy = () => {
    if (onBuy) {
      onBuy(id)
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="space-y-4">
        {/* Squad name */}
        <h3 className="text-lg font-semibold text-slate-900">{name}</h3>

        {/* Description */}
        <p className="text-sm text-slate-600 line-clamp-3">{description}</p>

        {/* Price */}
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-slate-900">{formattedPrice}</span>
          <span className="text-xs text-slate-500 uppercase">{currency}</span>
        </div>

        {/* Buy button */}
        <Button
          onClick={handleBuy}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            t('buy')
          )}
        </Button>
      </div>
    </div>
  )
}
