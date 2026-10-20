'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { AlertTriangle, LogOut, PartyPopper, Receipt, RefreshCw } from 'lucide-react'
import { AppHeader, HeaderButton } from '@/components/app-header'
import { SaleRow } from '@/components/sale-row'
import { useLiveStatus } from '@/components/data-provider'
import { EmptyState, ErrorState, RowsSkeleton, Skeleton } from '@/components/states'
import { endSession } from '@/lib/auth'
import { fetchDashboard } from '@/lib/data'
import { formatRs, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line border-l-4 border-l-brand bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 text-xl font-bold tabular-nums">{value}</p>
    </div>
  )
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      <Link href={href} className="text-sm font-medium text-brand">
        View All
      </Link>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { data, error, isLoading, isValidating, mutate } = useSWR('dashboard', fetchDashboard)
  const live = useLiveStatus()

  function logout() {
    endSession()
    router.replace('/login')
  }

  return (
    <>
      <AppHeader
        title="Deal Heaven POS"
        actions={
          <>
            <HeaderButton label="Refresh" onClick={() => mutate()}>
              <RefreshCw className={cn('size-5', isValidating && 'animate-spin')} aria-hidden="true" />
            </HeaderButton>
            <HeaderButton label="Log out" onClick={logout}>
              <LogOut className="size-5" aria-hidden="true" />
            </HeaderButton>
          </>
        }
      />

      <main className="flex flex-col gap-6 p-4">
        {error && !data ? (
          <ErrorState error={error} onRetry={() => mutate()} />
        ) : (
          <>
            <section aria-label="Today's stats" className="grid grid-cols-2 gap-3">
              {isLoading || !data ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[92px] rounded-xl" />)
              ) : (
                <>
                  <StatCard label="Today's Sales" value={formatRs(data.salesTotal)} />
                  <StatCard label="Transactions" value={String(data.transactions)} />
                  <StatCard label="Today's Profit" value={formatRs(Math.round(data.profit))} />
                  <StatCard label="Udhaar Outstanding" value={formatRs(data.udhaar)} />
                </>
              )}
            </section>

            <section aria-label="Recent sales">
              <SectionHeader title="Recent Sales" href="/transactions" />
              {isLoading || !data ? (
                <RowsSkeleton rows={3} />
              ) : data.recent.length === 0 ? (
                <EmptyState icon={Receipt} title="No sales today yet" hint="New sales will show up here." />
              ) : (
                <div className="flex flex-col gap-2">
                  {data.recent.map((sale) => (
                    <SaleRow key={sale.id} sale={sale} />
                  ))}
                </div>
              )}
            </section>

            <section aria-label="Low stock alerts">
              <SectionHeader title="Low Stock Alerts" href="/stock" />
              {isLoading || !data ? (
                <RowsSkeleton rows={2} />
              ) : data.lowStock.length === 0 ? (
                <EmptyState icon={PartyPopper} title="No stock alerts" hint="Everything is well stocked." />
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.lowStock.slice(0, 5).map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <AlertTriangle className="size-4 shrink-0 text-danger" aria-hidden="true" />
                        <span className="truncate text-sm font-medium">{p.name}</span>
                      </span>
                      <span className="shrink-0 text-sm font-bold text-danger">{p.stock_qty} left</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {data && (
              <p className="flex items-center justify-center gap-2 pb-2 text-center text-xs text-muted">
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-2 rounded-full',
                    live === 'live' ? 'bg-brand' : live === 'connecting' ? 'animate-pulse bg-muted' : 'bg-danger',
                  )}
                />
                <span>
                  {live === 'live' ? 'Live' : live === 'connecting' ? 'Connecting' : 'Auto-refresh'}
                  {' · '}Last synced: {timeAgo(data.fetchedAt)}
                </span>
              </p>
            )}
          </>
        )}
      </main>
    </>
  )
}
