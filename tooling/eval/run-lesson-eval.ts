// Run lesson quality evaluation against a workspace's lessons.
// Usage: SUPABASE_URL=... SUPABASE_KEY=... tsx run-lesson-eval.ts [workspaceId]

import { createClient } from '@supabase/supabase-js'
import { scoreLesson, type LessonForEval } from './lesson-rubric'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

async function main() {
  const workspaceId = process.argv[2]
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let query = supabase
    .from('lessons')
    .select('id, title, structured_sections, key_takeaways')
    .order('order_index', { ascending: true })

  if (workspaceId) query = query.eq('workspace_id', workspaceId)

  const { data: lessons, error } = await query

  if (error) {
    console.error('Failed to fetch lessons:', error.message)
    process.exit(1)
  }

  if (!lessons?.length) {
    console.log('No lessons found.')
    return
  }

  console.log(`\nEvaluating ${lessons.length} lessons...\n`)
  console.log('─'.repeat(80))

  let totalScore = 0
  const issues: string[] = []

  for (const lesson of lessons) {
    const sections = (lesson.structured_sections as { type: string }[]) ?? []
    const takeaways = (lesson.key_takeaways as string[]) ?? []

    const evalLesson: LessonForEval = {
      title: lesson.title as string,
      sections,
      keyTakeaways: takeaways,
    }

    const score = scoreLesson(evalLesson)
    totalScore += score.total

    const grade = score.total >= 0.8 ? '🟢' : score.total >= 0.6 ? '🟡' : '🔴'

    console.log(`${grade} ${score.total.toFixed(2)}  ${evalLesson.title.substring(0, 60)}`)
    console.log(
      `        sections: ${score.sectionCount}  diversity: ${score.sectionDiversity}  takeaways: ${score.takeawayCount}  quiz: ${score.hasQuiz ? 'yes' : 'NO'}  widget: ${score.hasWidget ? 'yes' : 'no'}  b2b-defs: ${score.backToBackDefinitions}`,
    )

    if (!score.hasTakeaway) issues.push(`${evalLesson.title}: missing key_takeaway`)
    if (!score.hasQuiz) issues.push(`${evalLesson.title}: missing mini_quiz`)
    if (score.backToBackDefinitions > 0)
      issues.push(`${evalLesson.title}: ${score.backToBackDefinitions} back-to-back definitions`)
    if (score.sectionDiversity < 4)
      issues.push(`${evalLesson.title}: low diversity (${score.sectionDiversity} types)`)
  }

  const avg = totalScore / lessons.length
  console.log('─'.repeat(80))
  console.log(`\nAverage score: ${avg.toFixed(2)} / 1.00`)
  console.log(`Grade: ${avg >= 0.8 ? '🟢 GOOD' : avg >= 0.6 ? '🟡 NEEDS IMPROVEMENT' : '🔴 POOR'}`)

  if (issues.length) {
    console.log(`\n${issues.length} issues found:`)
    issues.forEach((i) => console.log(`  - ${i}`))
  } else {
    console.log('\nNo structural issues found.')
  }
}

main().catch(console.error)
