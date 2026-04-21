'use client'

import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { BookOpen, Database, FileUp, Plus, Trash2 } from 'lucide-react'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

interface KnowledgeEntry {
  id: string
  scope: 'GLOBAL' | 'PRIVATE'
  title: string
  content: string
  source: string | null
  tags: string[]
  updatedAt: string
}

interface KnowledgeAccess {
  canManageGlobal: boolean
  canManagePrivate: boolean
  hasPrivateAccess: boolean
}

interface KnowledgeManagerProps {
  squadId: string
  className?: string
}

export function KnowledgeManager({ squadId, className }: KnowledgeManagerProps) {
  const t = useTranslations('executor')

  const [error, setError] = useState<string | null>(null)
  const [knowledgeAccess, setKnowledgeAccess] = useState<KnowledgeAccess | null>(null)
  const [globalKnowledge, setGlobalKnowledge] = useState<KnowledgeEntry[]>([])
  const [privateKnowledge, setPrivateKnowledge] = useState<KnowledgeEntry[]>([])
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(true)
  const [isSavingKnowledge, setIsSavingKnowledge] = useState(false)
  const [isUploadingKnowledge, setIsUploadingKnowledge] = useState(false)
  const [deletingKnowledgeId, setDeletingKnowledgeId] = useState<string | null>(null)
  const [knowledgeScope, setKnowledgeScope] = useState<'GLOBAL' | 'PRIVATE'>('PRIVATE')
  const [knowledgeTitle, setKnowledgeTitle] = useState('')
  const [knowledgeContent, setKnowledgeContent] = useState('')
  const [knowledgeSource, setKnowledgeSource] = useState('')
  const [knowledgeTags, setKnowledgeTags] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)

  const acceptedFileTypes = useMemo(
    () => '.pdf,.doc,.docx,.txt,.md,.markdown,.csv,.tsv,.json,.html,.htm,.xml,.rtf',
    []
  )

  useEffect(() => {
    void fetchKnowledge()
  }, [squadId])

  const fetchKnowledge = async () => {
    setIsLoadingKnowledge(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${BACKEND_URL}/squads/${squadId}/knowledge`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to load knowledge')
      }

      const data = await response.json()
      setGlobalKnowledge(data.globalEntries || [])
      setPrivateKnowledge(data.privateEntries || [])
      setKnowledgeAccess(data.access || null)

      if (data.access?.canManagePrivate) setKnowledgeScope('PRIVATE')
      else if (data.access?.canManageGlobal) setKnowledgeScope('GLOBAL')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load knowledge')
    } finally {
      setIsLoadingKnowledge(false)
    }
  }

  const resetKnowledgeForm = () => {
    setKnowledgeTitle('')
    setKnowledgeContent('')
    setKnowledgeSource('')
    setKnowledgeTags('')
    setSelectedFile(null)
    setFileInputKey((current) => current + 1)
    setKnowledgeScope(knowledgeAccess?.canManagePrivate ? 'PRIVATE' : 'GLOBAL')
  }

  const handleCreateKnowledge = async () => {
    if (!knowledgeTitle.trim() || !knowledgeContent.trim()) {
      setError(t('knowledge.validation'))
      return
    }

    setIsSavingKnowledge(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${BACKEND_URL}/squads/${squadId}/knowledge`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scope: knowledgeScope,
          title: knowledgeTitle.trim(),
          content: knowledgeContent.trim(),
          source: knowledgeSource.trim() || undefined,
          tags: knowledgeTags.split(',').map((tag) => tag.trim()).filter(Boolean),
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Failed to save knowledge')

      resetKnowledgeForm()
      await fetchKnowledge()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save knowledge')
    } finally {
      setIsSavingKnowledge(false)
    }
  }

  const handleDeleteKnowledge = async (entry: KnowledgeEntry) => {
    setDeletingKnowledgeId(entry.id)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${BACKEND_URL}/squads/${squadId}/knowledge/${entry.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Failed to delete knowledge')

      await fetchKnowledge()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete knowledge')
    } finally {
      setDeletingKnowledgeId(null)
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(event.target.files?.[0] || null)
  }

  const handleUploadKnowledge = async () => {
    if (!selectedFile) {
      setError(t('knowledge.upload.validation'))
      return
    }

    setIsUploadingKnowledge(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('scope', knowledgeScope)
      formData.append('file', selectedFile)

      if (knowledgeTitle.trim()) formData.append('title', knowledgeTitle.trim())
      if (knowledgeSource.trim()) formData.append('source', knowledgeSource.trim())
      if (knowledgeTags.trim()) formData.append('tags', knowledgeTags)

      const response = await fetch(`${BACKEND_URL}/squads/${squadId}/knowledge/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Failed to upload knowledge file')

      resetKnowledgeForm()
      await fetchKnowledge()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload knowledge file')
    } finally {
      setIsUploadingKnowledge(false)
    }
  }

  return (
    <div className={`dashboard-card space-y-4 ${className || ''}`.trim()}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-[#ff758f]" />
            <h2 className="text-lg font-semibold text-white">{t('knowledge.title')}</h2>
          </div>
          <p className="mt-1 text-sm text-zinc-400">{t('knowledge.description')}</p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="dashboard-chip">{t('knowledge.globalCount', { count: globalKnowledge.length })}</span>
          <span className="dashboard-chip">{t('knowledge.privateCount', { count: privateKnowledge.length })}</span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
      )}

      {(knowledgeAccess?.canManageGlobal || knowledgeAccess?.canManagePrivate) && (
        <div className="dashboard-card-soft space-y-3 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            {knowledgeAccess?.canManageGlobal && (
              <button
                type="button"
                onClick={() => setKnowledgeScope('GLOBAL')}
                className={`rounded-xl border p-4 text-left transition ${
                  knowledgeScope === 'GLOBAL'
                    ? 'border-[#ef233c]/30 bg-[#ef233c]/10'
                    : 'border-white/10 bg-black/20 hover:border-white/20'
                }`}
              >
                <p className="text-sm font-semibold text-white">{t('knowledge.scope.global')}</p>
                <p className="mt-1 text-sm text-zinc-400">{t('knowledge.scopeGlobalDescription')}</p>
              </button>
            )}
            {knowledgeAccess?.canManagePrivate && (
              <button
                type="button"
                onClick={() => setKnowledgeScope('PRIVATE')}
                className={`rounded-xl border p-4 text-left transition ${
                  knowledgeScope === 'PRIVATE'
                    ? 'border-[#ef233c]/30 bg-[#ef233c]/10'
                    : 'border-white/10 bg-black/20 hover:border-white/20'
                }`}
              >
                <p className="text-sm font-semibold text-white">{t('knowledge.scope.private')}</p>
                <p className="mt-1 text-sm text-zinc-400">{t('knowledge.scopePrivateDescription')}</p>
              </button>
            )}
          </div>

          <div className="grid gap-3">
            <input
              type="text"
              value={knowledgeTitle}
              onChange={(event) => setKnowledgeTitle(event.target.value)}
              placeholder={t('knowledge.fields.title')}
              className="dashboard-input"
            />
            <textarea
              value={knowledgeContent}
              onChange={(event) => setKnowledgeContent(event.target.value)}
              placeholder={t('knowledge.fields.content')}
              rows={5}
              className="dashboard-input min-h-[140px]"
            />
            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="text"
                value={knowledgeSource}
                onChange={(event) => setKnowledgeSource(event.target.value)}
                placeholder={t('knowledge.fields.source')}
                className="dashboard-input"
              />
              <input
                type="text"
                value={knowledgeTags}
                onChange={(event) => setKnowledgeTags(event.target.value)}
                placeholder={t('knowledge.fields.tags')}
                className="dashboard-input"
              />
            </div>
            <button
              type="button"
              onClick={handleCreateKnowledge}
              disabled={isSavingKnowledge}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#ef233c] bg-[#ef233c] px-4 py-3 text-sm font-medium text-white hover:bg-[#d90429] disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {isSavingKnowledge ? t('knowledge.saving') : t('knowledge.add')}
            </button>
          </div>

          <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-zinc-300">
                <FileUp className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-white">{t('knowledge.upload.title')}</p>
                  <p className="mt-1 text-sm text-zinc-400">{t('knowledge.upload.description')}</p>
                </div>

                <input
                  key={fileInputKey}
                  type="file"
                  accept={acceptedFileTypes}
                  onChange={handleFileChange}
                  className="block w-full text-sm text-zinc-400 file:mr-4 file:rounded-full file:border file:border-white/10 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-800"
                />

                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="text-xs text-zinc-500">
                    {selectedFile
                      ? t('knowledge.upload.selected', { name: selectedFile.name })
                      : t('knowledge.upload.supported')}
                  </div>
                  <button
                    type="button"
                    onClick={handleUploadKnowledge}
                    disabled={isUploadingKnowledge}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.08] disabled:opacity-50"
                  >
                    <FileUp className="h-4 w-4" />
                    {isUploadingKnowledge ? t('knowledge.upload.uploading') : t('knowledge.upload.action')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoadingKnowledge ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-zinc-400">
          {t('knowledge.loading')}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <KnowledgeColumn
            title={t('knowledge.globalTitle')}
            icon={<BookOpen className="h-4 w-4" />}
            emptyMessage={t('knowledge.emptyGlobal')}
            entries={globalKnowledge}
            canDelete={knowledgeAccess?.canManageGlobal ?? false}
            deletingId={deletingKnowledgeId}
            onDelete={handleDeleteKnowledge}
          />
          <KnowledgeColumn
            title={t('knowledge.privateTitle')}
            icon={<Database className="h-4 w-4" />}
            emptyMessage={knowledgeAccess?.hasPrivateAccess ? t('knowledge.emptyPrivate') : t('knowledge.privateUnavailable')}
            entries={privateKnowledge}
            canDelete={knowledgeAccess?.canManagePrivate ?? false}
            deletingId={deletingKnowledgeId}
            onDelete={handleDeleteKnowledge}
          />
        </div>
      )}
    </div>
  )
}

function KnowledgeColumn({
  title,
  icon,
  emptyMessage,
  entries,
  canDelete,
  deletingId,
  onDelete,
}: {
  title: string
  icon: ReactNode
  emptyMessage: string
  entries: KnowledgeEntry[]
  canDelete: boolean
  deletingId: string | null
  onDelete: (entry: KnowledgeEntry) => void
}) {
  return (
    <div className="dashboard-card-soft p-4">
      <div className="flex items-center gap-2">
        <span className="text-zinc-300">{icon}</span>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>

      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">{emptyMessage}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {entries.map((entry) => (
            <article key={entry.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-white">{entry.title}</h4>
                  {entry.source && <p className="mt-1 text-xs text-zinc-500">{entry.source}</p>}
                </div>

                {canDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(entry)}
                    disabled={deletingId === entry.id}
                    className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-red-400 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">{entry.content}</p>

              {entry.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {entry.tags.map((tag) => (
                    <span key={`${entry.id}-${tag}`} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-zinc-400">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
