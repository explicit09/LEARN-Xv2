export interface RawConcept {
  name: string
  description: string
  tags: string[]
}

export function normalizeConceptName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function deduplicateConcepts(concepts: RawConcept[]): RawConcept[] {
  const map = new Map<string, RawConcept>()

  for (const concept of concepts) {
    const key = normalizeConceptName(concept.name)
    const existing = map.get(key)
    if (!existing) {
      map.set(key, { ...concept })
    } else {
      // Keep longer description
      const description =
        concept.description.length > existing.description.length
          ? concept.description
          : existing.description
      // Merge tags (deduplicated)
      const tags = Array.from(new Set([...existing.tags, ...concept.tags]))
      map.set(key, { ...existing, description, tags })
    }
  }

  return Array.from(map.values())
}
