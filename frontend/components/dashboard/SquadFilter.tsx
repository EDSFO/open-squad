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
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            selectedCategory === category.key
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >
          {t(category.labelKey)}
        </button>
      ))}
    </div>
  )
}
