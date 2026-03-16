import { Topbar } from '@/components/layout/Topbar'
import { BarChart3 } from 'lucide-react'

export default function AnalyticsPage() {
  return (
    <>
      <Topbar title="Analytics" />
      <div className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center justify-center">
        <div className="glass-card rounded-3xl border border-border p-16 text-center max-w-md w-full">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-4 border border-primary/20">
            <BarChart3 className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Analytics</h2>
          <p className="text-muted-foreground">
            Detailed learning analytics are coming soon. You&apos;ll be able to track your progress,
            identify weak areas, and see your learning velocity over time.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-full text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Coming Soon
          </div>
        </div>
      </div>
    </>
  )
}
