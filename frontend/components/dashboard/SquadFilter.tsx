'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface SquadFilterProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
}

const categories = [
  { key: 'all', labelKey: 'filter.all' },
  { key: 'content', labelKey: 'filter.content' },
  { key: 'marketing', labelKey: 'filter.marketing' },
  { key: 'social', labelKey: 'filter.social' },
]

export function SquadFilter({ selectedCategory, onCategoryChange }: SquadFilterProps) {
  const t = useTranslations('marketplace')

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <button
          key={category.key}
          onClick={() => onCategoryChange(category.key)}
          className={cn(
            'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
            selectedCategory === category.key
              ? 'border-[#ef233c]/20 bg-[#ef233c]/12 text-white'
              : 'border-white/10 bg-white/[0.04] text-zinc-400 hover:border-white/20 hover:bg-white/[0.08] hover:text-white'
          )}
        >
          {t(category.labelKey)}
        </button>
      ))}
    </div>
  )
}
