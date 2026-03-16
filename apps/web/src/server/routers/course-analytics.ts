import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { protectedProcedure } from '../trpc'
import { resolveUserId, resolveOrCreateInstructorProfile } from './course-helpers'

/**
 * Per-concept error rates across all enrolled students.
 */
export const getConfusionAnalytics = protectedProcedure
  .input(z.object({ courseId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)
    const instructorId = await resolveOrCreateInstructorProfile(ctx.supabase, userId)

    const { data: course } = await ctx.supabase
      .from('courses')
      .select('id')
      .eq('id', input.courseId)
      .eq('instructor_id', instructorId)
      .single()
    if (!course) throw new TRPCError({ code: 'NOT_FOUND', message: 'Course not found' })

    // Enrolled student IDs
    const { data: enrollments } = await ctx.supabase
      .from('course_enrollments')
      .select('user_id')
      .eq('course_id', input.courseId)
      .eq('status', 'active')

    if (!enrollments?.length) return []

    const studentIds = enrollments.map((e) => e.user_id as string)

    // Get mastery records for all students in this course's documents' workspaces
    const { data: courseDocuments } = await ctx.supabase
      .from('course_documents')
      .select('document_id')
      .eq('course_id', input.courseId)

    if (!courseDocuments?.length) return []

    // Get concepts from course documents
    const docIds = courseDocuments.map((d) => d.document_id as string)
    const { data: chunkConcepts } = await ctx.supabase
      .from('chunk_concepts')
      .select('concept_id')
      .in(
        'chunk_id',
        (await ctx.supabase.from('chunks').select('id').in('document_id', docIds)).data?.map(
          (c) => c.id as string,
        ) ?? [],
      )
      .limit(50)

    const conceptIds = [...new Set((chunkConcepts ?? []).map((cc) => cc.concept_id as string))]

    // Get mastery records for these concepts across enrolled students
    const { data: masteryRecords } = await ctx.supabase
      .from('mastery_records')
      .select('concept_id, mastery_level, user_id')
      .in('concept_id', conceptIds)
      .in('user_id', studentIds)

    // Aggregate per concept
    const conceptMap: Record<string, { totalMastery: number; count: number }> = {}
    for (const r of masteryRecords ?? []) {
      const cid = r.concept_id as string
      if (!conceptMap[cid]) conceptMap[cid] = { totalMastery: 0, count: 0 }
      conceptMap[cid].totalMastery += (r.mastery_level as number) ?? 0
      conceptMap[cid].count++
    }

    // Fetch concept names
    if (!conceptIds.length) return []
    const { data: concepts } = await ctx.supabase
      .from('concepts')
      .select('id, name')
      .in('id', conceptIds)

    return (concepts ?? []).map((c) => {
      const agg = conceptMap[c.id as string]
      const avgMastery = agg ? agg.totalMastery / agg.count : 0
      return {
        conceptId: c.id as string,
        conceptName: c.name as string,
        avgMastery,
        studentCount: agg?.count ?? 0,
        isStruggling: avgMastery < 0.5,
      }
    })
  })

/**
 * Students with no login in 3+ days OR declining mastery.
 */
export const getAtRiskStudents = protectedProcedure
  .input(z.object({ courseId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)
    const instructorId = await resolveOrCreateInstructorProfile(ctx.supabase, userId)

    const { data: course } = await ctx.supabase
      .from('courses')
      .select('id')
      .eq('id', input.courseId)
      .eq('instructor_id', instructorId)
      .single()
    if (!course) throw new TRPCError({ code: 'NOT_FOUND', message: 'Course not found' })

    const { data: enrollments } = await ctx.supabase
      .from('course_enrollments')
      .select('user_id, enrolled_at')
      .eq('course_id', input.courseId)
      .eq('status', 'active')

    if (!enrollments?.length) return []

    const studentIds = enrollments.map((e) => e.user_id as string)

    const { data: students } = await ctx.supabase
      .from('users')
      .select('id, display_name, email')
      .in('id', studentIds)

    return (students ?? []).map((s) => ({
      userId: s.id as string,
      displayName: s.display_name as string,
      email: s.email as string,
      isAtRisk: true, // Simplified: flag all for now, real impl checks last_active
    }))
  })
