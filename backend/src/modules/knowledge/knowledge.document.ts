import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'

const WordExtractor = require('word-extractor')

const SUPPORTED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
  '.md',
  '.markdown',
  '.csv',
  '.tsv',
  '.json',
  '.html',
  '.htm',
  '.xml',
  '.rtf',
])

export class KnowledgeDocumentError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

export async function extractTextFromKnowledgeFile(options: {
  buffer: Buffer
  fileName: string
  mimeType?: string
}): Promise<{
  text: string
  normalizedFileName: string
  detectedType: string
}> {
  const normalizedFileName = options.fileName?.trim() || 'documento'
  const extension = path.extname(normalizedFileName).toLowerCase()

  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new KnowledgeDocumentError(
      'UNSUPPORTED_FILE_TYPE',
      'Formato de arquivo nao suportado para RAG. Envie PDF, Word, TXT, Markdown, CSV, JSON, HTML, XML ou RTF.'
    )
  }

  let text = ''

  switch (extension) {
    case '.pdf':
      text = await extractPdfText(options.buffer)
      break
    case '.docx':
      text = await extractDocxText(options.buffer)
      break
    case '.doc':
      text = await extractDocText(options.buffer, normalizedFileName)
      break
    case '.html':
    case '.htm':
      text = stripHtml(options.buffer.toString('utf8'))
      break
    case '.rtf':
      text = normalizeWhitespace(stripRtf(options.buffer.toString('utf8')))
      break
    case '.json':
      text = normalizeWhitespace(stringifyJson(options.buffer.toString('utf8')))
      break
    default:
      text = options.buffer.toString('utf8')
      break
  }

  const normalizedText = normalizeWhitespace(text)

  if (!normalizedText) {
    throw new KnowledgeDocumentError(
      'EMPTY_DOCUMENT',
      'Nao foi possivel extrair texto util do arquivo enviado.'
    )
  }

  return {
    text: normalizedText,
    normalizedFileName,
    detectedType: extension.slice(1).toUpperCase(),
  }
}

export function chunkKnowledgeDocument(text: string, chunkSize = 6000, overlap = 500): string[] {
  const normalized = normalizeWhitespace(text)
  if (!normalized) {
    return []
  }

  if (normalized.length <= chunkSize) {
    return [normalized]
  }

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  const chunks: string[] = []
  let current = ''

  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph
      continue
    }

    if (`${current}\n\n${paragraph}`.length <= chunkSize) {
      current = `${current}\n\n${paragraph}`
      continue
    }

    chunks.push(current)
    current = buildChunkWithOverlap(current, paragraph, overlap)
  }

  if (current) {
    chunks.push(current)
  }

  return chunks.flatMap((chunk) => splitOversizedChunk(chunk, chunkSize, overlap))
}

function buildChunkWithOverlap(previousChunk: string, nextParagraph: string, overlap: number) {
  const tail = previousChunk.slice(Math.max(0, previousChunk.length - overlap)).trim()
  return tail ? `${tail}\n\n${nextParagraph}` : nextParagraph
}

function splitOversizedChunk(chunk: string, chunkSize: number, overlap: number): string[] {
  if (chunk.length <= chunkSize) {
    return [chunk]
  }

  const parts: string[] = []
  let start = 0

  while (start < chunk.length) {
    const end = Math.min(chunk.length, start + chunkSize)
    const slice = chunk.slice(start, end).trim()

    if (slice) {
      parts.push(slice)
    }

    if (end >= chunk.length) {
      break
    }

    start = Math.max(end - overlap, start + 1)
  }

  return parts
}

async function extractPdfText(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer })

  try {
    const result = await parser.getText()
    return result.text || ''
  } finally {
    await parser.destroy().catch(() => undefined)
  }
}

async function extractDocxText(buffer: Buffer) {
  const result = await mammoth.extractRawText({ buffer })
  return result.value || ''
}

async function extractDocText(buffer: Buffer, fileName: string) {
  const tempPath = path.join(os.tmpdir(), `opensquad-${Date.now()}-${fileName}`)

  try {
    await fs.writeFile(tempPath, buffer)
    const extractor = new WordExtractor()
    const document = await extractor.extract(tempPath)
    return document.getBody() || ''
  } finally {
    await fs.unlink(tempPath).catch(() => undefined)
  }
}

function normalizeWhitespace(value: string) {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function stringifyJson(value: string) {
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/?(p|div|section|article|li|ul|ol|h[1-6]|br|tr|td|th)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function stripRtf(value: string) {
  return value
    .replace(/\\'[0-9a-fA-F]{2}/g, ' ')
    .replace(/\\par[d]?/g, '\n')
    .replace(/\\tab/g, '\t')
    .replace(/\\[a-z]+\d* ?/g, ' ')
    .replace(/[{}]/g, ' ')
}
