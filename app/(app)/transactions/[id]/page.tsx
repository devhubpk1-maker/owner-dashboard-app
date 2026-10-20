'use client'

import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { Download, MessageCircle, Receipt, Share2 } from 'lucide-react'
import { AppHeader, HeaderButton } from '@/components/app-header'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import { fetchReceipt } from '@/lib/data'
import { formatDateTime, formatRs, invoiceLabel, itemName, itemPrice, paymentLabel } from '@/lib/format'

type ReceiptData = NonNullable<Awaited<ReturnType<typeof fetchReceipt>>>

function buildReceiptText({ sale, shop }: ReceiptData): string {
  const lines = [
    `*${shop?.name ?? 'Deal Heaven'}*`,
    `Invoice: ${invoiceLabel(sale)}`,
    formatDateTime(sale.created_at),
    '',
    ...sale.sale_items.map((item) => `${itemName(item)} x${item.quantity} ${formatRs(item.line_total)}`),
    '─────────────',
    `Total: ${formatRs(sale.total)}`,
    `Payment: ${paymentLabel(sale.payment_method)}`,
    '',
    'Thank you!',
  ]
  return lines.join('\n')
}

function Divider() {
  return <hr className="my-3 border-t border-dashed border-neutral-400" />
}

function TotalRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? 'flex justify-between text-lg font-bold' : 'flex justify-between text-sm'}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>()
  const { data, error, isLoading, mutate } = useSWR(['receipt', id], ([, rid]) => fetchReceipt(rid))

  function shareWhatsApp() {
    if (!data) return
    window.open(`https://wa.me/?text=${encodeURIComponent(buildReceiptText(data))}`, '_blank', 'noopener,noreferrer')
  }

  async function shareNative() {
    if (!data) return
    const text = buildReceiptText(data)
    if (navigator.share) {
      try {
        await navigator.share({ title: invoiceLabel(data.sale), text })
        return
      } catch {
        return
      }
    }
    shareWhatsApp()
  }

  const sale = data?.sale
  const shop = data?.shop
  const discount = Number(sale?.discount ?? 0)
  const tax = Number(sale?.tax ?? 0)
  const subtotal = Number(sale?.subtotal ?? (sale ? sale.total + discount - tax : 0))
  const isUdhaar = (sale?.payment_method ?? '').toLowerCase() === 'udhaar'

  return (
    <>
      <AppHeader
        title="Receipt"
        backHref="/transactions"
        actions={
          data && (
            <HeaderButton label="Share" onClick={shareNative}>
              <Share2 className="size-5" aria-hidden="true" />
            </HeaderButton>
          )
        }
      />

      <main className="flex flex-col gap-4 p-4">
        {error && !data ? (
          <ErrorState error={error} onRetry={() => mutate()} />
        ) : isLoading ? (
          <Skeleton className="h-96 rounded-xl bg-neutral-700" />
        ) : !data || !sale ? (
          <EmptyState icon={Receipt} title="Receipt not found" />
        ) : (
          <>
            <article id="receipt" className="rounded-xl bg-white p-5 text-neutral-900 shadow-lg">
              <header className="text-center">
                <h2 className="text-lg font-bold">{shop?.name ?? 'Deal Heaven'}</h2>
                {shop?.address && <p className="text-xs text-neutral-600">{shop.address}</p>}
                {shop?.phone && <p className="text-xs text-neutral-600">{shop.phone}</p>}
              </header>

              <Divider />

              <div className="flex justify-between text-sm">
                <span className="font-semibold">{invoiceLabel(sale)}</span>
                <span className="text-neutral-600">{formatDateTime(sale.created_at)}</span>
              </div>

              <Divider />

              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-neutral-500">
                    <th className="pb-2 font-medium">Item</th>
                    <th className="pb-2 text-center font-medium">Qty</th>
                    <th className="pb-2 text-right font-medium">Price</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.sale_items.map((item) => (
                    <tr key={item.id} className="align-top">
                      <td className="py-1 pr-2">{itemName(item)}</td>
                      <td className="py-1 text-center tabular-nums">{item.quantity}</td>
                      <td className="py-1 text-right tabular-nums">{itemPrice(item).toLocaleString('en-PK')}</td>
                      <td className="py-1 text-right tabular-nums">{Number(item.line_total).toLocaleString('en-PK')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <Divider />

              <div className="flex flex-col gap-1">
                <TotalRow label="Subtotal" value={formatRs(subtotal)} />
                {discount > 0 && <TotalRow label="Discount" value={`- ${formatRs(discount)}`} />}
                {tax > 0 && <TotalRow label="Tax" value={formatRs(tax)} />}
                <div className="mt-1 border-t border-neutral-300 pt-2">
                  <TotalRow label="TOTAL" value={formatRs(sale.total)} strong />
                </div>
              </div>

              <Divider />

              <div className="flex flex-col gap-1 text-sm">
                <div className="flex justify-between">
                  <span>Payment</span>
                  <span className="font-semibold">{paymentLabel(sale.payment_method)}</span>
                </div>
                {isUdhaar && (
                  <>
                    <div className="flex justify-between">
                      <span>Customer</span>
                      <span className="font-semibold">{sale.customers?.name ?? 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Paid</span>
                      <span className="tabular-nums">{formatRs(sale.paid_amount)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-red-600">
                      <span>Due</span>
                      <span className="tabular-nums">{formatRs(sale.due_amount)}</span>
                    </div>
                  </>
                )}
              </div>

              <p className="mt-5 text-center text-xs text-neutral-500">Thank you for your business</p>
            </article>

            <div className="flex flex-col gap-3 print:hidden">
              <button
                type="button"
                onClick={shareWhatsApp}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-success text-sm font-semibold text-bg active:opacity-80"
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                Share via WhatsApp
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-line text-sm font-semibold text-ink active:opacity-80"
              >
                <Download className="size-4" aria-hidden="true" />
                Download PDF
              </button>
            </div>
          </>
        )}
      </main>
    </>
  )
}
