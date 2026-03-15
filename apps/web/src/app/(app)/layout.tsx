import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { SkipLink } from '@/components/layout/SkipLink'
import { OfflineBanner } from '@/components/layout/OfflineBanner'
import { createClient } from '@/lib/supabase/server'

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
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main id="main-content" className="flex flex-1 flex-col overflow-auto" tabIndex={-1}>
          {children}
        </main>
      </div>
      <OfflineBanner />
    </>
  )
}
