export interface StreakDay {
  date: string // YYYY-MM-DD
  hasCompletion: boolean
}

export interface StreakOptions {
  requireCompletion?: boolean
  allowYesterdayStart?: boolean
}

export interface StreakResult {
  currentStreak: number
}

/** Parse a YYYY-MM-DD string into a Date at local midnight. */
function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number) as [number, number, number]
  return new Date(y, m - 1, d)
}

/** Format a Date as YYYY-MM-DD in local time (no UTC drift). */
function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Compute the current study streak from an array of study plan days.
 * Plans must include a `date` (YYYY-MM-DD) and `hasCompletion` flag.
 * Input order does not matter — it will be sorted internally.
 */
export function computeStreak(
  plans: StreakDay[],
  referenceDate: Date = new Date(),
  options: StreakOptions = {},
): StreakResult {
  const { requireCompletion = true, allowYesterdayStart = false } = options

  if (plans.length === 0) return { currentStreak: 0 }

  // Build a set of qualifying dates
  const qualifyingDates = new Set<string>()
  for (const plan of plans) {
    if (requireCompletion && !plan.hasCompletion) continue
    qualifyingDates.add(plan.date)
  }

  if (qualifyingDates.size === 0) return { currentStreak: 0 }

  const todayKey = toDateKey(referenceDate)
  let streak = 0

  // Determine start: today, or yesterday if allowYesterdayStart
  let cursor = parseDate(todayKey)

  if (!qualifyingDates.has(todayKey) && allowYesterdayStart) {
    cursor.setDate(cursor.getDate() - 1)
  } else if (!qualifyingDates.has(todayKey)) {
    return { currentStreak: 0 }
  }

  // Walk backwards counting consecutive qualifying days
  while (qualifyingDates.has(toDateKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  return { currentStreak: streak }
}
