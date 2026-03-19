export interface RawConcept {
  name: string
  description: string
  tags: string[]
}

export function normalizeConceptName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Reduce a concept name to its core words for fuzzy matching */
function coreWords(name: string): string {
  return normalizeConceptName(name)
    .replace(/\b(the|a|an|of|in|for|and|or|with|by|to|from|as|on|at)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Check if two concept names are semantically similar enough to merge */
function isSimilarConcept(a: string, b: string): boolean {
  const coreA = coreWords(a)
  const coreB = coreWords(b)
  if (coreA === coreB) return true
  // One contains the other (e.g., "span vectors" vs "span")
  if (coreA.includes(coreB) || coreB.includes(coreA)) {
    const shorter = coreA.length < coreB.length ? coreA : coreB
    const longer = coreA.length < coreB.length ? coreB : coreA
    // Only merge if the shorter is at least 60% of the longer
    return shorter.length / longer.length > 0.6
  }
  return false
}

export function deduplicateConcepts(concepts: RawConcept[]): RawConcept[] {
  const groups: RawConcept[][] = []

  for (const concept of concepts) {
    let merged = false
    for (const group of groups) {
      if (group.some((existing) => isSimilarConcept(existing.name, concept.name))) {
        group.push(concept)
        merged = true
        break
      }
    }
    if (!merged) {
      groups.push([concept])
    }
  }

  // From each group, pick the best representative
  return groups.map((group) => {
    // Pick the entry with the longest description as canonical
    group.sort((a, b) => b.description.length - a.description.length)
    const best = group[0]!
    const allTags = Array.from(new Set(group.flatMap((c) => c.tags)))
    return { name: best.name, description: best.description, tags: allTags }
  })
}
