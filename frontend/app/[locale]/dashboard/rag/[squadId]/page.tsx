'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { KnowledgeManager } from '@/components/dashboard/KnowledgeManager'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

interface SquadDetail {
  id: string
  slug: string
  localization?: {
    name: string
    description: string
  } | null
}

export default function RagManagementPage() {
  const router = useRouter()
  const params = useParams()
  const squadId = params.squadId as string

  const [squad, setSquad] = useState<SquadDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSquad = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`${BACKEND_URL}/squads/${squadId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to load squad')
        }

        const data = await response.json()
        setSquad(data.squad)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load squad')
      }
    }

    void fetchSquad()
  }, [squadId])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="rounded-lg p-2 hover:bg-slate-100"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gerenciar RAG</h1>
          <p className="text-sm text-slate-600">{squad?.localization?.name || squadId}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <KnowledgeManager squadId={squadId} />
    </div>
  )
}
