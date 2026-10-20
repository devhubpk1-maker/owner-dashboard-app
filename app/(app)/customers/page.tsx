'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { PartyPopper } from 'lucide-react'
import { AppHeader } from '@/components/app-header'
import { EmptyState, ErrorState, RowsSkeleton, Skeleton } from '@/components/states'
import { fetchCustomersDue } from '@/lib/data'
import { formatRs } from '@/lib/format'

export default function CustomersPage() {
  const { data, error, isLoading, mutate } = useSWR('customers-due', fetchCustomersDue, { refreshInterval: 60_000 })
  const total = (data ?? []).reduce((acc, c) => acc + Number(c.total_due ?? 0), 0)

  return (
    <>
      <AppHeader title="Udhaar" backHref="/dashboard" />

      <main className="flex flex-col gap-4 p-4">
        {error && !data ? (
          <ErrorState onRetry={() => mutate()} />
        ) : (
          <>
            {isLoading || !data ? (
              <Skeleton className="h-16 rounded-xl" />
            ) : (
              <div className="rounded-xl bg-danger px-4 py-4 text-center text-base font-bold text-white">
                Total Udhaar: {formatRs(total)}
              </div>
            )}

            {isLoading || !data ? (
              <RowsSkeleton rows={5} />
            ) : data.length === 0 ? (
              <EmptyState icon={PartyPopper} title="No udhaar pending" hint="All customers are settled." />
            ) : (
              <ul className="flex flex-col gap-2">
                {data.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/customers/${c.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 active:bg-line"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{c.name}</p>
                        <p className="mt-0.5 text-xs text-muted">{c.phone || 'No phone'}</p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-danger">{formatRs(c.total_due)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </>
  )
}
