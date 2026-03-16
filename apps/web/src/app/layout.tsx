import type { Metadata } from 'next'

import { TRPCReactProvider } from '@/lib/trpc/client'
import { ThemeProvider } from '@/components/layout/ThemeProvider'

import './globals.css'

export const metadata: Metadata = {
  title: 'LEARN-X',
  description: 'Turn your course materials into adaptive mastery',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LEARN-X',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
