import type { Metadata } from 'next'
import Script from 'next/script'

import { TRPCReactProvider } from '@/lib/trpc/client'

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
      <head>
        {/* Runs before paint: applies stored theme class to prevent FOUC.
            'system' (or unset) → CSS media query handles dark automatically.
            'dark' or 'light' → manual override via class on <html>. */}
        <Script id="theme-init" strategy="beforeInteractive" src="/theme-init.js" />
      </head>
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  )
}
