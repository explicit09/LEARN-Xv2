// Topological sort of concepts by prerequisite relations (Kahn's algorithm)
// Only 'prerequisite' relations impose ordering — 'related', 'part_of', 'extends' are ignored.

interface Concept {
  id: string
  name: string
  [key: string]: unknown
}

interface Relation {
  sourceConceptId: string
  targetConceptId: string
  relationType: string
}

/**
 * Orders concepts so prerequisites come before their dependents.
 * Non-prerequisite relations (related, part_of, extends) are ignored.
 * Handles cycles gracefully — cyclic nodes are appended at the end.
 */
export function orderConceptsByPrerequisites<T extends Concept>(
  concepts: T[],
  relations: Relation[],
): T[] {
  if (concepts.length === 0) return []

  const conceptMap = new Map(concepts.map((c) => [c.id, c]))

  // Only prerequisite relations determine ordering.
  // source → target means "source is a prerequisite of target"
  // (target depends on source, so source must come first)
  const prereqRelations = relations.filter((r) => r.relationType === 'prerequisite')

  // Build adjacency list: for each concept, list concepts that depend on it
  // inDegree[id] = number of prerequisites that concept has
  const inDegree = new Map<string, number>()
  const dependents = new Map<string, string[]>() // prereq → [dependents]

  for (const concept of concepts) {
    inDegree.set(concept.id, 0)
    dependents.set(concept.id, [])
  }

  for (const rel of prereqRelations) {
    const { sourceConceptId: prereqId, targetConceptId: dependentId } = rel
    // Only process relations between concepts in our set
    if (!conceptMap.has(prereqId) || !conceptMap.has(dependentId)) continue
    // prereqId must come before dependentId
    inDegree.set(dependentId, (inDegree.get(dependentId) ?? 0) + 1)
    const deps = dependents.get(prereqId) ?? []
    deps.push(dependentId)
    dependents.set(prereqId, deps)
  }

  // Kahn's algorithm
  const queue: string[] = []
  for (const concept of concepts) {
    if ((inDegree.get(concept.id) ?? 0) === 0) {
      queue.push(concept.id)
    }
  }

  const result: T[] = []
  const visited = new Set<string>()

  while (queue.length > 0) {
    const currentId = queue.shift()!
    if (visited.has(currentId)) continue
    visited.add(currentId)

    const concept = conceptMap.get(currentId)
    if (concept) result.push(concept)

    const deps = dependents.get(currentId) ?? []
    for (const depId of deps) {
      const newDegree = (inDegree.get(depId) ?? 0) - 1
      inDegree.set(depId, newDegree)
      if (newDegree === 0) {
        queue.push(depId)
      }
    }
  }

  // Append any unvisited concepts (cycle members or disconnected)
  for (const concept of concepts) {
    if (!visited.has(concept.id)) {
      result.push(concept)
    }
  }

  return result
}
