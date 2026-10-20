import type { Sale, SaleItem } from './types'

export function formatRs(value: number | string | null | undefined): string {
  return `Rs. ${Number(value ?? 0).toLocaleString('en-PK')}`
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const month = d.toLocaleString('en-GB', { month: 'short' })
  const time = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${d.getDate()} ${month}, ${time}`
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export function timeAgo(iso: string | number): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.max(0, Math.floor(diffMs / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

export type DateRange = 'today' | 'week' | 'month'

export function rangeStart(range: DateRange): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  if (range === 'week') {
    const offset = (d.getDay() + 6) % 7
    d.setDate(d.getDate() - offset)
  }
  if (range === 'month') d.setDate(1)
  return d.toISOString()
}

export function invoiceLabel(sale: Pick<Sale, 'id' | 'invoice_number'>): string {
  const n = sale.invoice_number
  if (typeof n === 'string' && n.length > 0) return n
  const num = typeof n === 'number' ? n : Number(sale.id)
  return Number.isFinite(num) ? `INV-${String(num).padStart(5, '0')}` : `INV-${String(sale.id).slice(0, 6).toUpperCase()}`
}

export function itemName(item: SaleItem): string {
  return item.product_name ?? item.name ?? item.products?.name ?? 'Item'
}

export function itemPrice(item: SaleItem): number {
  return Number(item.unit_price ?? item.price ?? 0)
}

const PAYMENT_STYLES: Record<string, string> = {
  cash: 'bg-success/15 text-success',
  card: 'bg-blue-500/15 text-blue-400',
  easypaisa: 'bg-purple-500/15 text-purple-400',
  jazzcash: 'bg-orange-500/15 text-orange-400',
  udhaar: 'bg-danger/15 text-danger',
}

export function paymentStyle(method: string | null | undefined): string {
  return PAYMENT_STYLES[(method ?? '').toLowerCase().replace(/\s+/g, '')] ?? 'bg-line text-muted'
}

export function paymentLabel(method: string | null | undefined): string {
  const key = (method ?? '').toLowerCase().replace(/\s+/g, '')
  const labels: Record<string, string> = {
    cash: 'Cash',
    card: 'Card',
    easypaisa: 'EasyPaisa',
    jazzcash: 'JazzCash',
    udhaar: 'Udhaar',
  }
  return labels[key] ?? method ?? 'Unknown'
}

export function whatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('92')) return digits
  return `92${digits.replace(/^0+/, '')}`
}
