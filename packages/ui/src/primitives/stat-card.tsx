import { ReactNode } from 'react'
import { cn } from '@learn-x/utils'

export interface SpatialStatCardProps {
  label: string
  value: string | number
  sublabel?: ReactNode
  icon: ReactNode
  color?: 'primary' | 'red' | 'emerald' | 'yellow' | 'indigo' | 'orange' | 'purple'
  tone?: 'default' | 'inverse'
  className?: string
}

export function SpatialStatCard({
  label,
  value,
  sublabel,
  icon,
  color = 'primary',
  tone = 'default',
  className,
}: SpatialStatCardProps) {
  const colorStyles = {
    primary:
      'bg-primary/10 text-primary border-primary/20 shadow-[inset_0_0_20px_rgba(59,130,246,0.14)]',
    red: 'bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20 shadow-[inset_0_0_20px_rgba(239,68,68,0.12)]',
    emerald:
      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 shadow-[inset_0_0_20px_rgba(16,185,129,0.12)]',
    yellow:
      'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20 shadow-[inset_0_0_20px_rgba(234,179,8,0.12)]',
    indigo:
      'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20 shadow-[inset_0_0_20px_rgba(99,102,241,0.12)]',
    orange:
      'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20 shadow-[inset_0_0_20px_rgba(249,115,22,0.12)]',
    purple:
      'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 shadow-[inset_0_0_20px_rgba(168,85,247,0.12)]',
  }

  const orbStyles = {
    primary: 'bg-primary/12',
    red: 'bg-red-500/10',
    emerald: 'bg-emerald-500/10',
    yellow: 'bg-yellow-500/10',
    indigo: 'bg-indigo-500/10',
    orange: 'bg-orange-500/10',
    purple: 'bg-purple-500/10',
  }

  return (
    <div
      className={cn(
        tone === 'inverse'
          ? 'paper-dark-card surface-card-hover group relative overflow-hidden p-3 sm:p-5 md:p-6'
          : 'spatial-surface surface-card-hover group relative overflow-hidden p-3 sm:p-5 md:p-6',
        className,
      )}
    >
      <div className="spatial-surface-glow" />

      <div
        className={cn(
          'pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl transition-transform duration-700 group-hover:scale-[1.35]',
          orbStyles[color],
        )}
      />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="space-y-3">
          <p
            className={cn(
              'text-[11px] font-semibold uppercase tracking-[0.24em]',
              tone === 'inverse' ? 'text-slate-400' : 'text-muted-foreground',
            )}
          >
            {label}
          </p>
          <span
            className={cn(
              'block text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl',
              tone === 'inverse' ? 'text-white' : 'text-foreground',
            )}
          >
            {value}
          </span>
          {sublabel && (
            <div
              className={cn(
                'text-sm',
                tone === 'inverse' ? 'text-slate-400' : 'text-muted-foreground',
              )}
            >
              {sublabel}
            </div>
          )}
        </div>

        <div
          className={cn(
            'flex h-9 w-9 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border',
            colorStyles[color],
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}
