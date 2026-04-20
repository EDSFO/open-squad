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
      const headers = {
        Authorization: `Bearer ${token}`,
      }

      const [mineResponse, claimableResponse] = await Promise.all([
        fetch(`${BACKEND_URL}/squads/admin/mine`, { headers }),
        fetch(`${BACKEND_URL}/squads/admin/claimable`, { headers }),
      ])

      if (!mineResponse.ok || !claimableResponse.ok) {
        throw new Error(t('errors.load'))
      }

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

  const updateLocalization = (
    localeCode: 'pt-BR' | 'en-US',
    field: keyof SquadLocalization,
    value: string | number
  ) => {
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
      if (!response.ok) {
        throw new Error(data.error || t('errors.save'))
      }

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
      if (!response.ok) {
        throw new Error(data.error || t('errors.publish'))
      }

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
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || t('errors.claim'))
      }

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
          <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-slate-600">{t('subtitle')}</p>
        </div>

        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          {t('newSquad')}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,0.8fr)]">
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-slate-700" />
              <h2 className="text-lg font-semibold text-slate-900">{t('mySquads')}</h2>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : sortedSquads.length === 0 ? (
              <p className="text-sm text-slate-500">{t('empty')}</p>
            ) : (
              <div className="space-y-3">
                {sortedSquads.map((squad) => {
                  const primary = pickLocalization(squad.localizations, locale)

                  return (
                    <article key={squad.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-900">{primary?.name || squad.slug}</h3>
                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${squad.isPublished ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {squad.isPublished ? t('published') : t('draft')}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">{squad.slug}</p>
                          <p className="mt-2 text-sm text-slate-600">{primary?.description || t('missingLocalization')}</p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span className="rounded-full bg-slate-100 px-2 py-1">
                              {t('globalKnowledgeCount', { count: squad.globalKnowledgeCount })}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-1">
                              {formatPrice(primary?.price || 0, locale)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(squad)}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            {t('edit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePublishToggle(squad, !squad.isPublished)}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
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

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">{t('claimableTitle')}</h2>
            <p className="mt-1 text-sm text-slate-600">{t('claimableSubtitle')}</p>

            <div className="mt-4 space-y-3">
              {claimableSquads.length === 0 ? (
                <p className="text-sm text-slate-500">{t('claimableEmpty')}</p>
              ) : (
                claimableSquads.map((squad) => (
                  <article key={squad.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{squad.localization?.name || squad.slug}</h3>
                      <p className="mt-1 text-xs text-slate-500">{squad.slug}</p>
                      <p className="mt-2 text-sm text-slate-600">{squad.localization?.description || t('missingLocalization')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleClaim(squad.id)}
                      disabled={isClaimingId === squad.id}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {isClaimingId === squad.id ? t('claiming') : t('claim')}
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {editingId ? t('editTitle') : t('createTitle')}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{t('formDescription')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t('fields.slug')}</label>
              <input
                type="text"
                value={form.slug}
                onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {(['pt-BR', 'en-US'] as const).map((localeCode) => {
              const localizationForm = form.localizations.find((item) => item.locale === localeCode)!

              return (
                <div key={localeCode} className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">{localeCode}</p>
                  <div className="mt-3 space-y-3">
                    <input
                      type="text"
                      value={localizationForm.name}
                      placeholder={t('fields.name', { locale: localeCode })}
                      onChange={(event) => updateLocalization(localeCode, 'name', event.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <textarea
                      value={localizationForm.description}
                      rows={4}
                      placeholder={t('fields.description', { locale: localeCode })}
                      onChange={(event) => updateLocalization(localeCode, 'description', event.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      min={0}
                      value={localizationForm.price}
                      placeholder={t('fields.price')}
                      onChange={(event) => updateLocalization(localeCode, 'price', Number(event.target.value))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )
            })}

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(event) => setForm((current) => ({ ...current, isPublished: event.target.checked }))}
              />
              <div>
                <p className="text-sm font-medium text-slate-900">{t('fields.publishNow')}</p>
                <p className="text-sm text-slate-600">{t('fields.publishHelp')}</p>
              </div>
            </label>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
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

function pickLocalization(
  items: AuthorSquad['localizations'],
  locale: string
) {
  return items.find((item) => item.locale === locale) || items[0]
}

function formatPrice(priceInCents: number, locale: string) {
  return new Intl.NumberFormat(locale === 'pt-BR' ? 'pt-BR' : 'en-US', {
    style: 'currency',
    currency: locale === 'pt-BR' ? 'BRL' : 'USD',
  }).format(priceInCents / 100)
}
