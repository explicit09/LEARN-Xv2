'use client'

import Link from 'next/link'

export default function StudyRoomsPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Study Rooms</h1>
        <p className="text-muted-foreground mt-1">Collaborative real-time study sessions</p>
      </div>

      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-4xl mb-4">🧑‍🤝‍🧑</div>
        <h2 className="text-lg font-semibold text-foreground">Study rooms are course-specific</h2>
        <p className="text-muted-foreground mt-1 text-sm max-w-sm">
          Join or create a study room from within a course on the{' '}
          <Link href="/instructor" className="text-primary underline underline-offset-2">
            Instructor
          </Link>{' '}
          page.
        </p>
      </div>
    </div>
  )
}
