'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Play } from 'lucide-react'
import { ExecutionView } from '@/components/dashboard/ExecutionView'
import { KnowledgeManager } from '@/components/dashboard/KnowledgeManager'
import RecruitingPage from '@/app/[locale]/dashboard/recruiting/page'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
type VisualMode = 'economic' | 'balanced' | 'premium'

interface Squad {
  id: string
  slug: string
  name: string
  description: string
  pipelineConfig?: {
    inputs: Array<{
      name: string
      label: string
      type: string
      required: boolean
    }>
  }
}

interface SquadInputConfig {
  name: string
  label: string
  type: string
  required: boolean
}

export default function ExecuteSquadPage() {
  const t = useTranslations('executor')
  const router = useRouter()
  const params = useParams()
  const squadId = params.squadId as string

  const [squad, setSquad] = useState<Squad | null>(null)
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isStarting, setIsStarting] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [visualMode, setVisualMode] = useState<VisualMode>('balanced')

  const hasMissingRequiredInputs = squad?.pipelineConfig?.inputs?.some(
    (i) => i.required && !inputs[i.name]
  ) ?? false

  useEffect(() => {
    // Fetch squad details
    const fetchSquad = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`${BACKEND_URL}/squads/${squadId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          const squadData = data.squad
          setSquad({
            id: squadData.id,
            slug: squadData.slug,
            name: squadData.localization?.name || squadData.slug,
            description: squadData.localization?.description || '',
            pipelineConfig: {
              inputs: getSquadInputConfig(squadData.slug),
            },
          })

          // Initialize inputs from pipeline config
          if (squadData) {
            const initialInputs: Record<string, string> = {}
            getSquadInputConfig(squadData.slug).forEach((input) => {
              initialInputs[input.name] = ''
            })
            setInputs(initialInputs)
          }
        } else {
          setError('Failed to load squad')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSquad()
  }, [squadId])

  const handleInputChange = (name: string, value: string) => {
    setInputs((prev) => ({ ...prev, [name]: value }))
  }

  const handleStartExecution = async () => {
    setIsStarting(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${BACKEND_URL}/executor/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          squadId,
          inputs: {
            ...inputs,
            visualMode,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to start execution')
      }

      const data = await response.json()
      setJobId(data.jobId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start execution')
    } finally {
      setIsStarting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (error && !squad) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-sm text-blue-600 hover:underline"
        >
          Go back
        </button>
      </div>
    )
  }

  if (squad?.slug === 'recruiting-screening') {
    return <RecruitingPage />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="rounded-lg p-2 hover:bg-slate-100"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
          <p className="text-sm text-slate-600">{squad?.name || squadId}</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Execution View (if running) */}
      {jobId && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <ExecutionView jobId={jobId} />
        </div>
      )}

      {/* Input Form (if not running) */}
      {!jobId && squad && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{t('inputs.title')}</h2>
              <p className="mt-1 text-sm text-slate-600">{t('inputs.description')}</p>
            </div>

            {/* Dynamic inputs based on squad pipeline config */}
            {(squad.pipelineConfig?.inputs?.length ?? 0) > 0 ? (
              <div className="space-y-4">
                {squad.pipelineConfig?.inputs?.map((input) => (
                  <div key={input.name} className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">
                      {input.label}
                      {input.required && <span className="text-red-500"> *</span>}
                    </label>
                    {input.type === 'textarea' ? (
                      <textarea
                        value={inputs[input.name] || ''}
                        onChange={(e) => handleInputChange(input.name, e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        rows={4}
                      />
                    ) : (
                      <input
                        type="text"
                        value={inputs[input.name] || ''}
                        onChange={(e) => handleInputChange(input.name, e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    )}
                  </div>
                ))}
                <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{t('visualMode.label')}</p>
                    <p className="mt-1 text-sm text-slate-600">{t('visualMode.description')}</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {(['economic', 'balanced', 'premium'] as VisualMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setVisualMode(mode)}
                        className={`rounded-xl border p-4 text-left transition ${
                          visualMode === mode
                            ? 'border-blue-600 bg-blue-50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-900">{t(`visualMode.options.${mode}.title`)}</p>
                        <p className="mt-2 text-sm text-slate-600">{t(`visualMode.options.${mode}.description`)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No inputs required for this squad.</p>
            )}

            <KnowledgeManager squadId={squadId} />

            <button
              onClick={handleStartExecution}
              disabled={isStarting || hasMissingRequiredInputs}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              {isStarting ? t('starting') : t('start')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function getSquadInputConfig(slug: string): SquadInputConfig[] {
  if (slug === 'recruiting-screening') {
    return [
      { name: 'jobTitle', label: 'Cargo / vaga', type: 'text', required: true },
      { name: 'companyName', label: 'Empresa', type: 'text', required: false },
      { name: 'seniority', label: 'Senioridade', type: 'text', required: true },
      { name: 'location', label: 'Localização', type: 'text', required: false },
      { name: 'employmentType', label: 'Tipo de contratação', type: 'text', required: false },
      { name: 'salaryRange', label: 'Faixa salarial', type: 'text', required: false },
      { name: 'requiredSkills', label: 'Competências obrigatórias', type: 'textarea', required: true },
      { name: 'niceToHaveSkills', label: 'Competências desejáveis', type: 'textarea', required: false },
      { name: 'jobDescription', label: 'Descrição da vaga', type: 'textarea', required: true },
      { name: 'candidateResume', label: 'Currículo do candidato', type: 'textarea', required: true },
      { name: 'recruiterNotes', label: 'Observações do recrutador', type: 'textarea', required: false },
    ]
  }

  return [
    {
      name: 'brief',
      label: 'Brief',
      type: 'textarea',
      required: true,
    },
  ]
}
