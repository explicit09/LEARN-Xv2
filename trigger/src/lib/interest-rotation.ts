/**
 * Deterministic interest rotation for lesson personalization.
 *
 * Ensures different lessons highlight different interests from the student's
 * profile. Uses a hash-based seed so the same lesson always gets the same
 * selection (stable across re-runs), but different lessons get different ones.
 */

/**
 * Select a subset of interests for a specific lesson.
 *
 * @param allInterests Full list of student interests (e.g. ["basketball", "cooking", "music"])
 * @param lessonIndex  The order index of this lesson in the course (0-based)
 * @param userId       User ID for per-user variation
 * @param maxPick      Maximum interests to select (default 3)
 * @returns A rotated subset of interests, or all if fewer than maxPick
 */
export function selectInterestsForLesson(
  allInterests: string[],
  lessonIndex: number,
  userId: string,
  maxPick = 3,
): string[] {
  if (allInterests.length <= maxPick) return allInterests
  if (allInterests.length === 0) return []

  // Simple deterministic rotation: offset by lessonIndex, hash userId for variety
  const userSeed = simpleHash(userId)
  const offset = (lessonIndex + userSeed) % allInterests.length

  // Rotate the array and take maxPick
  const rotated = [...allInterests.slice(offset), ...allInterests.slice(0, offset)]
  return rotated.slice(0, maxPick)
}

/**
 * Pick the PRIMARY analogy domain for this lesson — the interest that gets
 * used first and most prominently in analogies. Other selected interests
 * can still appear but this one leads.
 */
export function primaryAnalogyDomain(selectedInterests: string[]): string | null {
  return selectedInterests[0] ?? null
}

/** FNV-1a 32-bit hash — fast, deterministic, no crypto dependency. */
function simpleHash(str: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = (hash * 0x01000193) >>> 0
  }
  return hash
}
