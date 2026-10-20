import Link from 'next/link'
import { cn } from '@/lib/utils'
import { formatDateTime, formatRs, invoiceLabel, paymentLabel, paymentStyle } from '@/lib/format'
import type { Sale } from '@/lib/types'

export function PaymentBadge({ method }: { method: string | null }) {
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', paymentStyle(method))}>
      {paymentLabel(method)}
    </span>
  )
}

export function SaleRow({ sale }: { sale: Pick<Sale, 'id' | 'invoice_number' | 'total' | 'payment_method' | 'created_at'> }) {
  return (
    <Link
      href={`/transactions/${sale.id}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 active:bg-line"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm font-bold">{invoiceLabel(sale)}</span>
        <span className="text-xs text-muted">{formatDateTime(sale.created_at)}</span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="text-sm font-semibold">{formatRs(sale.total)}</span>
        <PaymentBadge method={sale.payment_method} />
      </div>
    </Link>
  )
}
