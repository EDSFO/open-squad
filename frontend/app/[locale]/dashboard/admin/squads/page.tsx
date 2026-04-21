'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Loader2, Plus, Rocket, Save, Sparkles } from 'lucide-react'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

interface SquadLocalization {
  locale: 'pt-BR' | 'en-US'
  name: string
  description: string
  price: number
}

interface AuthorSquad {
  id: string
  slug: string
  isPublished: boolean
  creatorUserId?: string | null
  globalKnowledgeCount: number
  localizations: Array<{
    locale: 'pt-BR' | 'en-US'
    name: string
    description: string
    price: number
  }>
}

interface ClaimableSquad {
  id: string
  slug: string
  isPublished: boolean
  localization?: {
    name: string
    description: string
    price: number
  } | null
}

const emptyForm = {
  id: '',
  slug: '',
  isPublished: false,
  localizations: [
    { locale: 'pt-BR' as const, name: '', description: '', price: 0 },
    { locale: 'en-US' as const, name: '', description: '', price: 0 },
  ],
}

export default function AdminSquadsPage() {
  const t = useTranslations('authorStudio')
  const locale = useLocale()

  const [squads, setSquads] = useState<AuthorSquad[]>([])
  const [claimableSquads, setClaimableSquads] = useState<ClaimableSquad[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isClaimingId, setIsClaimingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const sortedSquads = useMemo(
    () => [...squads].sort((a, b) => Number(b.isPublished) - Number(a.isPublished)),
    [squads]
  )

  useEffect(() => {
    void fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }

      const [mineResponse, claimableResponse] = await Promise.all([
        fetch(`${BACKEND_URL}/squads/admin/mine`, { headers }),
        fetch(`${BACKEND_URL}/squads/admin/claimable`, { headers }),
      ])

      if (!mineResponse.ok || !claimableResponse.ok) throw new Error(t('errors.load'))

      const mineData = await mineResponse.json()
      const claimableData = await claimableResponse.json()
      setSquads(mineData.squads || [])
      setClaimableSquads(claimableData.squads || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.load'))
    } finally {
      setIsLoading(false)
    }
  }

  const updateLocalization = (localeCode: 'pt-BR' | 'en-US', field: keyof SquadLocalization, value: string | number) => {
    setForm((current) => ({
      ...current,
      localizations: current.localizations.map((item) =>
        item.locale === localeCode ? { ...item, [field]: value } : item
      ),
    }))
  }

  const startCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
  }

  const startEdit = (squad: AuthorSquad) => {
    setEditingId(squad.id)
    setForm({
      id: squad.id,
      slug: squad.slug,
      isPublished: squad.isPublished,
      localizations: [
        fillLocalization('pt-BR', squad.localizations),
        fillLocalization('en-US', squad.localizations),
      ],
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        editingId ? `${BACKEND_URL}/squads/admin/${editingId}` : `${BACKEND_URL}/squads/admin`,
        {
          method: editingId ? 'PUT' : 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            slug: form.slug.trim(),
            isPublished: form.isPublished,
            localizations: form.localizations.map((item) => ({
              ...item,
              price: Number(item.price) || 0,
            })),
          }),
        }
      )

      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || t('errors.save'))

      startCreate()
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.save'))
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublishToggle = async (squad: AuthorSquad, isPublished: boolean) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${BACKEND_URL}/squads/admin/${squad.id}/publish`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPublished }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || t('errors.publish'))

      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.publish'))
    }
  }

  const handleClaim = async (squadId: string) => {
    setIsClaimingId(squadId)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${BACKEND_URL}/squads/admin/${squadId}/claim`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || t('errors.claim'))

      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.claim'))
    } finally {
      setIsClaimingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="dashboard-title">{t('title')}</h1>
          <p className="dashboard-subtitle">{t('subtitle')}</p>
        </div>

        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-2 rounded-full border border-[#ef233c] bg-[#ef233c] px-4 py-2 text-sm font-medium text-white hover:bg-[#d90429]"
        >
          <Plus className="h-4 w-4" />
          {t('newSquad')}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,0.8fr)]">
        <div className="space-y-4">
          <section className="dashboard-card">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#ff758f]" />
              <h2 className="text-lg font-semibold text-white">{t('mySquads')}</h2>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#ef233c]" />
              </div>
            ) : sortedSquads.length === 0 ? (
              <p className="text-sm text-zinc-500">{t('empty')}</p>
            ) : (
              <div className="space-y-3">
                {sortedSquads.map((squad) => {
                  const primary = pickLocalization(squad.localizations, locale)

                  return (
                    <article key={squad.id} className="dashboard-card-soft p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-white">{primary?.name || squad.slug}</h3>
                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${squad.isPublished ? 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border border-amber-400/20 bg-amber-400/10 text-amber-300'}`}>
                              {squad.isPublished ? t('published') : t('draft')}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-zinc-500">{squad.slug}</p>
                          <p className="mt-2 text-sm text-zinc-400">{primary?.description || t('missingLocalization')}</p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
                            <span className="dashboard-chip">
                              {t('globalKnowledgeCount', { count: squad.globalKnowledgeCount })}
                            </span>
                            <span className="dashboard-chip">
                              {formatPrice(primary?.price || 0, locale)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(squad)}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-white/[0.08]"
                          >
                            {t('edit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePublishToggle(squad, !squad.isPublished)}
                            className="inline-flex items-center gap-2 rounded-full border border-[#ef233c] bg-[#ef233c] px-3 py-2 text-sm font-medium text-white hover:bg-[#d90429]"
                          >
                            <Rocket className="h-4 w-4" />
                            {squad.isPublished ? t('unpublish') : t('publish')}
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          <section className="dashboard-card">
            <h2 className="text-lg font-semibold text-white">{t('claimableTitle')}</h2>
            <p className="mt-1 text-sm text-zinc-400">{t('claimableSubtitle')}</p>

            <div className="mt-4 space-y-3">
              {claimableSquads.length === 0 ? (
                <p className="text-sm text-zinc-500">{t('claimableEmpty')}</p>
              ) : (
                claimableSquads.map((squad) => (
                  <article key={squad.id} className="dashboard-card-soft flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{squad.localization?.name || squad.slug}</h3>
                      <p className="mt-1 text-xs text-zinc-500">{squad.slug}</p>
                      <p className="mt-2 text-sm text-zinc-400">{squad.localization?.description || t('missingLocalization')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleClaim(squad.id)}
                      disabled={isClaimingId === squad.id}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-white/[0.08] disabled:opacity-50"
                    >
                      {isClaimingId === squad.id ? t('claiming') : t('claim')}
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="dashboard-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">{editingId ? t('editTitle') : t('createTitle')}</h2>
              <p className="mt-1 text-sm text-zinc-400">{t('formDescription')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">{t('fields.slug')}</label>
              <input
                type="text"
                value={form.slug}
                onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                className="dashboard-input"
              />
            </div>

            {(['pt-BR', 'en-US'] as const).map((localeCode) => {
              const localizationForm = form.localizations.find((item) => item.locale === localeCode)!

              return (
                <div key={localeCode} className="dashboard-card-soft p-4">
                  <p className="text-sm font-semibold text-white">{localeCode}</p>
                  <div className="mt-3 space-y-3">
                    <input
                      type="text"
                      value={localizationForm.name}
                      placeholder={t('fields.name', { locale: localeCode })}
                      onChange={(event) => updateLocalization(localeCode, 'name', event.target.value)}
                      className="dashboard-input"
                    />
                    <textarea
                      value={localizationForm.description}
                      rows={4}
                      placeholder={t('fields.description', { locale: localeCode })}
                      onChange={(event) => updateLocalization(localeCode, 'description', event.target.value)}
                      className="dashboard-input min-h-[120px]"
                    />
                    <input
                      type="number"
                      min={0}
                      value={localizationForm.price}
                      placeholder={t('fields.price')}
                      onChange={(event) => updateLocalization(localeCode, 'price', Number(event.target.value))}
                      className="dashboard-input"
                    />
                  </div>
                </div>
              )
            })}

            <label className="dashboard-card-soft flex items-center gap-3 p-4">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(event) => setForm((current) => ({ ...current, isPublished: event.target.checked }))}
              />
              <div>
                <p className="text-sm font-medium text-white">{t('fields.publishNow')}</p>
                <p className="text-sm text-zinc-400">{t('fields.publishHelp')}</p>
              </div>
            </label>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#ef233c] bg-[#ef233c] px-4 py-3 text-sm font-medium text-white hover:bg-[#d90429] disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSaving ? t('saving') : editingId ? t('saveChanges') : t('create')}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

function fillLocalization(locale: 'pt-BR' | 'en-US', items: AuthorSquad['localizations']): SquadLocalization {
  const existing = items.find((item) => item.locale === locale)
  return {
    locale,
    name: existing?.name || '',
    description: existing?.description || '',
    price: existing?.price || 0,
  }
}

function pickLocalization(items: AuthorSquad['localizations'], locale: string) {
  return items.find((item) => item.locale === locale) || items[0]
}

function formatPrice(priceInCents: number, locale: string) {
  return new Intl.NumberFormat(locale === 'pt-BR' ? 'pt-BR' : 'en-US', {
    style: 'currency',
    currency: locale === 'pt-BR' ? 'BRL' : 'USD',
  }).format(priceInCents / 100)
}
