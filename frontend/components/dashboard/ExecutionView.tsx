'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AlertCircle, CheckCircle, Copy, Pause, Play, XCircle } from 'lucide-react'
import { CheckpointModal } from './CheckpointModal'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

interface Checkpoint {
  id: string
  name: string
  description: string
}

interface ExecutionStatus {
  id: string
  status: 'pending' | 'active' | 'waiting_checkpoint' | 'completed' | 'failed'
  currentStep: number
  totalSteps: number
  checkpoint?: Checkpoint
  output: Record<string, unknown>
  startedAt: string | null
  completedAt: string | null
}

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

interface ExecutionViewProps {
  jobId: string
  onStatusChange?: (status: string) => void
}

export function ExecutionView({ jobId, onStatusChange }: ExecutionViewProps) {
  const t = useTranslations('executor')
  const [status, setStatus] = useState<ExecutionStatus | null>(null)
  const [isPolling, setIsPolling] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkpointLoading, setCheckpointLoading] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (!jobId) return

    const fetchStatus = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`${BACKEND_URL}/executor/status/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) throw new Error('Failed to fetch status')

        const data = await response.json()
        setStatus(data)
        onStatusChange?.(data.status)

        if (['completed', 'failed'].includes(data.status)) setIsPolling(false)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    }

    void fetchStatus()

    if (isPolling) {
      const interval = setInterval(fetchStatus, 3000)
      return () => clearInterval(interval)
    }
  }, [jobId, isPolling, onStatusChange])

  const artifact = (status?.output?.artifact as Artifact | undefined) ?? undefined
  const squadName = typeof status?.output?.squadName === 'string' ? status.output.squadName : ''
  const phase = typeof status?.output?.phase === 'string' ? status.output.phase : ''
  const visualMode = typeof status?.output?.visualMode === 'string' ? status.output.visualMode : ''
  const isLinkedInPost = squadName === 'linkedin-posts' || squadName === 'Posts LinkedIn'
  const hasArtifact = !!artifact?.content
  const fallbackOutput = status?.output
    ? Object.fromEntries(
        Object.entries(status.output).filter(([key]) => !['step1', 'step2', 'step3', 'step4', 'step5', 'receivedInputs', 'artifact', 'squadName'].includes(key))
      )
    : {}
  const formattedArtifactContent = formatArtifactForPublishing(artifact, isLinkedInPost)

  const handleCopyArtifact = async () => {
    if (!formattedArtifactContent) return

    try {
      await navigator.clipboard.writeText(formattedArtifactContent)
      setCopyFeedback(t('copySuccess'))
      window.setTimeout(() => setCopyFeedback(null), 2500)
    } catch (err) {
      console.error('Failed to copy artifact:', err)
      setCopyFeedback(t('copyError'))
      window.setTimeout(() => setCopyFeedback(null), 2500)
    }
  }

  const getStatusIcon = () => {
    if (!status) return null

    switch (status.status) {
      case 'pending':
        return <Pause className="h-5 w-5 text-zinc-500" />
      case 'active':
        return <Play className="h-5 w-5 text-sky-300" />
      case 'waiting_checkpoint':
        return <AlertCircle className="h-5 w-5 text-amber-300" />
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-emerald-300" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-300" />
      default:
        return null
    }
  }

  const getStatusColor = () => {
    if (!status) return 'border border-white/10 bg-white/[0.04] text-zinc-300'

    switch (status.status) {
      case 'pending':
        return 'border border-white/10 bg-white/[0.04] text-zinc-300'
      case 'active':
        return 'border border-sky-400/20 bg-sky-400/10 text-sky-300'
      case 'waiting_checkpoint':
        return 'border border-amber-400/20 bg-amber-400/10 text-amber-300'
      case 'completed':
        return 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
      case 'failed':
        return 'border border-red-500/20 bg-red-500/10 text-red-300'
      default:
        return 'border border-white/10 bg-white/[0.04] text-zinc-300'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusColor()}`}>
          {status ? t(`status.${status.status}`) : 'Loading...'}
        </span>
        {visualMode && (
          <span className="dashboard-chip uppercase">{t(`visualMode.badge.${visualMode}`)}</span>
        )}
      </div>

      {status && status.totalSteps > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-zinc-400">
            <span>{t('step')} {status.currentStep} {t('of')} {status.totalSteps}</span>
            <span>{Math.round((status.currentStep / status.totalSteps) * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
            <div
              className="h-full bg-[#ef233c] transition-all duration-300"
              style={{ width: `${(status.currentStep / status.totalSteps) * 100}%` }}
            />
          </div>
          {phase && <p className="text-sm text-zinc-500">{phase}</p>}
        </div>
      )}

      {status?.status === 'waiting_checkpoint' && status.checkpoint && (
        <CheckpointModal
          checkpoint={status.checkpoint}
          onApprove={async () => {
            setCheckpointLoading(true)
            try {
              const token = localStorage.getItem('token')
              await fetch(`${BACKEND_URL}/executor/checkpoint/${jobId}/approve`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: '{}',
              })
              setStatus((prev) => (prev ? { ...prev, status: 'active' } : prev))
            } finally {
              setCheckpointLoading(false)
            }
          }}
          onReject={async () => {
            setCheckpointLoading(true)
            try {
              const token = localStorage.getItem('token')
              await fetch(`${BACKEND_URL}/executor/checkpoint/${jobId}/reject`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: '{}',
              })
              setStatus((prev) => (prev ? { ...prev, status: 'failed' } : prev))
            } finally {
              setCheckpointLoading(false)
            }
          }}
          isLoading={checkpointLoading}
        />
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {hasArtifact && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-medium text-white">{t('output')}</h3>
            <button
              type="button"
              onClick={handleCopyArtifact}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              <Copy className="h-4 w-4" />
              {isLinkedInPost ? t('copyLinkedIn') : t('copyOutput')}
            </button>
          </div>

          <div className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-5">
            {copyFeedback && (
              <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">
                {copyFeedback}
              </div>
            )}

            {artifact?.title && <h4 className="text-lg font-semibold text-white">{artifact.title}</h4>}
            {artifact?.summary && <p className="text-sm text-zinc-400">{artifact.summary}</p>}

            {formattedArtifactContent && (
              <div className="rounded-xl bg-zinc-950/80 p-4">
                <pre className="whitespace-pre-wrap text-sm font-sans text-zinc-200">{formattedArtifactContent}</pre>
              </div>
            )}

            {artifact?.assets && artifact.assets.length > 0 && (
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-white">{t('assets')}</h5>
                <div className="grid gap-4 lg:grid-cols-2">
                  {artifact.assets.map((asset) => (
                    <div key={asset.id} className="space-y-3 rounded-xl border border-white/10 bg-zinc-950/60 p-4">
                      <div>
                        <p className="text-sm font-semibold text-white">{asset.title}</p>
                        <p className="text-xs uppercase tracking-wide text-zinc-500">{asset.type}</p>
                      </div>
                      <img src={asset.url} alt={asset.alt} className="w-full rounded-lg border border-white/10 bg-black/20 object-cover" />
                      <div className="rounded-md bg-black/20 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('assetPrompt')}</p>
                        <p className="mt-2 text-sm text-zinc-300">{asset.prompt}</p>
                      </div>
                      {asset.slides && asset.slides.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('slides')}</p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {asset.slides.map((slide, index) => (
                              <div key={`${asset.id}-${index}`} className="overflow-hidden rounded-lg border border-white/10 bg-black/20">
                                <img src={slide.imageUrl} alt={slide.title} className="w-full bg-black/20" />
                                <div className="p-3">
                                  <p className="text-sm font-medium text-white">{slide.title}</p>
                                  <p className="mt-1 text-xs text-zinc-400">{slide.body}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {artifact?.checklist && artifact.checklist.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-white">Checklist</h5>
                <ul className="space-y-1 text-sm text-zinc-300">
                  {artifact.checklist.map((item, index) => (
                    <li key={`${item}-${index}`} className="flex gap-2">
                      <span className="text-emerald-400">-</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {!hasArtifact && status?.output && Object.keys(fallbackOutput).length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-white">{t('output')}</h3>
          <div className="rounded-xl border border-white/10 bg-zinc-950/80 p-4">
            <pre className="whitespace-pre-wrap text-sm text-zinc-300">{JSON.stringify(fallbackOutput, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  )
}

function formatArtifactForPublishing(artifact: Artifact | undefined, isLinkedInPost: boolean): string {
  if (!artifact) return ''

  const title = artifact.title?.trim() ?? ''
  const content = artifact.content?.trim() ?? ''

  if (!isLinkedInPost) return [title, content].filter(Boolean).join('\n\n')
  return [title, normalizeLinkedInContent(content)].filter(Boolean).join('\n\n')
}

function normalizeLinkedInContent(content: string): string {
  return content
    .replace(/\\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^[ \t]*[-*][ \t]+/gm, '- ')
    .trim()
}
