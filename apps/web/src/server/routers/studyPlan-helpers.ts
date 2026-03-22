import { TRPCError } from '@trpc/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  PlanItem,
  FlashcardSetCandidate,
  LessonCandidate,
  ScoringContext,
} from '@/lib/study-plan/types'
import { buildScoredPlanItems } from '@/lib/study-plan/score-plan-items'

export type { PlanItem } from '@/lib/study-plan/types'

export async function resolveUserId(supabase: SupabaseClient, authId: string): Promise<string> {
  const { data: user, error } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', authId)
    .single()
  if (error || !user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
  return user.id as string
}

export async function resolveWorkspace(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
): Promise<string> {
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('user_id', userId)
    .single()
  if (error || !workspace)
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' })
  return workspace.id as string
}

/** Heartbeat: mark a study plan item as completed by resource ID. */
export async function markPlanItemByResource(
  supabase: SupabaseClient,
  userId: string,
  resourceId: string,
  resourceType: string,
): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  const { data: plan } = await supabase
    .from('study_plans')
    .select('id, items')
    .eq('user_id', userId)
    .eq('date', today)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!plan) return

  const items = (plan.items as PlanItem[]) ?? []
  let changed = false
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!
    if (item.resourceId === resourceId && item.resourceType === resourceType && !item.completed) {
      items[i] = { ...item, completed: true }
      changed = true
      break
    }
  }

  if (changed) {
    await supabase
      .from('study_plans')
      .update({
        items,
        updated_at: new Date().toISOString(),
        heartbeat_at: new Date().toISOString(),
      })
      .eq('id', plan.id)
  }
}

/** Build a scored study plan ranked by urgency, mastery gaps, prerequisites, and exam proximity. */
export async function buildStudyPlanItems(
  supabase: SupabaseClient,
  userId: string,
  workspaceId?: string,
): Promise<PlanItem[]> {
  let workspaceIds: string[] = []
  if (workspaceId) {
    workspaceIds = [workspaceId]
  } else {
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id')
      .eq('user_id', userId)
      .limit(25)
    workspaceIds = (workspaces ?? []).map((w) => w.id as string)
  }

  if (workspaceIds.length === 0) return []

  const now = new Date()

  const [
    flashcardResult,
    lessonResult,
    masteryResult,
    conceptRelResult,
    lessonConceptResult,
    examResult,
  ] = await Promise.all([
    supabase
      .from('flashcard_sets')
      .select(`id, workspace_id, flashcards!inner(id, due_at, lapses, concept_id)`)
      .in('workspace_id', workspaceIds)
      .lte('flashcards.due_at', now.toISOString())
      .limit(10),
    supabase
      .from('lessons')
      .select('id, title, workspace_id, order_index')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .in('workspace_id', workspaceIds)
      .order('order_index', { ascending: true })
      .limit(10),
    supabase.from('mastery_records').select('concept_id, mastery_level').eq('user_id', userId),
    supabase
      .from('concept_relations')
      .select('source_concept_id, target_concept_id, relation_type')
      .eq('relation_type', 'prerequisite'),
    supabase.from('lesson_concepts').select('lesson_id, concept_id'),
    supabase
      .from('study_plans')
      .select('exam_date')
      .eq('user_id', userId)
      .not('exam_date', 'is', null)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const masteryMap = new Map<string, number>()
  for (const r of masteryResult.data ?? []) {
    masteryMap.set(r.concept_id as string, r.mastery_level as number)
  }

  const prerequisiteMap = new Map<string, string[]>()
  for (const r of conceptRelResult.data ?? []) {
    const target = r.target_concept_id as string
    const source = r.source_concept_id as string
    const existing = prerequisiteMap.get(target) ?? []
    existing.push(source)
    prerequisiteMap.set(target, existing)
  }

  const weakConceptIds = new Set<string>()
  for (const [id, level] of masteryMap) {
    if (level < 0.5) weakConceptIds.add(id)
  }

  const lessonConceptMap = new Map<string, string[]>()
  for (const lc of lessonConceptResult.data ?? []) {
    const lid = lc.lesson_id as string
    const cid = lc.concept_id as string
    const existing = lessonConceptMap.get(lid) ?? []
    existing.push(cid)
    lessonConceptMap.set(lid, existing)
  }

  const allLessons = lessonResult.data ?? []
  const maxOrderIndex = allLessons.reduce(
    (max, l) => Math.max(max, (l.order_index as number) ?? 0),
    0,
  )

  const examDays = examResult.data?.exam_date
    ? Math.ceil(
        (new Date(examResult.data.exam_date as string).getTime() - now.getTime()) / 86_400_000,
      )
    : null

  const ctx: ScoringContext = {
    masteryMap,
    prerequisiteMap,
    weakConceptIds,
    examDaysRemaining: examDays,
    maxLessonOrderIndex: Math.max(maxOrderIndex, 1),
  }

  const flashcardSets: FlashcardSetCandidate[] = []
  for (const set of flashcardResult.data ?? []) {
    const cards =
      (set.flashcards as Array<{
        id: string
        due_at: string
        lapses: number
        concept_id: string | null
      }>) ?? []
    if (cards.length === 0) continue
    const overdueDays = cards.map((c) => {
      const due = new Date(c.due_at)
      return Math.max(0, (now.getTime() - due.getTime()) / 86_400_000)
    })
    flashcardSets.push({
      setId: set.id as string,
      workspaceId: set.workspace_id as string,
      dueCount: cards.length,
      avgOverdueDays: overdueDays.reduce((a, b) => a + b, 0) / overdueDays.length,
      avgLapses: cards.reduce((s, c) => s + ((c.lapses as number) ?? 0), 0) / cards.length,
      conceptIds: cards.map((c) => c.concept_id).filter(Boolean) as string[],
    })
  }

  const lessons: LessonCandidate[] = allLessons.map((l) => ({
    lessonId: l.id as string,
    workspaceId: l.workspace_id as string,
    orderIndex: (l.order_index as number) ?? 0,
    conceptIds: lessonConceptMap.get(l.id as string) ?? [],
    title: l.title as string,
  }))

  return buildScoredPlanItems(flashcardSets, lessons, ctx, 5)
}

/** Average mastery_level across all workspace concepts. */
export async function computeReadinessScore(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<number> {
  const { data: mastery } = await supabase
    .from('mastery_records')
    .select('mastery_level')
    .eq('workspace_id', workspaceId)

  if (!mastery?.length) return 0

  const avg =
    mastery.reduce((sum, r) => sum + ((r.mastery_level as number) ?? 0), 0) / mastery.length
  return Math.min(1, Math.max(0, avg))
}
