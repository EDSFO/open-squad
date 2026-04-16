'use client'

import { useTranslations } from 'next-intl'

export default function DashboardPage() {
  const t = useTranslations('dashboard')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('welcome')}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {t('subtitle')}
        </p>
      </div>

      {/* Quick stats or overview could go here */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-medium text-slate-500">Squads Ativos</h3>
          <p className="mt-2 text-3xl font-bold text-slate-900">0</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-medium text-slate-500">Execuções</h3>
          <p className="mt-2 text-3xl font-bold text-slate-900">0</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-medium text-slate-500">Plano</h3>
          <p className="mt-2 text-3xl font-bold text-slate-900">Starter</p>
        </div>
      </div>
    </div>
  )
}
