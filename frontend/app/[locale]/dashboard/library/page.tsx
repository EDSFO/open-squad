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

    fetchHistory()
  }, [])

  const normalizedQuery = query.trim().toLowerCase()
  const filteredExecutions = executions.filter((execution) => {
    if (statusFilter !== 'all' && execution.status !== statusFilter) {
      return false
    }

    if (!normalizedQuery) {
      return true
    }

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
    const textToCopy = artifact
      ? formatArtifactForCopy(artifact)
      : JSON.stringify(execution.output, null, 2)

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
          <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-slate-600">{t('subtitle')}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label={t('stats.total')} value={String(executions.length)} />
          <StatCard label={t('stats.completed')} value={String(completedCount)} />
          <StatCard label={t('stats.saved')} value={String(assetsCount)} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {(['all', 'completed', 'active', 'failed'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  statusFilter === filter
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )}

      {error && !isLoading && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!isLoading && !error && filteredExecutions.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <h2 className="text-lg font-semibold text-slate-900">{t('empty.title')}</h2>
          <p className="mt-2 text-sm text-slate-500">{t(query || statusFilter !== 'all' ? 'empty.filtered' : 'empty.default')}</p>
        </div>
      )}

      {!isLoading && !error && filteredExecutions.length > 0 && (
        <div className="space-y-4">
          {filteredExecutions.map((execution) => {
            const artifact = getArtifact(execution)
            const copied = copyFeedbackId === execution.id

            return (
              <article key={execution.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(execution.status)}`}>
                        {t(`status.${execution.status}`)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        {execution.squad.name}
                      </span>
                      <span className="text-xs text-slate-400">{formatDate(execution.completedAt || execution.createdAt, locale)}</span>
                    </div>

                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        {artifact?.title || execution.squad.name}
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        {artifact?.summary || stringifyValue(execution.inputs.brief) || execution.squad.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(execution)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Copy className="h-4 w-4" />
                      {copied ? t('copied') : t('copy')}
                    </button>

                    <Link
                      href={`/${locale}/dashboard/execute/${execution.squad.slug}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {t('openSquad')}
                    </Link>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
                  <div className="space-y-4">
                    <div className="rounded-lg bg-slate-50 p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {t('content')}
                      </p>
                      <pre className="whitespace-pre-wrap text-sm font-sans text-slate-800">
                        {artifact ? formatArtifactForCopy(artifact) : JSON.stringify(execution.output, null, 2)}
                      </pre>
                    </div>

                    {artifact?.assets && artifact.assets.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('assets')}</p>
                        <div className="grid gap-3">
                          {artifact.assets.map((asset) => (
                            <div key={asset.id} className="rounded-lg border border-slate-200 p-3">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium text-slate-900">{asset.title}</p>
                                  <p className="text-xs uppercase tracking-wide text-slate-500">{asset.type}</p>
                                </div>
                              </div>
                              <img
                                src={asset.url}
                                alt={asset.alt}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 object-cover"
                              />
                              <p className="mt-3 text-xs text-slate-600">{asset.prompt}</p>
                              {asset.slides && asset.slides.length > 0 && (
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                  {asset.slides.map((slide, index) => (
                                    <div key={`${asset.id}-${index}`} className="overflow-hidden rounded-lg border border-slate-200">
                                      <img src={slide.imageUrl} alt={slide.title} className="w-full bg-slate-50" />
                                      <div className="p-2">
                                        <p className="text-xs font-medium text-slate-900">{slide.title}</p>
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
                    <div className="rounded-lg border border-slate-200 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {t('brief')}
                      </p>
                      <p className="mt-2 text-sm text-slate-700">
                        {stringifyValue(execution.inputs.brief) || t('briefEmpty')}
                      </p>
                    </div>

                    {artifact?.checklist && artifact.checklist.length > 0 && (
                      <div className="rounded-lg border border-slate-200 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {t('checklist')}
                        </p>
                        <ul className="mt-2 space-y-2 text-sm text-slate-700">
                          {artifact.checklist.map((item, index) => (
                            <li key={`${execution.id}-${index}`} className="flex gap-2">
                              <span className="text-green-600">-</span>
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
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
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
      return 'bg-green-100 text-green-700'
    case 'failed':
      return 'bg-red-100 text-red-700'
    case 'active':
      return 'bg-blue-100 text-blue-700'
    case 'waiting_checkpoint':
      return 'bg-amber-100 text-amber-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleString(locale === 'pt-BR' ? 'pt-BR' : 'en-US', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}
