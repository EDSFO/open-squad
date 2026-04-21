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
        <h1 className="dashboard-title">{t('welcome')}</h1>
        <p className="dashboard-subtitle">{t('subtitle')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <StatCard label="Squads ativos" value={String(stats.activeSquads)} />
        <StatCard label="Execucoes" value={String(stats.executions)} />
        <StatCard label="Plano" value={formatPlan(stats.plan, locale)} />
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="dashboard-card">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">{label}</p>
      <p className="mt-3 text-4xl font-semibold text-white">{value}</p>
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
