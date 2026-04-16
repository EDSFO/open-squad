'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Loader2, Play, Pause, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface UserSquadListProps {
  squads: UserSquad[]
  isLoading?: boolean
  onExecute?: (squadId: string) => void
  onToggleActive?: (squadId: string, isActive: boolean) => void
  executingId?: string | null
  togglingId?: string | null
}

export function UserSquadList({
  squads,
  isLoading = false,
  onExecute,
  onToggleActive,
  executingId,
  togglingId,
}: UserSquadListProps) {
  const t = useTranslations('meuSquads')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (squads.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <Zap className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-900">{t('empty')}</h3>
        <p className="mt-2 text-sm text-slate-500">{t('emptySubtitle')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {squads.map((squad) => {
        const isExecuting = executingId === squad.id
        const isToggling = togglingId === squad.id

        return (
          <div
            key={squad.id}
            className={cn(
              'rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md',
              squad.isActive ? 'border-green-200' : 'border-slate-200'
            )}
          >
            <div className="flex items-start justify-between gap-4">
              {/* Squad info */}
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-slate-900">{squad.name}</h3>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                      squad.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {squad.isActive ? t('active') : t('inactive')}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600 line-clamp-2">{squad.description}</p>
                <p className="mt-2 text-xs text-slate-400 capitalize">{squad.category}</p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {/* Execute button */}
                <Button
                  onClick={() => onExecute?.(squad.slug)}
                  disabled={isExecuting || !squad.isActive}
                  className={cn(
                    'min-w-[120px]',
                    squad.isActive
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-slate-300 hover:bg-slate-300 cursor-not-allowed'
                  )}
                >
                  {isExecuting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      {t('execute')}
                    </>
                  )}
                </Button>

                {/* Activate/Deactivate toggle */}
                <Button
                  onClick={() => onToggleActive?.(squad.id, !squad.isActive)}
                  disabled={isToggling}
                  variant="outline"
                  className="min-w-[120px]"
                >
                  {isToggling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : squad.isActive ? (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      {t('deactivating').replace('...', '')}
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      {t('activating').replace('...', '')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
