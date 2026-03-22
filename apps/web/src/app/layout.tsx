import type { Metadata } from 'next'
import { Manrope, Syne } from 'next/font/google'

import { TRPCReactProvider } from '@/lib/trpc/client'
import { ThemeProvider } from '@/components/layout/ThemeProvider'

import './globals.css'

const bodyFont = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
})

const displayFont = Syne({
  subsets: ['latin'],
  variable: '--font-display',
})

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
      <body
        className={`${bodyFont.variable} ${displayFont.variable} font-[family:var(--font-body)]`}
      >
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
