import { logger } from '@trigger.dev/sdk/v3'
import { generateText } from 'ai'

const MIN_TEXT_LENGTH = 50
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY

export interface ExtractionResult {
  text: string
  /** Per-page text for PDFs and per-slide text for PPTX. null for flat formats. */
  pages: string[] | null
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Extract text from any supported file type. */
export async function extractText(blob: Blob, fileType: string): Promise<ExtractionResult> {
  switch (fileType) {
    case 'pdf':
      return extractPdfText(blob)
    case 'docx':
      return { text: await extractDocxText(blob), pages: null }
    case 'pptx':
      return extractPptxText(blob)
    case 'html':
      return { text: await extractHtmlText(blob), pages: null }
    case 'txt':
    case 'md':
      return { text: await blob.text(), pages: null }
    default:
      throw new Error(`Unsupported file type: ${fileType}`)
  }
}

// ── PDF ──────────────────────────────────────────────────────────────────────

async function extractPdfText(blob: Blob): Promise<ExtractionResult> {
  const { pages, combined } = await extractWithUnpdf(blob)
  if (combined.length >= MIN_TEXT_LENGTH) {
    logger.info('PDF parsed with unpdf', { textLength: combined.length, pages: pages.length })
    return { text: combined, pages }
  }
  logger.info('unpdf extracted little text, falling back to Gemini', {
    textLength: combined.length,
  })
  if (!GOOGLE_API_KEY) {
    throw new Error('PDF appears scanned and GOOGLE_API_KEY is not set for OCR fallback.')
  }
  const text = await extractWithGemini(blob)
  return { text, pages: null } // Gemini returns flat text, no page boundaries
}

async function extractWithUnpdf(blob: Blob): Promise<{ pages: string[]; combined: string }> {
  const { extractText: extract } = await import('unpdf')
  const buffer = await blob.arrayBuffer()
  const { text, totalPages } = await extract(new Uint8Array(buffer))
  logger.info('unpdf extraction', { totalPages, pageCount: text.length })
  return { pages: text, combined: text.join('\n\n').trim() }
}

async function extractWithGemini(blob: Blob): Promise<string> {
  const { google } = await import('@ai-sdk/google')
  const buffer = await blob.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const { text } = await generateText({
    model: google('gemini-2.0-flash'),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'file', data: base64, mediaType: 'application/pdf' },
          {
            type: 'text',
            text: 'Extract all text content from this PDF as clean, well-structured markdown. Preserve headings, tables, lists, and formatting. Do not add commentary — only output the document content.',
          },
        ],
      },
    ],
    maxOutputTokens: 65536,
  })
  logger.info('PDF parsed with Gemini fallback', { textLength: text.length })
  return text.trim()
}

// ── DOCX ─────────────────────────────────────────────────────────────────────

async function extractDocxText(blob: Blob): Promise<string> {
  const mammothModule = await import('mammoth')
  const mammoth = mammothModule.default ?? mammothModule
  const buffer = await blob.arrayBuffer()
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) })
  const text = result.value.trim()
  logger.info('DOCX parsed with mammoth', { textLength: text.length })
  if (text.length < MIN_TEXT_LENGTH) {
    throw new Error(`DOCX produced too little text (${text.length} chars). File may be empty.`)
  }
  return text
}

// ── PPTX ─────────────────────────────────────────────────────────────────────

async function extractPptxText(blob: Blob): Promise<ExtractionResult> {
  const JSZip = (await import('jszip')).default
  const buffer = await blob.arrayBuffer()
  const zip = await JSZip.loadAsync(buffer)

  // PPTX slides are in ppt/slides/slide1.xml, slide2.xml, etc.
  const slideFiles = Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/i.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] ?? '0')
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] ?? '0')
      return numA - numB
    })

  if (slideFiles.length === 0) {
    throw new Error('PPTX contains no slides')
  }

  // Also check for speaker notes in ppt/notesSlides/
  const notesFiles = Object.keys(zip.files).filter((f) =>
    /^ppt\/notesSlides\/notesSlide\d+\.xml$/i.test(f),
  )

  const slideTexts: string[] = []
  for (const slideFile of slideFiles) {
    const entry = zip.files[slideFile]
    if (!entry) continue
    const xml = await entry.async('string')
    const text = stripXmlTags(xml)
    if (text.trim()) slideTexts.push(text.trim())
  }

  // Extract speaker notes (often the most valuable content)
  const noteTexts: string[] = []
  for (const noteFile of notesFiles) {
    const entry = zip.files[noteFile]
    if (!entry) continue
    const xml = await entry.async('string')
    const text = stripXmlTags(xml)
    if (text.trim()) noteTexts.push(text.trim())
  }

  const combined = slideTexts
    .map((slide, i) => {
      const note = noteTexts[i]
      return note
        ? `--- Slide ${i + 1} ---\n${slide}\n\nSpeaker Notes:\n${note}`
        : `--- Slide ${i + 1} ---\n${slide}`
    })
    .join('\n\n')

  logger.info('PPTX parsed', {
    slides: slideFiles.length,
    notes: noteTexts.length,
    textLength: combined.length,
  })
  if (combined.length < MIN_TEXT_LENGTH) {
    throw new Error(
      `PPTX produced too little text (${combined.length} chars). Slides may be image-only.`,
    )
  }
  // Each slide becomes a "page" for citation purposes
  const slidePages = slideTexts.map((slide, i) => {
    const note = noteTexts[i]
    return note ? `${slide}\n\n${note}` : slide
  })

  return { text: combined, pages: slidePages }
}

// ── HTML ─────────────────────────────────────────────────────────────────────

async function extractHtmlText(blob: Blob): Promise<string> {
  const html = await blob.text()
  // Strip HTML tags, decode entities, normalize whitespace
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
  logger.info('HTML parsed', { textLength: text.length })
  return text
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Strip XML tags and collapse whitespace. */
function stripXmlTags(xml: string): string {
  return xml
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
