'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Copy, Download, ExternalLink, Loader2, Search } from 'lucide-react'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

interface AssetSlide {
  title: string
  body: string
  imageUrl: string
  imagePrompt?: string
}

interface Asset {
  id: string
  type: 'image' | 'infographic' | 'carousel'
  title: string
  prompt: string
  alt: string
  url: string
  slides?: AssetSlide[]
}

interface Artifact {
  type?: string
  title?: string
  summary?: string
  content?: string
  checklist?: string[]
  assets?: Asset[]
}

interface ExecutionRecord {
  id: string
  status: 'pending' | 'active' | 'waiting_checkpoint' | 'completed' | 'failed'
  currentStep: number
  totalSteps: number
  output: Record<string, unknown>
  inputs: Record<string, unknown>
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  squad: {
    id: string
    slug: string
    name: string
    description: string
  }
}

export default function LibraryPage() {
  const t = useTranslations('library')
  const pathname = usePathname()
  const locale = pathname.startsWith('/pt-BR') ? 'pt-BR' : 'en-US'

  const [executions, setExecutions] = useState<ExecutionRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ExecutionRecord['status']>('all')
  const [copyFeedbackId, setCopyFeedbackId] = useState<string | null>(null)
  const [downloadFeedbackId, setDownloadFeedbackId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`${BACKEND_URL}/executor/history?limit=50`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch execution history')
        }

        const data = await response.json()
        setExecutions(data.executions || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    void fetchHistory()
  }, [])

  const normalizedQuery = query.trim().toLowerCase()
  const filteredExecutions = executions.filter((execution) => {
    if (statusFilter !== 'all' && execution.status !== statusFilter) return false
    if (!normalizedQuery) return true

    const artifact = getArtifact(execution)
    const haystack = [
      execution.squad.name,
      execution.squad.slug,
      stringifyValue(execution.inputs.brief),
      artifact?.title,
      artifact?.summary,
      artifact?.content,
      ...(artifact?.assets?.map((asset) => `${asset.title} ${asset.prompt}`) || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(normalizedQuery)
  })

  const completedCount = executions.filter((execution) => execution.status === 'completed').length
  const assetsCount = executions.reduce((acc, execution) => acc + (getArtifact(execution)?.assets?.length || 0), 0)

  const handleCopy = async (execution: ExecutionRecord) => {
    const artifact = getArtifact(execution)
    const textToCopy = artifact ? formatArtifactForCopy(artifact) : JSON.stringify(execution.output, null, 2)

    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopyFeedbackId(execution.id)
      window.setTimeout(() => setCopyFeedbackId(null), 2000)
    } catch (err) {
      console.error('Failed to copy library output:', err)
    }
  }

  const handleDownload = async (execution: ExecutionRecord) => {
    const artifact = getArtifact(execution)
    const packageName = slugify(artifact?.title || execution.squad.name || execution.id)

    setDownloadingId(execution.id)

    try {
      const files: Array<{ name: string; source: string; mimeType?: string }> = []
      const textToDownload = artifact ? formatArtifactForCopy(artifact) : JSON.stringify(execution.output, null, 2)

      files.push({
        name: `${packageName}-conteudo.txt`,
        source: createTextDataUrl(textToDownload),
        mimeType: 'text/plain;charset=utf-8',
      })

      const assets = artifact?.assets || []
      for (let assetIndex = 0; assetIndex < assets.length; assetIndex += 1) {
        const asset = assets[assetIndex]
        const assetBaseName = `${packageName}-${assetIndex + 1}-${slugify(asset.title || asset.type)}`

        files.push({
          name: `${assetBaseName}-texto.txt`,
          source: createTextDataUrl(formatAssetText(asset)),
          mimeType: 'text/plain;charset=utf-8',
        })

        files.push({
          name: `${assetBaseName}.${inferExtension(asset.url, 'png')}`,
          source: asset.url,
        })

        const slides = asset.slides || []
        for (let slideIndex = 0; slideIndex < slides.length; slideIndex += 1) {
          const slide = slides[slideIndex]
          const slideBaseName = `${packageName}-${assetIndex + 1}-slide-${slideIndex + 1}-${slugify(slide.title || `slide-${slideIndex + 1}`)}`
          const slideDownloadSource = asset.type === 'carousel'
            ? await buildSlideDownloadSource(
                slide.imageUrl,
                slide,
                slideIndex,
                slides.length,
                artifact?.title || execution.squad.name
              )
            : slide.imageUrl

          files.push({
            name: `${slideBaseName}-texto.txt`,
            source: createTextDataUrl(formatSlideText(slide, slideIndex + 1)),
            mimeType: 'text/plain;charset=utf-8',
          })

          files.push({
            name: `${slideBaseName}.${asset.type === 'carousel' ? 'png' : inferExtension(slide.imageUrl, 'png')}`,
            source: slideDownloadSource,
          })
        }
      }

      const zipBlob = await createZipBlob(files)
      triggerBlobDownload(zipBlob, `${packageName}-arquivos.zip`)

      setDownloadFeedbackId(execution.id)
      window.setTimeout(() => setDownloadFeedbackId(null), 2500)
    } catch (err) {
      console.error('Failed to download library assets:', err)
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="dashboard-title">{t('title')}</h1>
          <p className="dashboard-subtitle">{t('subtitle')}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label={t('stats.total')} value={String(executions.length)} />
          <StatCard label={t('stats.completed')} value={String(completedCount)} />
          <StatCard label={t('stats.saved')} value={String(assetsCount)} />
        </div>
      </div>

      <div className="dashboard-card">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('searchPlaceholder')}
              className="dashboard-input pl-10"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {(['all', 'completed', 'active', 'failed'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  statusFilter === filter
                    ? 'border-[#ef233c]/20 bg-[#ef233c]/12 text-white'
                    : 'border-white/10 bg-white/[0.04] text-zinc-400 hover:border-white/20 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {t(`filters.${filter}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#ef233c]" />
        </div>
      )}

      {error && !isLoading && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
      )}

      {!isLoading && !error && filteredExecutions.length === 0 && (
        <div className="dashboard-card border-dashed p-12 text-center">
          <h2 className="text-lg font-semibold text-white">{t('empty.title')}</h2>
          <p className="mt-2 text-sm text-zinc-400">{t(query || statusFilter !== 'all' ? 'empty.filtered' : 'empty.default')}</p>
        </div>
      )}

      {!isLoading && !error && filteredExecutions.length > 0 && (
        <div className="space-y-4">
          {filteredExecutions.map((execution) => {
            const artifact = getArtifact(execution)
            const copied = copyFeedbackId === execution.id
            const downloaded = downloadFeedbackId === execution.id
            const isDownloading = downloadingId === execution.id

            return (
              <article key={execution.id} className="dashboard-card">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(execution.status)}`}>
                        {t(`status.${execution.status}`)}
                      </span>
                      <span className="dashboard-chip">{execution.squad.name}</span>
                      <span className="text-xs text-zinc-500">{formatDate(execution.completedAt || execution.createdAt, locale)}</span>
                    </div>

                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        {artifact?.title || execution.squad.name}
                      </h2>
                      <p className="mt-1 text-sm text-zinc-400">
                        {artifact?.summary || stringifyValue(execution.inputs.brief) || execution.squad.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(execution)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-white/[0.08] hover:text-white"
                    >
                      <Copy className="h-4 w-4" />
                      {copied ? t('copied') : t('copy')}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownload(execution)}
                      disabled={isDownloading}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      {isDownloading ? t('downloading') : downloaded ? t('downloaded') : t('download')}
                    </button>

                    <Link
                      href={`/${locale}/dashboard/execute/${execution.squad.slug}`}
                      className="inline-flex items-center gap-2 rounded-full border border-[#ef233c] bg-[#ef233c] px-3 py-2 text-sm font-medium text-white hover:bg-[#d90429]"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {t('openSquad')}
                    </Link>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
                  <div className="space-y-4">
                    <div className="dashboard-card-soft p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('content')}</p>
                      <pre className="whitespace-pre-wrap text-sm font-sans text-zinc-200">
                        {artifact ? formatArtifactForCopy(artifact) : JSON.stringify(execution.output, null, 2)}
                      </pre>
                    </div>

                    {artifact?.assets && artifact.assets.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('assets')}</p>
                        <div className="grid gap-3">
                          {artifact.assets.map((asset) => (
                            <div key={asset.id} className="dashboard-card-soft p-3">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium text-white">{asset.title}</p>
                                  <p className="text-xs uppercase tracking-wide text-zinc-500">{asset.type}</p>
                                </div>
                              </div>
                              <img
                                src={asset.url}
                                alt={asset.alt}
                                className="w-full rounded-lg border border-white/10 bg-black/20 object-cover"
                              />
                              <p className="mt-3 text-xs text-zinc-400">{asset.prompt}</p>
                              {asset.slides && asset.slides.length > 0 && (
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                  {asset.slides.map((slide, index) => (
                                    <div key={`${asset.id}-${index}`} className="overflow-hidden rounded-lg border border-white/10 bg-black/20">
                                      <img src={slide.imageUrl} alt={slide.title} className="w-full bg-black/20" />
                                      <div className="p-2">
                                        <p className="text-xs font-medium text-white">{slide.title}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="dashboard-card-soft p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('brief')}</p>
                      <p className="mt-2 text-sm text-zinc-300">
                        {stringifyValue(execution.inputs.brief) || t('briefEmpty')}
                      </p>
                    </div>

                    {artifact?.checklist && artifact.checklist.length > 0 && (
                      <div className="dashboard-card-soft p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('checklist')}</p>
                        <ul className="mt-2 space-y-2 text-sm text-zinc-300">
                          {artifact.checklist.map((item, index) => (
                            <li key={`${execution.id}-${index}`} className="flex gap-2">
                              <span className="text-emerald-400">-</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="dashboard-card px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

function getArtifact(execution: ExecutionRecord): Artifact | undefined {
  const artifact = execution.output?.artifact
  return artifact && typeof artifact === 'object' ? (artifact as Artifact) : undefined
}

function stringifyValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function formatArtifactForCopy(artifact: Artifact): string {
  return [artifact.title, artifact.content]
    .filter((value): value is string => !!value && value.trim().length > 0)
    .join('\n\n')
}

function getStatusClasses(status: ExecutionRecord['status']) {
  switch (status) {
    case 'completed':
      return 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
    case 'failed':
      return 'border border-red-500/20 bg-red-500/10 text-red-300'
    case 'active':
      return 'border border-sky-400/20 bg-sky-400/10 text-sky-300'
    case 'waiting_checkpoint':
      return 'border border-amber-400/20 bg-amber-400/10 text-amber-300'
    default:
      return 'border border-white/10 bg-white/[0.04] text-zinc-300'
  }
}

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleString(locale === 'pt-BR' ? 'pt-BR' : 'en-US', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function formatAssetText(asset: Asset) {
  return [
    `Titulo: ${asset.title}`,
    `Tipo: ${asset.type}`,
    asset.alt ? `Alt: ${asset.alt}` : '',
    asset.prompt ? `Prompt visual: ${asset.prompt}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function formatSlideText(slide: AssetSlide, slideNumber: number) {
  return [
    `Slide: ${slideNumber}`,
    `Titulo: ${slide.title}`,
    `Texto: ${slide.body}`,
    slide.imagePrompt ? `Prompt visual: ${slide.imagePrompt}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'arquivo'
}

function createTextDataUrl(content: string) {
  return `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`
}

function inferExtension(source: string, fallback: string) {
  if (source.startsWith('data:image/svg+xml')) return 'svg'
  if (source.startsWith('data:image/png')) return 'png'
  if (source.startsWith('data:image/webp')) return 'webp'
  if (source.startsWith('data:image/jpeg') || source.startsWith('data:image/jpg')) return 'jpg'

  try {
    const url = new URL(source)
    const match = url.pathname.match(/\.([a-zA-Z0-9]+)$/)
    return match?.[1]?.toLowerCase() || fallback
  } catch {
    return fallback
  }
}

async function sourceToBlob(source: string, fileName: string, mimeType?: string) {
  if (source.startsWith('data:')) {
    const response = await fetch(source)
    const blob = await response.blob()
    return mimeType ? new Blob([blob], { type: mimeType }) : blob
  }

  const response = await fetch(source)
  if (!response.ok) {
    throw new Error(`Unable to download file: ${fileName}`)
  }

  const blob = await response.blob()
  return mimeType ? new Blob([blob], { type: mimeType }) : blob
}

async function createZipBlob(files: Array<{ name: string; source: string; mimeType?: string }>) {
  const encodedFiles = await Promise.all(
    files.map(async (file) => {
      const blob = await sourceToBlob(file.source, file.name, file.mimeType)
      const bytes = new Uint8Array(await blob.arrayBuffer())
      return {
        name: file.name,
        nameBytes: new TextEncoder().encode(file.name),
        bytes,
        crc: crc32(bytes),
      }
    })
  )

  const chunks: Uint8Array[] = []
  const centralDirectory: Uint8Array[] = []
  let offset = 0

  for (const file of encodedFiles) {
    const localHeader = createZipLocalHeader(file.nameBytes, file.bytes.length, file.crc)
    chunks.push(localHeader, file.nameBytes, file.bytes)

    centralDirectory.push(
      createZipCentralDirectoryHeader(file.nameBytes, file.bytes.length, file.crc, offset)
    )

    offset += localHeader.length + file.nameBytes.length + file.bytes.length
  }

  const centralDirectoryOffset = offset
  const centralDirectorySize = centralDirectory.reduce((total, chunk) => total + chunk.length, 0)
  const endRecord = createZipEndRecord(encodedFiles.length, centralDirectorySize, centralDirectoryOffset)

  const blobParts = [...chunks, ...centralDirectory, endRecord].map((chunk) => toBlobPart(chunk))
  return new Blob(blobParts, { type: 'application/zip' })
}

function toBlobPart(chunk: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(chunk.length)
  copy.set(chunk)
  return copy.buffer
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

function createZipLocalHeader(nameBytes: Uint8Array, size: number, crc: number) {
  const header = new Uint8Array(30)
  const view = new DataView(header.buffer)
  view.setUint32(0, 0x04034b50, true)
  view.setUint16(4, 20, true)
  view.setUint16(6, 0x0800, true)
  view.setUint16(8, 0, true)
  view.setUint16(10, 0, true)
  view.setUint16(12, 0, true)
  view.setUint32(14, crc, true)
  view.setUint32(18, size, true)
  view.setUint32(22, size, true)
  view.setUint16(26, nameBytes.length, true)
  view.setUint16(28, 0, true)
  return header
}

function createZipCentralDirectoryHeader(
  nameBytes: Uint8Array,
  size: number,
  crc: number,
  offset: number
) {
  const header = new Uint8Array(46 + nameBytes.length)
  const view = new DataView(header.buffer)
  view.setUint32(0, 0x02014b50, true)
  view.setUint16(4, 20, true)
  view.setUint16(6, 20, true)
  view.setUint16(8, 0x0800, true)
  view.setUint16(10, 0, true)
  view.setUint16(12, 0, true)
  view.setUint16(14, 0, true)
  view.setUint32(16, crc, true)
  view.setUint32(20, size, true)
  view.setUint32(24, size, true)
  view.setUint16(28, nameBytes.length, true)
  view.setUint16(30, 0, true)
  view.setUint16(32, 0, true)
  view.setUint16(34, 0, true)
  view.setUint16(36, 0, true)
  view.setUint32(38, 0, true)
  view.setUint32(42, offset, true)
  header.set(nameBytes, 46)
  return header
}

function createZipEndRecord(fileCount: number, centralDirectorySize: number, centralDirectoryOffset: number) {
  const record = new Uint8Array(22)
  const view = new DataView(record.buffer)
  view.setUint32(0, 0x06054b50, true)
  view.setUint16(4, 0, true)
  view.setUint16(6, 0, true)
  view.setUint16(8, fileCount, true)
  view.setUint16(10, fileCount, true)
  view.setUint32(12, centralDirectorySize, true)
  view.setUint32(16, centralDirectoryOffset, true)
  view.setUint16(20, 0, true)
  return record
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff

  for (let index = 0; index < bytes.length; index += 1) {
    const byte = bytes[index]
    crc ^= byte

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }

  return (crc ^ 0xffffffff) >>> 0
}

async function buildSlideDownloadSource(
  imageUrl: string,
  slide: AssetSlide,
  slideIndex: number,
  totalSlides: number,
  carouselTitle: string
) {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1350
  const context = canvas.getContext('2d')

  if (!context) {
    return imageUrl
  }

  const accentPalette = ['#ef233c', '#38bdf8', '#22c55e', '#f59e0b', '#a855f7']
  const accent = accentPalette[slideIndex % accentPalette.length]
  const background = await loadImageElement(imageUrl)

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)

  drawCoverImage(context, background, canvas.width, 900)

  context.fillStyle = '#ffffff'
  context.fillRect(0, 900, canvas.width, 450)

  context.fillStyle = accent
  context.fillRect(0, 900, canvas.width, 10)

  context.fillStyle = accent
  roundRect(context, 72, 956, 188, 52, 26)
  context.fill()

  context.fillStyle = '#ffffff'
  context.font = '700 22px Arial'
  context.fillText(`SLIDE ${slideIndex + 1}`, 104, 990)

  context.fillStyle = '#0f172a'
  drawWrappedText(context, slide.title, 72, 1078, 936, 54, '800 48px Arial', 2)

  context.fillStyle = '#334155'
  drawWrappedText(context, slide.body, 72, 1198, 936, 38, '400 30px Arial', 3)

  context.fillStyle = '#64748b'
  drawWrappedText(context, carouselTitle, 72, 1306, 760, 28, '400 22px Arial', 1)

  context.fillStyle = accent
  context.font = '700 26px Arial'
  context.textAlign = 'right'
  context.fillText(`${slideIndex + 1}/${totalSlides}`, 1008, 1308)
  context.textAlign = 'left'

  return canvas.toDataURL('image/png')
}

async function loadImageElement(source: string) {
  const image = new Image()
  image.decoding = 'async'

  return await new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Unable to load image for composition'))

    if (source.startsWith('data:')) {
      image.src = source
      return
    }

    fetch(source)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Unable to fetch image for composition')
        }

        return response.blob()
      })
      .then((blob) => {
        image.src = URL.createObjectURL(blob)
      })
      .catch(reject)
  })
}

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  targetX = 0,
  targetY = 0
) {
  const sourceWidth = image.width || targetWidth
  const sourceHeight = image.height || targetHeight
  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight)
  const drawWidth = sourceWidth * scale
  const drawHeight = sourceHeight * scale
  const offsetX = (targetWidth - drawWidth) / 2
  const offsetY = (targetHeight - drawHeight) / 2

  context.save()
  context.beginPath()
  context.rect(targetX, targetY, targetWidth, targetHeight)
  context.clip()
  context.drawImage(image, targetX + offsetX, targetY + offsetY, drawWidth, drawHeight)
  context.restore()
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  font: string,
  maxLines?: number
) {
  context.font = font
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let currentLine = ''
  let didTruncate = false

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index]
    const nextLine = currentLine ? `${currentLine} ${word}` : word
    if (context.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine
      continue
    }

    if (currentLine) {
      lines.push(currentLine)
    }
    currentLine = word

    if (maxLines && lines.length === maxLines) {
      didTruncate = true
      break
    }
  }

  if (currentLine && (!maxLines || lines.length < maxLines)) {
    lines.push(currentLine)
  } else if (currentLine) {
    didTruncate = true
  }

  if (maxLines && lines.length > maxLines) {
    lines.length = maxLines
    didTruncate = true
  }

  if (didTruncate && lines.length > 0) {
    const lastIndex = lines.length - 1
    let lastLine = lines[lastIndex]

    while (context.measureText(`${lastLine}...`).width > maxWidth && lastLine.length > 0) {
      lastLine = lastLine.slice(0, -1).trim()
    }

    lines[lastIndex] = lastLine ? `${lastLine}...` : lines[lastIndex]
  }

  lines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight, maxWidth)
  })
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.lineTo(x + width - radius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + radius)
  context.lineTo(x + width, y + height - radius)
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  context.lineTo(x + radius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - radius)
  context.lineTo(x, y + radius)
  context.quadraticCurveTo(x, y, x + radius, y)
  context.closePath()
}
