import type { Metadata } from 'next'

import { TRPCReactProvider } from '@/lib/trpc/client'

import './globals.css'

export const metadata: Metadata = {
  title: 'LEARN-X',
  description: 'Turn your course materials into adaptive mastery',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  )
}
