'use client'

import { useTranslations } from 'next-intl'
import { Database, Loader2, Pause, Play, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  onManageRag?: (squadId: string) => void
  onToggleActive?: (squadId: string, isActive: boolean) => void
  executingId?: string | null
  managingRagId?: string | null
  togglingId?: string | null
}

export function UserSquadList({
  squads,
  isLoading = false,
  onExecute,
  onManageRag,
  onToggleActive,
  executingId,
  managingRagId,
  togglingId,
}: UserSquadListProps) {
  const t = useTranslations('meuSquads')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#ef233c]" />
      </div>
    )
  }

  if (squads.length === 0) {
    return (
      <div className="dashboard-card p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
          <Zap className="h-8 w-8 text-zinc-500" />
        </div>
        <h3 className="text-lg font-medium text-white">{t('empty')}</h3>
        <p className="mt-2 text-sm text-zinc-400">{t('emptySubtitle')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {squads.map((squad) => {
        const isExecuting = executingId === squad.slug
        const isManagingRag = managingRagId === squad.slug
        const isToggling = togglingId === squad.id

        return (
          <div
            key={squad.id}
            className={cn(
              'dashboard-card transition-transform duration-300 hover:-translate-y-0.5',
              squad.isActive ? 'border-emerald-400/20' : 'border-white/10'
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-white">{squad.name}</h3>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-xs font-medium',
                      squad.isActive
                        ? 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                        : 'border border-white/10 bg-white/[0.04] text-zinc-400'
                    )}
                  >
                    {squad.isActive ? t('active') : t('inactive')}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{squad.description}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-zinc-500">{squad.category}</p>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => onManageRag?.(squad.slug)}
                  disabled={isManagingRag}
                  variant="outline"
                  className="min-w-[140px]"
                >
                  {isManagingRag ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Database className="mr-2 h-4 w-4" />
                      Gerenciar RAG
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => onExecute?.(squad.slug)}
                  disabled={isExecuting || !squad.isActive}
                  className={cn(
                    'min-w-[140px]',
                    !squad.isActive && 'border-white/10 bg-zinc-800 text-zinc-500 hover:translate-y-0 hover:bg-zinc-800'
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

                <Button
                  onClick={() => onToggleActive?.(squad.id, !squad.isActive)}
                  disabled={isToggling}
                  variant="secondary"
                  className="min-w-[140px]"
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
