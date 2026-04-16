'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { X, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

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

  const handleClose = () => setShow(false)

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-900">{t('checkpoint.title')}</h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 hover:bg-slate-100"
            disabled={isLoading}
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="mb-6">
          <h3 className="font-medium text-slate-900">{checkpoint.name}</h3>
          <p className="mt-2 text-sm text-slate-600">{checkpoint.description}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onApprove}
            disabled={isLoading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            <CheckCircle className="h-4 w-4" />
            {t('checkpoint.approve')}
          </button>
          <button
            onClick={onReject}
            disabled={isLoading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            {t('checkpoint.reject')}
          </button>
        </div>
      </div>
    </div>
  )
}