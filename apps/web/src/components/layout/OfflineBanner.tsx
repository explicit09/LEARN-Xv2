'use client'

import { useEffect, useState } from 'react'

/**
 * OfflineBanner: shows a banner when the user loses internet connection.
 * Listens to navigator.onLine + browser online/offline events.
 */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(() => {
    if (typeof window === 'undefined') return false
    return !navigator.onLine
  })

  useEffect(() => {
    const handleOffline = () => setIsOffline(true)
    const handleOnline = () => setIsOffline(false)

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div
      role="status"
      aria-live="assertive"
      className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-950/90 px-4 py-2.5 text-sm text-yellow-200 shadow-lg backdrop-blur-sm"
    >
      <svg
        className="h-4 w-4 shrink-0 text-yellow-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M1 1l22 22" />
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
        <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <circle cx="12" cy="20" r="1" />
      </svg>
      <span>You&apos;re offline — showing cached data</span>
    </div>
  )
}
