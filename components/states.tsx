import type { LucideIcon } from 'lucide-react'
import { CloudOff, Database, KeyRound, WifiOff } from 'lucide-react'
import { errorKind } from '@/lib/errors'
import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-lg bg-line', className)} />
}

export function RowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between rounded-xl border border-line bg-surface p-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  )
}

const ERROR_COPY = {
  setup: {
    icon: Database,
    title: 'Database not set up yet',
    hint: 'Open Supabase > SQL Editor and run scripts/001_create_tables.sql, then scripts/003_fast_sync.sql.',
  },
  config: {
    icon: KeyRound,
    title: 'Supabase keys are invalid',
    hint: 'Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Settings > Vars.',
  },
  network: {
    icon: WifiOff,
    title: 'No connection',
    hint: 'Check your internet connection and try again.',
  },
  unknown: {
    icon: CloudOff,
    title: 'Could not load data',
    hint: 'Please try again in a moment.',
  },
} as const

export function ErrorState({ onRetry, error }: { onRetry: () => void; error?: unknown }) {
  const copy = ERROR_COPY[errorKind(error)]
  const Icon = copy.icon
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface px-6 py-10 text-center"
    >
      <Icon className="size-8 text-danger" aria-hidden="true" />
      <p className="text-sm font-semibold text-ink">{copy.title}</p>
      <p className="text-xs leading-relaxed text-muted text-pretty">{copy.hint}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white active:opacity-80"
      >
        Retry
      </button>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line px-6 py-10 text-center">
      <Icon className="size-8 text-muted" aria-hidden="true" />
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  )
}
