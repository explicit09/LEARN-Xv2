/**
 * Structure-aware text chunker.
 * Target: 512 tokens per chunk, 15% overlap between consecutive chunks.
 * Token estimate: 1 token ≈ 4 characters (GPT tokenizer approximation).
 */

const TARGET_TOKENS = 512
const OVERLAP_RATIO = 0.15
const CHARS_PER_TOKEN = 4
const OVERLAP_CHARS = Math.floor(TARGET_TOKENS * CHARS_PER_TOKEN * OVERLAP_RATIO) // ~307 chars

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

/**
 * Split text into overlapping chunks of ~512 tokens.
 * Accumulates words until the char budget is reached, then backtracks
 * by OVERLAP_CHARS to create the overlap window for the next chunk.
 */
export function chunkText(text: string): TextChunk[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const words = trimmed.split(/\s+/).filter(Boolean)
  if (words.length === 0) return []

  const maxChars = TARGET_TOKENS * CHARS_PER_TOKEN // 2048 chars
  const chunks: TextChunk[] = []
  let wordStart = 0

  while (wordStart < words.length) {
    // Accumulate words until we hit the char budget
    let charCount = 0
    let wordEnd = wordStart

    while (wordEnd < words.length) {
      const word = words[wordEnd]!
      const wordLen = word.length + (wordEnd > wordStart ? 1 : 0) // +1 for space
      if (charCount + wordLen > maxChars && wordEnd > wordStart) break
      charCount += wordLen
      wordEnd++
    }

    const content = words.slice(wordStart, wordEnd).join(' ')
    chunks.push({
      content,
      chunkIndex: chunks.length,
      tokenCount: estimateTokens(content),
    })

    if (wordEnd >= words.length) break

    // Step back by OVERLAP_CHARS to find the overlap start
    let overlapChars = 0
    let overlapStart = wordEnd
    while (overlapStart > wordStart + 1) {
      const w = words[overlapStart - 1]!
      overlapChars += w.length + 1
      if (overlapChars >= OVERLAP_CHARS) break
      overlapStart--
    }
    wordStart = overlapStart
  }

  return chunks
}
