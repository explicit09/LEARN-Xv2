import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LessonDetailClient } from './LessonDetailClient'

interface PageProps {
  params: Promise<{ id: string; lessonId: string }>
}

export default async function LessonPage({ params }: PageProps) {
  const { id: workspaceId, lessonId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <LessonDetailClient workspaceId={workspaceId} lessonId={lessonId} />
}
