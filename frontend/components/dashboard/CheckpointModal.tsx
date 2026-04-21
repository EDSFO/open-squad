'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { AlertCircle, CheckCircle, X, XCircle } from 'lucide-react'

interface CheckpointData {
  id: string
  name: string
  description: string
}

interface CheckpointModalProps {
  checkpoint: CheckpointData
  onApprove: () => void
  onReject: () => void
  isLoading?: boolean
}

export function CheckpointModal({ checkpoint, onApprove, onReject, isLoading }: CheckpointModalProps) {
  const t = useTranslations('executor')
  const [show, setShow] = useState(true)

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-300" />
            <h2 className="text-lg font-semibold text-white">{t('checkpoint.title')}</h2>
          </div>
          <button
            onClick={() => setShow(false)}
            className="rounded-lg p-1 hover:bg-white/5"
            disabled={isLoading}
          >
            <X className="h-5 w-5 text-zinc-500" />
          </button>
        </div>

        <div className="mb-6">
          <h3 className="font-medium text-white">{checkpoint.name}</h3>
          <p className="mt-2 text-sm text-zinc-400">{checkpoint.description}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onApprove}
            disabled={isLoading}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-400/20 disabled:opacity-50"
          >
            <CheckCircle className="h-4 w-4" />
            {t('checkpoint.approve')}
          </button>
          <button
            onClick={onReject}
            disabled={isLoading}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-white/[0.08] disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            {t('checkpoint.reject')}
          </button>
        </div>
      </div>
    </div>
  )
}
