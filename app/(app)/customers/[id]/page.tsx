'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { BookOpen, MessageCircle, Phone } from 'lucide-react'
import { AppHeader } from '@/components/app-header'
import { EmptyState, ErrorState, RowsSkeleton, Skeleton } from '@/components/states'
import { fetchCustomerDetail } from '@/lib/data'
import { formatDateTime, formatRs, whatsappNumber } from '@/lib/format'
import type { LedgerEntry } from '@/lib/types'
import { cn } from '@/lib/utils'

function LedgerRow({ entry }: { entry: LedgerEntry }) {
  const credit = entry.kind === 'credit'
  const content = (
    <>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{entry.label}</p>
        <p className="mt-0.5 text-xs text-muted">
          {credit ? 'Credit sale' : 'Payment'} · {formatDateTime(entry.date)}
        </p>
      </div>
      <span className={cn('shrink-0 text-sm font-bold', credit ? 'text-danger' : 'text-success')}>
        {credit ? '+' : '-'} {formatRs(entry.amount)}
      </span>
    </>
  )
  const className = 'flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4'

  return credit && entry.saleId !== undefined ? (
    <Link href={`/transactions/${entry.saleId}`} className={cn(className, 'active:bg-line')}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  )
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, error, isLoading, mutate } = useSWR(['customer', id], ([, cid]) => fetchCustomerDetail(cid))

  const customer = data?.customer
  const whatsappHref = customer?.phone
    ? `https://wa.me/${whatsappNumber(customer.phone)}?text=${encodeURIComponent(
        `Assalam o Alaikum ${customer.name}, aapka Deal Heaven par ${formatRs(customer.total_due)} baqi hai. Shukria.`,
      )}`
    : undefined

  return (
    <>
      <AppHeader title="Customer" backHref="/customers" />

      <main className="flex flex-col gap-5 p-4">
        {error && !data ? (
          <ErrorState onRetry={() => mutate()} />
        ) : isLoading ? (
          <>
            <Skeleton className="h-28 rounded-xl" />
            <RowsSkeleton rows={4} />
          </>
        ) : !data || !customer ? (
          <EmptyState icon={BookOpen} title="Customer not found" />
        ) : (
          <>
            <section className="rounded-xl border border-line bg-surface p-5 text-center">
              <h2 className="text-lg font-bold">{customer.name}</h2>
              <p className="mt-0.5 text-sm text-muted">{customer.phone || 'No phone'}</p>
              <p className="mt-4 text-xs text-muted">Total due</p>
              <p className="text-3xl font-bold tabular-nums text-danger">{formatRs(customer.total_due)}</p>
            </section>

            <div className="grid grid-cols-2 gap-3">
              <a
                href={customer.phone ? `tel:${customer.phone}` : undefined}
                aria-disabled={!customer.phone}
                className={cn(
                  'flex h-12 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-white active:opacity-80',
                  !customer.phone && 'pointer-events-none opacity-40',
                )}
              >
                <Phone className="size-4" aria-hidden="true" />
                Call
              </a>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!whatsappHref}
                className={cn(
                  'flex h-12 items-center justify-center gap-2 rounded-xl bg-success text-sm font-semibold text-bg active:opacity-80',
                  !whatsappHref && 'pointer-events-none opacity-40',
                )}
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                WhatsApp
              </a>
            </div>

            <section aria-label="Ledger">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Ledger</h2>
              {data.ledger.length === 0 ? (
                <EmptyState icon={BookOpen} title="No ledger history yet" />
              ) : (
                <div className="flex flex-col gap-2">
                  {data.ledger.map((entry) => (
                    <LedgerRow key={entry.key} entry={entry} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  )
}
