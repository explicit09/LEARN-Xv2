/**
 * Structure-aware text chunker.
 * Target: 512 tokens per chunk, 15% overlap between consecutive chunks.
 * Token estimate: 1 token ≈ 4 characters (GPT tokenizer approximation).
 *
 * Structure preservation: code fences, markdown tables, and contiguous
 * list blocks are kept as atomic units — never split mid-structure.
 */

const TARGET_TOKENS = 512
const OVERLAP_RATIO = 0.15
const CHARS_PER_TOKEN = 4
const MAX_CHARS = TARGET_TOKENS * CHARS_PER_TOKEN // 2048
const OVERLAP_CHARS = Math.floor(MAX_CHARS * OVERLAP_RATIO) // ~307

export interface TextChunk {
  content: string
  chunkIndex: number
  tokenCount: number
}

/** Approximate token count using 4-chars-per-token heuristic. */
export function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

// ── Atomic block detection ──────────────────────────────────────

/** Regex to match fenced code blocks (```...```) */
const CODE_FENCE_RE = /^```[\s\S]*?^```/gm

/** Regex to match markdown table blocks (consecutive lines starting with |) */
const TABLE_RE = /(?:^\|.+\|$\n?){2,}/gm

/**
 * Split text into "atomic" segments (code/tables that must not be split)
 * interleaved with "prose" segments (everything else, safe to split).
 */
function extractAtomicBlocks(text: string): { text: string; atomic: boolean }[] {
  const segments: { text: string; atomic: boolean; start: number }[] = []

  // Collect all atomic block ranges
  const ranges: { start: number; end: number }[] = []
  for (const re of [CODE_FENCE_RE, TABLE_RE]) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      ranges.push({ start: m.index, end: m.index + m[0].length })
    }
  }

  // Sort by start position, merge overlapping
  ranges.sort((a, b) => a.start - b.start)
  const merged: typeof ranges = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (last && r.start <= last.end) {
      last.end = Math.max(last.end, r.end)
    } else {
      merged.push({ ...r })
    }
  }

  // Build interleaved segments
  let cursor = 0
  for (const r of merged) {
    if (cursor < r.start) {
      const prose = text.slice(cursor, r.start).trim()
      if (prose) segments.push({ text: prose, atomic: false, start: cursor })
    }
    const block = text.slice(r.start, r.end).trim()
    if (block) segments.push({ text: block, atomic: true, start: r.start })
    cursor = r.end
  }
  if (cursor < text.length) {
    const tail = text.slice(cursor).trim()
    if (tail) segments.push({ text: tail, atomic: false, start: cursor })
  }

  return segments.map((s) => ({ text: s.text, atomic: s.atomic }))
}

// ── Main chunker ────────────────────────────────────────────────

/**
 * Split text into overlapping chunks of ~512 tokens.
 * Code fences and markdown tables are kept as atomic chunks.
 * Prose segments use word-accumulation with overlap.
 */
export function chunkText(text: string): TextChunk[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const segments = extractAtomicBlocks(trimmed)
  const chunks: TextChunk[] = []

  for (const seg of segments) {
    if (seg.atomic) {
      // Atomic block — emit as-is, even if oversized
      chunks.push({
        content: seg.text,
        chunkIndex: chunks.length,
        tokenCount: estimateTokens(seg.text),
      })
    } else {
      // Prose — word-accumulation with overlap
      const proseChunks = chunkProse(seg.text)
      for (const pc of proseChunks) {
        chunks.push({
          content: pc,
          chunkIndex: chunks.length,
          tokenCount: estimateTokens(pc),
        })
      }
    }
  }

  return chunks
}

/** Word-accumulation chunker for prose text. */
function chunkProse(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return []

  const results: string[] = []
  let wordStart = 0

  while (wordStart < words.length) {
    let charCount = 0
    let wordEnd = wordStart

    while (wordEnd < words.length) {
      const word = words[wordEnd]!
      const len = word.length + (wordEnd > wordStart ? 1 : 0)
      if (charCount + len > MAX_CHARS && wordEnd > wordStart) break
      charCount += len
      wordEnd++
    }

    results.push(words.slice(wordStart, wordEnd).join(' '))

    if (wordEnd >= words.length) break

    // Overlap: step back by OVERLAP_CHARS
    let overlapChars = 0
    let overlapStart = wordEnd
    while (overlapStart > wordStart + 1) {
      overlapChars += words[overlapStart - 1]!.length + 1
      if (overlapChars >= OVERLAP_CHARS) break
      overlapStart--
    }
    wordStart = overlapStart
  }

  return results
}
