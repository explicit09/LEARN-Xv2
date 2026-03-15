import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { addDocumentSchema, createCourseSchema, joinCourseSchema } from '@learn-x/validators'

import { createTRPCRouter, protectedProcedure } from '../trpc'
import { resolveUserId, resolveOrCreateInstructorProfile } from './course-helpers'
import { getConfusionAnalytics, getAtRiskStudents } from './course-analytics'

export const courseRouter = createTRPCRouter({
  /**
   * Create a course + instructor profile if needed.
   */
  create: protectedProcedure.input(createCourseSchema).mutation(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)
    const instructorId = await resolveOrCreateInstructorProfile(ctx.supabase, userId)

    const { data: course, error } = await ctx.supabase
      .from('courses')
      .insert({
        instructor_id: instructorId,
        title: input.title,
        description: input.description,
        status: 'draft',
      })
      .select('id, title, description, join_code, status, created_at')
      .single()

    if (error || !course)
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message })

    return {
      id: course.id as string,
      title: course.title as string,
      description: course.description as string | null,
      joinCode: course.join_code as string,
      status: course.status as string,
      createdAt: course.created_at as string,
    }
  }),

  /**
   * List instructor's courses.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)

    const { data: profile } = await ctx.supabase
      .from('instructor_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (!profile) return []

    const { data: courses } = await ctx.supabase
      .from('courses')
      .select('id, title, description, join_code, status, created_at')
      .eq('instructor_id', profile.id)
      .order('created_at', { ascending: false })

    if (!courses) return []

    // Get enrollment counts
    const courseIds = courses.map((c) => c.id as string)
    const { data: enrollments } = await ctx.supabase
      .from('course_enrollments')
      .select('course_id')
      .in('course_id', courseIds)
      .eq('status', 'active')

    const countMap: Record<string, number> = {}
    for (const e of enrollments ?? []) {
      const cid = e.course_id as string
      countMap[cid] = (countMap[cid] ?? 0) + 1
    }

    return courses.map((c) => ({
      id: c.id as string,
      title: c.title as string,
      description: c.description as string | null,
      joinCode: c.join_code as string,
      status: c.status as string,
      studentCount: countMap[c.id as string] ?? 0,
      createdAt: c.created_at as string,
    }))
  }),

  /**
   * Get course + enrolled students + documents.
   */
  get: protectedProcedure
    .input(z.object({ courseId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)

      const { data: course } = await ctx.supabase
        .from('courses')
        .select('id, title, description, join_code, status, instructor_id, created_at')
        .eq('id', input.courseId)
        .single()

      if (!course) throw new TRPCError({ code: 'NOT_FOUND', message: 'Course not found' })

      // Verify access: instructor or enrolled student
      const { data: profile } = await ctx.supabase
        .from('instructor_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      const isInstructor = profile && profile.id === course.instructor_id
      if (!isInstructor) {
        const { data: enrollment } = await ctx.supabase
          .from('course_enrollments')
          .select('status')
          .eq('course_id', input.courseId)
          .eq('user_id', userId)
          .maybeSingle()
        if (!enrollment || enrollment.status !== 'active') {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Course not found' })
        }
      }

      const { data: enrollments } = await ctx.supabase
        .from('course_enrollments')
        .select('user_id, enrolled_at, status')
        .eq('course_id', input.courseId)
        .eq('status', 'active')

      const { data: courseDocuments } = await ctx.supabase
        .from('course_documents')
        .select('document_id')
        .eq('course_id', input.courseId)

      return {
        id: course.id as string,
        title: course.title as string,
        description: course.description as string | null,
        joinCode: course.join_code as string,
        status: course.status as string,
        createdAt: course.created_at as string,
        enrolledStudents: (enrollments ?? []).map((e) => ({
          userId: e.user_id as string,
          enrolledAt: e.enrolled_at as string,
        })),
        documentIds: (courseDocuments ?? []).map((d) => d.document_id as string),
      }
    }),

  /**
   * Add a document to a course.
   */
  addDocument: protectedProcedure.input(addDocumentSchema).mutation(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)
    const instructorId = await resolveOrCreateInstructorProfile(ctx.supabase, userId)

    const { data: course } = await ctx.supabase
      .from('courses')
      .select('id')
      .eq('id', input.courseId)
      .eq('instructor_id', instructorId)
      .single()
    if (!course) throw new TRPCError({ code: 'NOT_FOUND', message: 'Course not found' })

    const { error } = await ctx.supabase
      .from('course_documents')
      .insert({ course_id: input.courseId, document_id: input.documentId })

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return { success: true }
  }),

  /**
   * Remove a document from a course.
   */
  removeDocument: protectedProcedure.input(addDocumentSchema).mutation(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)
    const instructorId = await resolveOrCreateInstructorProfile(ctx.supabase, userId)

    const { data: course } = await ctx.supabase
      .from('courses')
      .select('id')
      .eq('id', input.courseId)
      .eq('instructor_id', instructorId)
      .single()
    if (!course) throw new TRPCError({ code: 'NOT_FOUND', message: 'Course not found' })

    await ctx.supabase
      .from('course_documents')
      .delete()
      .eq('course_id', input.courseId)
      .eq('document_id', input.documentId)

    return { success: true }
  }),

  /**
   * Return the join code for sharing with students.
   */
  inviteStudent: protectedProcedure
    .input(z.object({ courseId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.supabase, ctx.user.id)
      const instructorId = await resolveOrCreateInstructorProfile(ctx.supabase, userId)

      const { data: course } = await ctx.supabase
        .from('courses')
        .select('id, join_code')
        .eq('id', input.courseId)
        .eq('instructor_id', instructorId)
        .single()

      if (!course) throw new TRPCError({ code: 'NOT_FOUND', message: 'Course not found' })
      return { joinCode: course.join_code as string }
    }),

  /**
   * Enroll current user in a course by join code.
   */
  join: protectedProcedure.input(joinCourseSchema).mutation(async ({ ctx, input }) => {
    const userId = await resolveUserId(ctx.supabase, ctx.user.id)

    const { data: course } = await ctx.supabase
      .from('courses')
      .select('id, title, status')
      .eq('join_code', input.joinCode)
      .single()

    if (!course) throw new TRPCError({ code: 'NOT_FOUND', message: 'Invalid join code' })
    if (course.status !== 'active') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Course is not accepting new students' })
    }

    const { error } = await ctx.supabase
      .from('course_enrollments')
      .insert({ course_id: course.id, user_id: userId, status: 'active' })

    if (error && !error.message.includes('duplicate')) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    return { courseId: course.id as string, title: course.title as string }
  }),

  getConfusionAnalytics,
  getAtRiskStudents,
})
