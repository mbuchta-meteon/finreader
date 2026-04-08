/**
 * Shared vision utilities for Anthropic providers (Claude Sonnet + Haiku).
 *
 * Strategy:
 * - Images (PNG/JPG/WEBP/GIF) → base64 image block → vision API
 * - PDFs → extract text via pdfjs-dist → text analysis
 *   (Gemini handles PDFs natively; Claude/Haiku use text extraction)
 */
import type { FileData } from '../ai-provider'

export type ImageBlock = {
  type: 'image'
  source: { type: 'base64'; media_type: ImageMediaType; data: string }
}

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
const SUPPORTED_IMAGE_TYPES: ImageMediaType[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

/**
 * For image files: returns base64 image blocks ready for Anthropic vision API.
 * For PDFs: extracts text and returns it as a string (use analyzeText instead).
 */
export async function toImageBlocks(file: FileData): Promise<ImageBlock[]> {
  if (file.mimeType === 'application/pdf') {
    throw new Error('PDFs should use extractPdfText() — route to text pipeline for Claude/Haiku')
  }

  const mediaType = SUPPORTED_IMAGE_TYPES.includes(file.mimeType as ImageMediaType)
    ? file.mimeType as ImageMediaType
    : 'image/jpeg' as const

  return [{
    type: 'image',
    source: {
      type: 'base64',
      media_type: mediaType,
      data: file.buffer.toString('base64'),
    },
  }]
}

/**
 * Extracts text from a PDF using pdfjs-dist (pure JS, no native deps).
 * Used as fallback for Claude/Haiku when receiving PDFs.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  // pdfjs-dist v5 legacy build
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

  const loadingTask = (pdfjsLib as any).getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  })

  const pdfDoc = await loadingTask.promise
  const numPages = pdfDoc.numPages
  const pageTexts: string[] = []

  for (let i = 1; i <= numPages; i++) {
    const page    = await pdfDoc.getPage(i)
    const content = await page.getTextContent()
    const text    = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
    pageTexts.push(`--- Page ${i} ---\n${text}`)
  }

  return pageTexts.join('\n\n')
}
