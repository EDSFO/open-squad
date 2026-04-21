'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Copy, ExternalLink, Loader2, Search } from 'lucide-react'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

interface AssetSlide {
  title: string
  body: string
  imageUrl: string
}

interface Asset {
  id: string
  type: 'image' | 'infographic'
  title: string
  prompt: string
  alt: string
  url: string
  slides?: AssetSlide[]
}

interface Artifact {
  type?: string
  title?: string
  summary?: string
  content?: string
  checklist?: string[]
  assets?: Asset[]
}

interface ExecutionRecord {
  id: string
  status: 'pending' | 'active' | 'waiting_checkpoint' | 'completed' | 'failed'
  currentStep: number
  totalSteps: number
  output: Record<string, unknown>
  inputs: Record<string, unknown>
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  squad: {
    id: string
    slug: string
    name: string
    description: string
  }
}

export default function LibraryPage() {
  const t = useTranslations('library')
  const pathname = usePathname()
  const locale = pathname.startsWith('/pt-BR') ? 'pt-BR' : 'en-US'

  const [executions, setExecutions] = useState<ExecutionRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ExecutionRecord['status']>('all')
  const [copyFeedbackId, setCopyFeedbackId] = useState<string | null>(null)

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`${BACKEND_URL}/executor/history?limit=50`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch execution history')
        }

        const data = await response.json()
        setExecutions(data.executions || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    void fetchHistory()
  }, [])

  const normalizedQuery = query.trim().toLowerCase()
  const filteredExecutions = executions.filter((execution) => {
    if (statusFilter !== 'all' && execution.status !== statusFilter) return false
    if (!normalizedQuery) return true

    const artifact = getArtifact(execution)
    const haystack = [
      execution.squad.name,
      execution.squad.slug,
      stringifyValue(execution.inputs.brief),
      artifact?.title,
      artifact?.summary,
      artifact?.content,
      ...(artifact?.assets?.map((asset) => `${asset.title} ${asset.prompt}`) || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(normalizedQuery)
  })

  const completedCount = executions.filter((execution) => execution.status === 'completed').length
  const assetsCount = executions.reduce((acc, execution) => acc + (getArtifact(execution)?.assets?.length || 0), 0)

  const handleCopy = async (execution: ExecutionRecord) => {
    const artifact = getArtifact(execution)
    const textToCopy = artifact ? formatArtifactForCopy(artifact) : JSON.stringify(execution.output, null, 2)

    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopyFeedbackId(execution.id)
      window.setTimeout(() => setCopyFeedbackId(null), 2000)
    } catch (err) {
      console.error('Failed to copy library output:', err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="dashboard-title">{t('title')}</h1>
          <p className="dashboard-subtitle">{t('subtitle')}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label={t('stats.total')} value={String(executions.length)} />
          <StatCard label={t('stats.completed')} value={String(completedCount)} />
          <StatCard label={t('stats.saved')} value={String(assetsCount)} />
        </div>
      </div>

      <div className="dashboard-card">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('searchPlaceholder')}
              className="dashboard-input pl-10"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {(['all', 'completed', 'active', 'failed'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  statusFilter === filter
                    ? 'border-[#ef233c]/20 bg-[#ef233c]/12 text-white'
                    : 'border-white/10 bg-white/[0.04] text-zinc-400 hover:border-white/20 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {t(`filters.${filter}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#ef233c]" />
        </div>
      )}

      {error && !isLoading && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
      )}

      {!isLoading && !error && filteredExecutions.length === 0 && (
        <div className="dashboard-card border-dashed p-12 text-center">
          <h2 className="text-lg font-semibold text-white">{t('empty.title')}</h2>
          <p className="mt-2 text-sm text-zinc-400">{t(query || statusFilter !== 'all' ? 'empty.filtered' : 'empty.default')}</p>
        </div>
      )}

      {!isLoading && !error && filteredExecutions.length > 0 && (
        <div className="space-y-4">
          {filteredExecutions.map((execution) => {
            const artifact = getArtifact(execution)
            const copied = copyFeedbackId === execution.id

            return (
              <article key={execution.id} className="dashboard-card">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(execution.status)}`}>
                        {t(`status.${execution.status}`)}
                      </span>
                      <span className="dashboard-chip">{execution.squad.name}</span>
                      <span className="text-xs text-zinc-500">{formatDate(execution.completedAt || execution.createdAt, locale)}</span>
                    </div>

                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        {artifact?.title || execution.squad.name}
                      </h2>
                      <p className="mt-1 text-sm text-zinc-400">
                        {artifact?.summary || stringifyValue(execution.inputs.brief) || execution.squad.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(execution)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-white/[0.08] hover:text-white"
                    >
                      <Copy className="h-4 w-4" />
                      {copied ? t('copied') : t('copy')}
                    </button>

                    <Link
                      href={`/${locale}/dashboard/execute/${execution.squad.slug}`}
                      className="inline-flex items-center gap-2 rounded-full border border-[#ef233c] bg-[#ef233c] px-3 py-2 text-sm font-medium text-white hover:bg-[#d90429]"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {t('openSquad')}
                    </Link>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
                  <div className="space-y-4">
                    <div className="dashboard-card-soft p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('content')}</p>
                      <pre className="whitespace-pre-wrap text-sm font-sans text-zinc-200">
                        {artifact ? formatArtifactForCopy(artifact) : JSON.stringify(execution.output, null, 2)}
                      </pre>
                    </div>

                    {artifact?.assets && artifact.assets.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('assets')}</p>
                        <div className="grid gap-3">
                          {artifact.assets.map((asset) => (
                            <div key={asset.id} className="dashboard-card-soft p-3">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium text-white">{asset.title}</p>
                                  <p className="text-xs uppercase tracking-wide text-zinc-500">{asset.type}</p>
                                </div>
                              </div>
                              <img
                                src={asset.url}
                                alt={asset.alt}
                                className="w-full rounded-lg border border-white/10 bg-black/20 object-cover"
                              />
                              <p className="mt-3 text-xs text-zinc-400">{asset.prompt}</p>
                              {asset.slides && asset.slides.length > 0 && (
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                  {asset.slides.map((slide, index) => (
                                    <div key={`${asset.id}-${index}`} className="overflow-hidden rounded-lg border border-white/10 bg-black/20">
                                      <img src={slide.imageUrl} alt={slide.title} className="w-full bg-black/20" />
                                      <div className="p-2">
                                        <p className="text-xs font-medium text-white">{slide.title}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="dashboard-card-soft p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('brief')}</p>
                      <p className="mt-2 text-sm text-zinc-300">
                        {stringifyValue(execution.inputs.brief) || t('briefEmpty')}
                      </p>
                    </div>

                    {artifact?.checklist && artifact.checklist.length > 0 && (
                      <div className="dashboard-card-soft p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('checklist')}</p>
                        <ul className="mt-2 space-y-2 text-sm text-zinc-300">
                          {artifact.checklist.map((item, index) => (
                            <li key={`${execution.id}-${index}`} className="flex gap-2">
                              <span className="text-emerald-400">-</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="dashboard-card px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

function getArtifact(execution: ExecutionRecord): Artifact | undefined {
  const artifact = execution.output?.artifact
  return artifact && typeof artifact === 'object' ? (artifact as Artifact) : undefined
}

function stringifyValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function formatArtifactForCopy(artifact: Artifact): string {
  return [artifact.title, artifact.content]
    .filter((value): value is string => !!value && value.trim().length > 0)
    .join('\n\n')
}

function getStatusClasses(status: ExecutionRecord['status']) {
  switch (status) {
    case 'completed':
      return 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
    case 'failed':
      return 'border border-red-500/20 bg-red-500/10 text-red-300'
    case 'active':
      return 'border border-sky-400/20 bg-sky-400/10 text-sky-300'
    case 'waiting_checkpoint':
      return 'border border-amber-400/20 bg-amber-400/10 text-amber-300'
    default:
      return 'border border-white/10 bg-white/[0.04] text-zinc-300'
  }
}

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleString(locale === 'pt-BR' ? 'pt-BR' : 'en-US', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}
