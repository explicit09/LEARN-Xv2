import { Headphones } from 'lucide-react'

export default function PodcastsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Podcasts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Listen to AI-generated podcast conversations about your lessons
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 py-24">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
          <Headphones className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">Coming Soon</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm text-center">
          AI-generated podcasts from your course materials are on the way. Stay tuned!
        </p>
      </div>
    </div>
  )
}
