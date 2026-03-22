import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { SkipLink } from '@/components/layout/SkipLink'
import { OfflineBanner } from '@/components/layout/OfflineBanner'
import { createClient } from '@/lib/supabase/server'
import { Toaster } from 'sonner'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <>
      <SkipLink />
      <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground transition-colors duration-300">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-[-10%] left-[-10%] h-[50%] w-[50%] rounded-full bg-blue-600/5 blur-[120px] mix-blend-screen" />
          <div className="absolute right-[-10%] top-[20%] h-[40%] w-[40%] rounded-full bg-purple-600/5 blur-[120px] mix-blend-screen" />
          <div className="absolute bottom-[-10%] left-[20%] h-[60%] w-[60%] rounded-full bg-indigo-600/5 blur-[120px] mix-blend-screen" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02] bg-repeat" />
        </div>

        <div className="relative flex min-h-screen">
          <Sidebar />
          <main
            id="main-content"
            className="flex min-h-screen flex-1 flex-col overflow-y-auto pb-24 md:pb-0"
            tabIndex={-1}
          >
            {children}
          </main>
        </div>
      </div>
      <OfflineBanner />
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: 'bg-card border-border text-foreground',
        }}
      />
    </>
  )
}
