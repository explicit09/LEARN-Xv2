'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc/client'
import { LessonRenderer } from '@/components/lesson/LessonRenderer'
import type { LessonSection } from '@learn-x/validators'
import { BookOpen, CheckCircle, ChevronLeft, ChevronRight, PlayCircle } from 'lucide-react'
import { Button } from '@learn-x/ui'

interface LessonDetailClientProps {
  workspaceId: string
  lessonId: string
}

export function LessonDetailClient({ workspaceId, lessonId }: LessonDetailClientProps) {
  const {
    data: lesson,
    isLoading,
    error,
  } = trpc.lesson.get.useQuery({
    id: lessonId,
    workspaceId,
  })
  const { data: allLessons } = trpc.lesson.list.useQuery({ workspaceId })
  const utils = trpc.useUtils()

  const markComplete = trpc.lesson.markComplete.useMutation({
    onSuccess: () => {
      void utils.lesson.get.invalidate({ id: lessonId, workspaceId })
      void utils.lesson.list.invalidate({ workspaceId })
    },
  })

  if (isLoading) {
    return (
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto p-4 md:p-8 animate-pulse">
        <div className="w-64 h-96 bg-muted/50 rounded-2xl hidden md:block mr-8" />
        <div className="flex-1 space-y-4">
           <div className="h-10 bg-muted/50 rounded-xl w-1/3" />
           <div className="h-64 bg-card/50 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (error || !lesson) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center glass-card p-12 rounded-3xl max-w-md w-full">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Lesson not found</h2>
          <p className="text-sm text-muted-foreground mb-6">This lesson may have been deleted or is unavailable.</p>
          <Button asChild className="w-full h-11 rounded-xl font-semibold">
            <Link href={`/workspace/${workspaceId}?tab=lessons`}>Back to Workspace</Link>
          </Button>
        </div>
      </div>
    )
  }

  const sortedLessons = (allLessons ?? []).sort(
    (a, b) => (a.order_index as number) - (b.order_index as number),
  )
  const currentIndex = sortedLessons.findIndex((l) => l.id === lessonId)
  const prevLesson = currentIndex > 0 ? sortedLessons[currentIndex - 1] : null
  const nextLesson = currentIndex < sortedLessons.length - 1 ? sortedLessons[currentIndex + 1] : null

  const progressPercent = Math.round(((currentIndex + 1) / Math.max(1, sortedLessons.length)) * 100)

  // Count meaningful sections for progress display (exclude plain text)
  const sections = (lesson.structuredSections as LessonSection[]) ?? []
  const sectionCount = sections.length
  const sectionTypes = sections.filter((s) => s.type !== 'text').map((s) => s.type)

  return (
    <div className="flex-1 flex flex-col md:flex-row max-w-[1600px] w-full mx-auto p-4 lg:p-8 gap-8 overflow-hidden">
      
      {/* Left Sidebar - Table of Contents */}
      <div className="hidden md:flex w-72 flex-col gap-6 overflow-y-auto pr-2 pb-8 custom-scrollbar">
        <Link 
          href={`/workspace/${workspaceId}?tab=lessons`}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
        >
          <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </div>
          Back to overview
        </Link>
        
        <div className="space-y-4">
          <h3 className="font-bold text-sm tracking-wider uppercase text-muted-foreground ml-1">This Lesson</h3>
          <div className="space-y-1 relative before:absolute before:inset-y-2 before:left-[11px] before:w-px before:bg-border">
            {sortedLessons.map((l, idx) => {
              const isActive = l.id === lessonId;
              const isPast = idx < currentIndex;
              return (
                <Link
                  key={l.id}
                  href={`/workspace/${workspaceId}/lesson/${l.id}`}
                  className={`flex items-start gap-4 p-2 rounded-xl transition-all relative z-10 ${
                    isActive ? 'bg-primary/5 text-primary' : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className={`shrink-0 w-6 h-6 rounded-full mt-0.5 flex items-center justify-center border-2 bg-background ${
                    isActive ? 'border-primary' : 
                    isPast ? 'border-emerald-500 text-emerald-500' : 'border-border text-transparent'
                  }`}>
                    {isPast ? <CheckCircle className="w-3.5 h-3.5" /> : <span className="w-2 h-2 rounded-full bg-primary" style={{ display: isActive ? 'block' : 'none' }} />}
                  </div>
                  <span className={`text-sm font-medium leading-relaxed line-clamp-2 ${isActive ? 'font-semibold' : ''}`}>
                    {l.title}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
        
        {/* Workspace Quick Stats */}
        <div className="mt-8 glass-card rounded-2xl p-4 border border-border">
           <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Workspace Progress</h4>
           <div className="flex items-end justify-between mb-2">
             <span className="text-2xl font-black">{progressPercent}%</span>
             <span className="text-xs font-medium text-muted-foreground">{currentIndex + 1} of {sortedLessons.length}</span>
           </div>
           <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
             <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-24 lg:pb-12 scroll-smooth custom-scrollbar pr-2 lg:pr-8">
        
        {/* Header Breadcrumbs & Status */}
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
             <BookOpen className="w-4 h-4" />
             <span className="hover:text-foreground cursor-pointer transition-colors">Workspace</span>
             <span>/</span>
             <span className="text-foreground">{lesson.title}</span>
           </div>
           
           <div className="flex items-center gap-3">
             <div className="hidden sm:flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
               <span className="font-bold mr-1">{sectionCount} sections</span>
               {sectionTypes.slice(0, 8).map((type, i) => {
                 const colors: Record<string, string> = {
                   concept_definition: 'bg-blue-500',
                   analogy_card: 'bg-emerald-500',
                   process_flow: 'bg-indigo-500',
                   mini_quiz: 'bg-amber-500',
                   comparison_table: 'bg-violet-500',
                   timeline: 'bg-amber-400',
                   key_takeaway: 'bg-primary',
                   concept_bridge: 'bg-sky-400',
                   quote_block: 'bg-gray-400',
                   code_explainer: 'bg-orange-500',
                 }
                 return <span key={i} className={`w-2 h-2 rounded-full ${colors[type] ?? 'bg-muted-foreground'}`} />
               })}
             </div>
             <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
                <PlayCircle className="w-3.5 h-3.5" />
                ~15 min read
             </div>
             {lesson.isCompleted && (
               <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Completed
               </div>
             )}
           </div>
        </div>

        {/* Title Block */}
        <div className="mb-10 lg:mb-16 max-w-4xl">
           <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-6">
             {lesson.title}
           </h1>
           {lesson.summary && (
             <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl">
               {lesson.summary}
             </p>
           )}
        </div>

        {/* Dynamic Content Wrapper */}
        <div className="prose prose-lg dark:prose-invert max-w-5xl w-full prose-headings:font-bold prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6 prose-p:leading-relaxed prose-p:text-muted-foreground prose-a:text-primary">
          <LessonRenderer sections={lesson.structuredSections as LessonSection[]} />
        </div>

        {/* Footer Navigation */}
        <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-6 max-w-5xl w-full">
          <div>
            {!lesson.isCompleted && (
              <Button
                size="lg"
                onClick={() => markComplete.mutate({ id: lessonId, workspaceId })}
                disabled={markComplete.isPending}
                className="rounded-xl px-8 font-bold shadow-[0_0_20px_rgba(37,99,235,0.4)] h-12"
              >
                {markComplete.isPending ? 'Saving...' : 'Mark as Complete'}
                <CheckCircle className="ml-2 w-5 h-5" />
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {prevLesson && (
              <Button asChild variant="outline" className="glass h-12 rounded-xl px-6 font-semibold">
                <Link href={`/workspace/${workspaceId}/lesson/${prevLesson.id as string}`}>
                  <ChevronLeft className="mr-2 w-4 h-4" />
                  Previous
                </Link>
              </Button>
            )}
            {nextLesson && (
              <Button asChild className="h-12 rounded-xl px-6 font-semibold shadow-lg">
                <Link href={`/workspace/${workspaceId}/lesson/${nextLesson.id as string}`}>
                  Next Lesson
                  <ChevronRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
