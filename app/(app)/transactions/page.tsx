'use client'

import { useState } from 'react'
import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'
import { Receipt } from 'lucide-react'
import { AppHeader } from '@/components/app-header'
import { SaleRow } from '@/components/sale-row'
import { EmptyState, ErrorState, RowsSkeleton, Skeleton } from '@/components/states'
import { fetchSalesPage, fetchSalesSummary, PAGE_SIZE } from '@/lib/data'
import { formatRs, type DateRange } from '@/lib/format'
import { cn } from '@/lib/utils'

const TABS: Array<{ id: DateRange; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
]

export default function TransactionsPage() {
  const [range, setRange] = useState<DateRange>('today')

  const summary = useSWR(['sales-summary', range], ([, r]) => fetchSalesSummary(r))
  const { data, error, size, setSize, isLoading, isValidating, mutate } = useSWRInfinite(
    (index, previous: unknown[] | null) =>
      previous && previous.length < PAGE_SIZE ? null : (['sales', range, index] as const),
    ([, r, page]) => fetchSalesPage(r, page),
  )

  const sales = data ? data.flat() : []
  const lastPage = data?.[data.length - 1]
  const hasMore = !!lastPage && lastPage.length === PAGE_SIZE
  const loadingMore = isValidating && size > 1 && data?.length !== size

  function retry() {
    mutate()
    summary.mutate()
  }

  return (
    <>
      <AppHeader title="Sales" backHref="/dashboard" />

      <main className="flex flex-col gap-4 p-4">
        <div role="tablist" aria-label="Date filter" className="grid grid-cols-3 gap-1 rounded-xl bg-surface p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={range === tab.id}
              onClick={() => setRange(tab.id)}
              className={cn(
                'rounded-lg py-2 text-sm font-medium transition-colors',
                range === tab.id ? 'bg-brand text-white' : 'text-muted',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-line bg-surface px-4 py-3 text-sm">
          {summary.data ? (
            <>
              <span className="font-bold">{summary.data.count} sales</span>
              <span className="text-muted"> — </span>
              <span className="font-bold text-brand">{formatRs(summary.data.total)}</span>
              <span className="text-muted"> total</span>
            </>
          ) : (
            <Skeleton className="h-5 w-40" />
          )}
        </div>

        {error && !data ? (
          <ErrorState error={error ?? summary.error} onRetry={retry} />
        ) : isLoading ? (
          <RowsSkeleton rows={6} />
        ) : sales.length === 0 ? (
          <EmptyState icon={Receipt} title="No sales in this period" hint="Try a wider date range." />
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {sales.map((sale) => (
                <SaleRow key={sale.id} sale={sale} />
              ))}
            </div>
            {hasMore && (
              <button
                type="button"
                onClick={() => setSize(size + 1)}
                disabled={loadingMore}
                className="h-11 rounded-xl border border-line bg-surface text-sm font-medium text-brand active:bg-line disabled:opacity-60"
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            )}
          </>
        )}
      </main>
    </>
  )
}
