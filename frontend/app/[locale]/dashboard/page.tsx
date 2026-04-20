'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const locale = useLocale()
  const [stats, setStats] = useState({
    activeSquads: 0,
    executions: 0,
    plan: 'STARTER',
  })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token')
        const headers = {
          Authorization: `Bearer ${token}`,
        }

        const [userResponse, squadsResponse, historyResponse] = await Promise.all([
          fetch(`${BACKEND_URL}/user/me`, { headers }),
          fetch(`${BACKEND_URL}/squads/mine`, { headers }),
          fetch(`${BACKEND_URL}/executor/history?limit=100`, { headers }),
        ])

        if (!userResponse.ok || !squadsResponse.ok || !historyResponse.ok) {
          return
        }

        const [userData, squadsData, historyData] = await Promise.all([
          userResponse.json(),
          squadsResponse.json(),
          historyResponse.json(),
        ])

        setStats({
          activeSquads: (squadsData.squads || []).length,
          executions: Array.isArray(historyData.executions) ? historyData.executions.length : 0,
          plan: userData.user?.plan || 'STARTER',
        })
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
      }
    }

    void fetchStats()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('welcome')}</h1>
        <p className="mt-1 text-sm text-slate-600">{t('subtitle')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-medium text-slate-500">Squads Ativos</h3>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.activeSquads}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-medium text-slate-500">Execuções</h3>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.executions}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-medium text-slate-500">Plano</h3>
          <p className="mt-2 text-3xl font-bold text-slate-900">{formatPlan(stats.plan, locale)}</p>
        </div>
      </div>
    </div>
  )
}

function formatPlan(plan: string, locale: string) {
  const labels: Record<string, { 'pt-BR': string; 'en-US': string }> = {
    STARTER: { 'pt-BR': 'Starter', 'en-US': 'Starter' },
    GROWTH: { 'pt-BR': 'Growth', 'en-US': 'Growth' },
    SCALE: { 'pt-BR': 'Scale', 'en-US': 'Scale' },
    ENTERPRISE: { 'pt-BR': 'Enterprise', 'en-US': 'Enterprise' },
  }

  return labels[plan]?.[locale === 'pt-BR' ? 'pt-BR' : 'en-US'] || plan
}
