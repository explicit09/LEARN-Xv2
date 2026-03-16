'use client'

/**
 * Skip navigation link for screen reader and keyboard users.
 * Place this as the very first element in the body.
 * The target element must have id="main-content".
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:ring-2 focus:ring-primary focus:outline-none"
    >
      Skip to main content
    </a>
  )
}
