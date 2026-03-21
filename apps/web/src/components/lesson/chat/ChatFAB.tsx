'use client'

import { MessageSquare } from 'lucide-react'
import { motion } from 'framer-motion'

import { cn } from '@learn-x/utils'

interface ChatFABProps {
  onClick: () => void
  unreadCount: number
  hasMessages: boolean
}

export function ChatFAB({ onClick, unreadCount, hasMessages }: ChatFABProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'flex h-14 w-14 items-center justify-center rounded-full',
        'bg-primary text-primary-foreground shadow-lg',
        'transition-shadow hover:shadow-xl',
      )}
      aria-label="Open lesson chat"
    >
      <MessageSquare className="h-6 w-6" />

      {unreadCount > 0 ? (
        <span
          className={cn(
            'absolute -right-1 -top-1',
            'flex h-5 min-w-5 items-center justify-center',
            'animate-pulse rounded-full bg-red-500 px-1',
            'text-[10px] font-bold text-white',
          )}
        >
          {unreadCount}
        </span>
      ) : hasMessages ? (
        <span className={cn('absolute -right-1 -top-1', 'h-3 w-3 rounded-full bg-green-500')} />
      ) : null}
    </motion.button>
  )
}
