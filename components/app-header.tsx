import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

interface AppHeaderProps {
  title: string
  backHref?: string
  actions?: React.ReactNode
}

export function AppHeader({ title, backHref, actions }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-bg/90 px-3 backdrop-blur print:hidden">
      {backHref && (
        <Link
          href={backHref}
          aria-label="Back"
          className="flex size-9 items-center justify-center rounded-lg text-ink active:bg-line"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </Link>
      )}
      <h1 className="flex-1 truncate px-1 text-base font-semibold">{title}</h1>
      <div className="flex items-center gap-1">{actions}</div>
    </header>
  )
}

export function HeaderButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded-lg text-muted active:bg-line active:text-ink"
    >
      {children}
    </button>
  )
}
