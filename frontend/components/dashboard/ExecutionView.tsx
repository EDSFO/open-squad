'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Play, Pause, CheckCircle, XCircle, AlertCircle, Copy } from 'lucide-react'
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
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch status')
        }

        const data = await response.json()
        setStatus(data)
        onStatusChange?.(data.status)

        if (['completed', 'failed'].includes(data.status)) {
          setIsPolling(false)
        }

        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    }

    fetchStatus()

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
        return <Pause className="h-5 w-5 text-slate-500" />
      case 'active':
        return <Play className="h-5 w-5 text-blue-500" />
      case 'waiting_checkpoint':
        return <AlertCircle className="h-5 w-5 text-amber-500" />
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return null
    }
  }

  const getStatusColor = () => {
    if (!status) return 'text-slate-500'

    switch (status.status) {
      case 'pending':
        return 'bg-slate-100 text-slate-600'
      case 'active':
        return 'bg-blue-100 text-blue-600'
      case 'waiting_checkpoint':
        return 'bg-amber-100 text-amber-600'
      case 'completed':
        return 'bg-green-100 text-green-600'
      case 'failed':
        return 'bg-red-100 text-red-600'
      default:
        return 'bg-slate-100 text-slate-600'
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
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">
            {t(`visualMode.badge.${visualMode}`)}
          </span>
        )}
      </div>

      {status && status.totalSteps > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-slate-600">
            <span>
              {t('step')} {status.currentStep} {t('of')} {status.totalSteps}
            </span>
            <span>{Math.round((status.currentStep / status.totalSteps) * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(status.currentStep / status.totalSteps) * 100}%` }}
            />
          </div>
          {phase && (
            <p className="text-sm text-slate-600">{phase}</p>
          )}
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
            } catch (err) {
              console.error('Failed to approve checkpoint:', err)
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
            } catch (err) {
              console.error('Failed to reject checkpoint:', err)
            } finally {
              setCheckpointLoading(false)
            }
          }}
          isLoading={checkpointLoading}
        />
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {hasArtifact && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-medium text-slate-900">{t('output')}</h3>
            <button
              type="button"
              onClick={handleCopyArtifact}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Copy className="h-4 w-4" />
              {isLinkedInPost ? t('copyLinkedIn') : t('copyOutput')}
            </button>
          </div>
          <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
            {copyFeedback && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                {copyFeedback}
              </div>
            )}

            {artifact?.title && <h4 className="text-lg font-semibold text-slate-900">{artifact.title}</h4>}
            {artifact?.summary && <p className="text-sm text-slate-600">{artifact.summary}</p>}

            {formattedArtifactContent && (
              <div className="rounded-lg bg-slate-50 p-4">
                <pre className="whitespace-pre-wrap text-sm font-sans text-slate-800">
                  {formattedArtifactContent}
                </pre>
              </div>
            )}

            {artifact?.assets && artifact.assets.length > 0 && (
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-slate-900">{t('assets')}</h5>
                <div className="grid gap-4 lg:grid-cols-2">
                  {artifact.assets.map((asset) => (
                    <div key={asset.id} className="space-y-3 rounded-lg border border-slate-200 p-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{asset.title}</p>
                        <p className="text-xs uppercase tracking-wide text-slate-500">{asset.type}</p>
                      </div>
                      <img
                        src={asset.url}
                        alt={asset.alt}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 object-cover"
                      />
                      <div className="rounded-md bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('assetPrompt')}</p>
                        <p className="mt-2 text-sm text-slate-700">{asset.prompt}</p>
                      </div>
                      {asset.slides && asset.slides.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('slides')}</p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {asset.slides.map((slide, index) => (
                              <div key={`${asset.id}-${index}`} className="overflow-hidden rounded-lg border border-slate-200">
                                <img src={slide.imageUrl} alt={slide.title} className="w-full bg-slate-50" />
                                <div className="p-3">
                                  <p className="text-sm font-medium text-slate-900">{slide.title}</p>
                                  <p className="mt-1 text-xs text-slate-600">{slide.body}</p>
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
                <h5 className="text-sm font-medium text-slate-900">Checklist</h5>
                <ul className="space-y-1 text-sm text-slate-700">
                  {artifact.checklist.map((item, index) => (
                    <li key={`${item}-${index}`} className="flex gap-2">
                      <span className="text-green-600">-</span>
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
          <h3 className="font-medium text-slate-900">{t('output')}</h3>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <pre className="whitespace-pre-wrap text-sm text-slate-700">
              {JSON.stringify(fallbackOutput, null, 2)}
            </pre>
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

  if (!isLinkedInPost) {
    return [title, content].filter(Boolean).join('\n\n')
  }

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
