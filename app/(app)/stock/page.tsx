'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { AlertTriangle, ChevronDown, PartyPopper } from 'lucide-react'
import { AppHeader } from '@/components/app-header'
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/states'
import { fetchProducts } from '@/lib/data'
import { formatRs } from '@/lib/format'
import { cn } from '@/lib/utils'

export default function StockPage() {
  const [showAll, setShowAll] = useState(false)
  const { data, error, isLoading, mutate } = useSWR('products', fetchProducts)

  const lowStock = (data ?? [])
    .filter((p) => Number(p.stock_qty) <= Number(p.low_stock_threshold))
    .sort((a, b) => Number(a.stock_qty) - Number(b.stock_qty))

  return (
    <>
      <AppHeader title="Stock Alerts" backHref="/dashboard" />

      <main className="flex flex-col gap-6 p-4">
        {error && !data ? (
          <ErrorState error={error} onRetry={() => mutate()} />
        ) : isLoading || !data ? (
          <RowsSkeleton rows={6} />
        ) : (
          <>
            <section aria-label="Low stock">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
                Low Stock ({lowStock.length})
              </h2>
              {lowStock.length === 0 ? (
                <EmptyState icon={PartyPopper} title="No stock alerts" hint="Everything is well stocked." />
              ) : (
                <ul className="flex flex-col gap-2">
                  {lowStock.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 rounded-xl border border-danger/30 bg-surface p-4"
                    >
                      <AlertTriangle className="size-5 shrink-0 text-danger" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{p.name}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          Stock: <span className="font-semibold text-danger">{p.stock_qty}</span> / Threshold:{' '}
                          {p.low_stock_threshold}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-label="All products">
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                aria-expanded={showAll}
                className="flex h-11 w-full items-center justify-between rounded-xl border border-line bg-surface px-4 text-sm font-medium active:bg-line"
              >
                <span>
                  {showAll ? 'Hide' : 'Show All'} Products ({data.length})
                </span>
                <ChevronDown className={cn('size-4 transition-transform', showAll && 'rotate-180')} aria-hidden="true" />
              </button>

              {showAll && (
                <ul className="mt-3 flex flex-col gap-2">
                  {data.map((p) => {
                    const qty = Number(p.stock_qty)
                    const tone =
                      qty <= 0
                        ? 'text-danger'
                        : qty <= Number(p.low_stock_threshold)
                          ? 'text-warning'
                          : 'text-success'
                    return (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{p.name}</p>
                          <p className="mt-0.5 truncate text-xs text-muted">
                            {[p.barcode, p.category].filter(Boolean).join(' · ') || 'No details'}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={cn('text-sm font-bold', tone)}>{qty} in stock</p>
                          <p className="mt-0.5 text-xs text-muted">{formatRs(p.sale_price)}</p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </>
  )
}
