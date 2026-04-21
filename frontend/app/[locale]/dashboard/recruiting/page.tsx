'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

interface InterviewRecord {
  id: string
  finalScore: number | null
  finalRecommendation: string | null
  analysis: Record<string, unknown> | null
  createdAt: string
}

interface CandidateRecord {
  id: string
  name: string
  email?: string | null
  source?: string | null
  resumeText: string
  notes?: string | null
  screeningScore?: number | null
  screeningStatus?: string | null
  screeningRecommendation?: string | null
  screeningAnalysis?: Record<string, unknown> | null
  interviews: InterviewRecord[]
}

interface JobRecord {
  id: string
  title: string
  companyName?: string | null
  seniority: string
  location?: string | null
  employmentType?: string | null
  salaryRange?: string | null
  requiredSkills: string
  niceToHaveSkills?: string | null
  description: string
  notes?: string | null
  candidates: CandidateRecord[]
}

const emptyJobForm = {
  title: '',
  companyName: '',
  seniority: '',
  location: '',
  employmentType: '',
  salaryRange: '',
  requiredSkills: '',
  niceToHaveSkills: '',
  description: '',
  notes: '',
}

const emptyCandidateForm = {
  name: '',
  email: '',
  source: '',
  resumeText: '',
  notes: '',
}

export default function RecruitingPage() {
  const t = useTranslations('recruiting')
  const [jobs, setJobs] = useState<JobRecord[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [jobForm, setJobForm] = useState(emptyJobForm)
  const [candidateForm, setCandidateForm] = useState(emptyCandidateForm)
  const [interviewTexts, setInterviewTexts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [savingJob, setSavingJob] = useState(false)
  const [savingCandidate, setSavingCandidate] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedJob = jobs.find((job) => job.id === selectedJobId) || null

  useEffect(() => {
    void fetchJobs()
  }, [])

  const fetchJobs = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${BACKEND_URL}/recruiting/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error('Failed to fetch recruiting jobs')

      const data = await response.json()
      setJobs(data.jobs || [])
      setSelectedJobId((current) => current || data.jobs?.[0]?.id || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateJob = async () => {
    setSavingJob(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${BACKEND_URL}/recruiting/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(jobForm),
      })

      if (!response.ok) throw new Error('Failed to create job')

      const data = await response.json()
      setJobForm(emptyJobForm)
      await fetchJobs()
      setSelectedJobId(data.job.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job')
    } finally {
      setSavingJob(false)
    }
  }

  const handleCreateCandidate = async () => {
    if (!selectedJobId) return

    setSavingCandidate(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${BACKEND_URL}/recruiting/jobs/${selectedJobId}/candidates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(candidateForm),
      })

      if (!response.ok) throw new Error('Failed to create candidate')

      setCandidateForm(emptyCandidateForm)
      await fetchJobs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create candidate')
    } finally {
      setSavingCandidate(false)
    }
  }

  const handleAnalyzeCandidate = async (candidateId: string) => {
    setActionId(candidateId)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${BACKEND_URL}/recruiting/candidates/${candidateId}/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error('Failed to analyze candidate')
      await fetchJobs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze candidate')
    } finally {
      setActionId(null)
    }
  }

  const handleCreateInterview = async (candidateId: string) => {
    const transcriptText = interviewTexts[candidateId]?.trim()
    if (!transcriptText) return

    setActionId(candidateId)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${BACKEND_URL}/recruiting/candidates/${candidateId}/interviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ transcriptText }),
      })

      if (!response.ok) throw new Error('Failed to analyze interview')

      setInterviewTexts((prev) => ({ ...prev, [candidateId]: '' }))
      await fetchJobs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze interview')
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="dashboard-title">{t('title')}</h1>
        <p className="dashboard-subtitle">{t('subtitle')}</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[360px,1fr]">
        <div className="space-y-6">
          <section className="dashboard-card">
            <h2 className="text-lg font-semibold text-white">{t('createJob')}</h2>
            <div className="mt-4 space-y-3">
              <Input label={t('fields.title')} value={jobForm.title} onChange={(value) => setJobForm((prev) => ({ ...prev, title: value }))} />
              <Input label={t('fields.companyName')} value={jobForm.companyName} onChange={(value) => setJobForm((prev) => ({ ...prev, companyName: value }))} />
              <Input label={t('fields.seniority')} value={jobForm.seniority} onChange={(value) => setJobForm((prev) => ({ ...prev, seniority: value }))} />
              <Input label={t('fields.location')} value={jobForm.location} onChange={(value) => setJobForm((prev) => ({ ...prev, location: value }))} />
              <Input label={t('fields.employmentType')} value={jobForm.employmentType} onChange={(value) => setJobForm((prev) => ({ ...prev, employmentType: value }))} />
              <Input label={t('fields.salaryRange')} value={jobForm.salaryRange} onChange={(value) => setJobForm((prev) => ({ ...prev, salaryRange: value }))} />
              <Textarea label={t('fields.requiredSkills')} value={jobForm.requiredSkills} onChange={(value) => setJobForm((prev) => ({ ...prev, requiredSkills: value }))} />
              <Textarea label={t('fields.niceToHaveSkills')} value={jobForm.niceToHaveSkills} onChange={(value) => setJobForm((prev) => ({ ...prev, niceToHaveSkills: value }))} />
              <Textarea label={t('fields.description')} value={jobForm.description} onChange={(value) => setJobForm((prev) => ({ ...prev, description: value }))} />
              <Textarea label={t('fields.notes')} value={jobForm.notes} onChange={(value) => setJobForm((prev) => ({ ...prev, notes: value }))} />
              <button
                type="button"
                onClick={handleCreateJob}
                disabled={savingJob}
                className="w-full rounded-full border border-[#ef233c] bg-[#ef233c] px-4 py-3 text-sm font-medium text-white hover:bg-[#d90429] disabled:opacity-50"
              >
                {savingJob ? t('creating') : t('actions.createJob')}
              </button>
            </div>
          </section>

          <section className="dashboard-card">
            <h2 className="text-lg font-semibold text-white">{t('jobs')}</h2>
            <div className="mt-4 space-y-3">
              {loading ? (
                <p className="text-sm text-zinc-500">{t('loading')}</p>
              ) : jobs.length === 0 ? (
                <p className="text-sm text-zinc-500">{t('emptyJobs')}</p>
              ) : (
                jobs.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => setSelectedJobId(job.id)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selectedJobId === job.id
                        ? 'border-[#ef233c]/30 bg-[#ef233c]/10'
                        : 'border-white/10 bg-black/20 hover:border-white/20'
                    }`}
                  >
                    <p className="font-medium text-white">{job.title}</p>
                    <p className="mt-1 text-sm text-zinc-400">{job.companyName || t('companyFallback')}</p>
                    <p className="mt-2 text-xs text-zinc-500">{job.candidates.length} {t('candidatesCount')}</p>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {selectedJob ? (
            <>
              <section className="dashboard-card">
                <h2 className="text-lg font-semibold text-white">{selectedJob.title}</h2>
                <p className="mt-1 text-sm text-zinc-400">{selectedJob.companyName || t('companyFallback')}</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <InfoCard label={t('fields.seniority')} value={selectedJob.seniority} />
                  <InfoCard label={t('fields.location')} value={selectedJob.location || '-'} />
                  <InfoCard label={t('fields.employmentType')} value={selectedJob.employmentType || '-'} />
                  <InfoCard label={t('fields.salaryRange')} value={selectedJob.salaryRange || '-'} />
                </div>
                <div className="mt-4 space-y-3 text-sm text-zinc-300">
                  <Block label={t('fields.requiredSkills')} value={selectedJob.requiredSkills} />
                  <Block label={t('fields.niceToHaveSkills')} value={selectedJob.niceToHaveSkills || '-'} />
                  <Block label={t('fields.description')} value={selectedJob.description} />
                  <Block label={t('fields.notes')} value={selectedJob.notes || '-'} />
                </div>
              </section>

              <section className="dashboard-card">
                <h2 className="text-lg font-semibold text-white">{t('addCandidate')}</h2>
                <div className="mt-4 space-y-3">
                  <Input label={t('fields.candidateName')} value={candidateForm.name} onChange={(value) => setCandidateForm((prev) => ({ ...prev, name: value }))} />
                  <Input label={t('fields.candidateEmail')} value={candidateForm.email} onChange={(value) => setCandidateForm((prev) => ({ ...prev, email: value }))} />
                  <Input label={t('fields.source')} value={candidateForm.source} onChange={(value) => setCandidateForm((prev) => ({ ...prev, source: value }))} />
                  <Textarea label={t('fields.resumeText')} value={candidateForm.resumeText} onChange={(value) => setCandidateForm((prev) => ({ ...prev, resumeText: value }))} rows={8} />
                  <Textarea label={t('fields.notes')} value={candidateForm.notes} onChange={(value) => setCandidateForm((prev) => ({ ...prev, notes: value }))} />
                  <button
                    type="button"
                    onClick={handleCreateCandidate}
                    disabled={savingCandidate}
                    className="w-full rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white hover:bg-white/[0.08] disabled:opacity-50"
                  >
                    {savingCandidate ? t('saving') : t('actions.addCandidate')}
                  </button>
                </div>
              </section>

              <section className="dashboard-card">
                <h2 className="text-lg font-semibold text-white">{t('candidates')}</h2>
                <div className="mt-4 space-y-4">
                  {selectedJob.candidates.length === 0 ? (
                    <p className="text-sm text-zinc-500">{t('emptyCandidates')}</p>
                  ) : (
                    selectedJob.candidates.map((candidate) => (
                      <div key={candidate.id} className="dashboard-card-soft p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="font-medium text-white">{candidate.name}</p>
                            <p className="text-sm text-zinc-500">{candidate.email || candidate.source || '-'}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAnalyzeCandidate(candidate.id)}
                            disabled={actionId === candidate.id}
                            className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-sm font-medium text-sky-300 hover:bg-sky-400/20 disabled:opacity-50"
                          >
                            {actionId === candidate.id ? t('analyzing') : t('actions.analyzeResume')}
                          </button>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <InfoCard label={t('screening.score')} value={candidate.screeningScore?.toString() || '-'} />
                          <InfoCard label={t('screening.status')} value={candidate.screeningStatus || '-'} />
                          <InfoCard label={t('screening.recommendation')} value={candidate.screeningRecommendation || '-'} />
                        </div>

                        {candidate.screeningAnalysis && (
                          <div className="mt-4 rounded-xl bg-black/20 p-4 text-sm text-zinc-300">
                            <Block label={t('screening.summary')} value={stringifyValue(candidate.screeningAnalysis.summary)} />
                            <Block label={t('screening.strengths')} value={stringifyValue(candidate.screeningAnalysis.strengths)} />
                            <Block label={t('screening.gaps')} value={stringifyValue(candidate.screeningAnalysis.gaps)} />
                            <Block label={t('screening.questions')} value={stringifyValue(candidate.screeningAnalysis.interviewQuestions)} />
                            <Block label={t('screening.rationale')} value={stringifyValue(candidate.screeningAnalysis.decisionRationale)} />
                          </div>
                        )}

                        <div className="mt-4 space-y-3">
                          <Textarea
                            label={t('fields.interviewTranscript')}
                            value={interviewTexts[candidate.id] || ''}
                            onChange={(value) => setInterviewTexts((prev) => ({ ...prev, [candidate.id]: value }))}
                            rows={6}
                          />
                          <button
                            type="button"
                            onClick={() => handleCreateInterview(candidate.id)}
                            disabled={actionId === candidate.id}
                            className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-400/20 disabled:opacity-50"
                          >
                            {actionId === candidate.id ? t('analyzing') : t('actions.analyzeInterview')}
                          </button>
                        </div>

                        {candidate.interviews.length > 0 && (
                          <div className="mt-4 space-y-3">
                            {candidate.interviews.map((interview) => (
                              <div key={interview.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                                <div className="grid gap-3 md:grid-cols-2">
                                  <InfoCard label={t('interview.score')} value={interview.finalScore?.toString() || '-'} />
                                  <InfoCard label={t('interview.recommendation')} value={interview.finalRecommendation || '-'} />
                                </div>
                                {interview.analysis && (
                                  <div className="mt-3 rounded-xl bg-black/20 p-4 text-sm text-zinc-300">
                                    <Block label={t('interview.summary')} value={stringifyValue(interview.analysis.summary)} />
                                    <Block label={t('interview.evidence')} value={stringifyValue(interview.analysis.evidence)} />
                                    <Block label={t('interview.concerns')} value={stringifyValue(interview.analysis.concerns)} />
                                    <Block label={t('interview.nextSteps')} value={stringifyValue(interview.analysis.nextSteps)} />
                                    <Block label={t('interview.rationale')} value={stringifyValue(interview.analysis.finalRationale)} />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          ) : (
            <div className="dashboard-card p-8 text-sm text-zinc-500">{t('emptySelection')}</div>
          )}
        </div>
      </div>
    </div>
  )
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="font-medium text-zinc-300">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="dashboard-input" />
    </label>
  )
}

function Textarea({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
}) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="font-medium text-zinc-300">{label}</span>
      <textarea value={value} rows={rows} onChange={(event) => onChange(event.target.value)} className="dashboard-input min-h-[120px]" />
    </label>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  )
}

function Block({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap">{value}</p>
    </div>
  )
}

function stringifyValue(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => `- ${String(item)}`).join('\n')
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') return JSON.stringify(value, null, 2)
  return value == null ? '-' : String(value)
}
