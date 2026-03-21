/**
 * Select chunks that fit within a character budget.
 * Keeps the most recent chunks (array order = most recent first).
 * If total exceeds maxChars, drops oldest chunks until it fits.
 */
export function selectChunksWithinBudget(chunks: string[], maxChars: number): string[] {
  let totalChars = 0
  const selected: string[] = []

  for (const chunk of chunks) {
    if (totalChars + chunk.length > maxChars && selected.length > 0) break
    selected.push(chunk)
    totalChars += chunk.length
  }

  return selected
}
