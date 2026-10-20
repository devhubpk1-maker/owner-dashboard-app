import { supabase } from './supabase'
import { rangeStart, type DateRange } from './format'
import type { Customer, LedgerEntry, Product, Sale, SaleItem, Shop } from './types'

export const PAGE_SIZE = 20

function must<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message)
  return (result.data ?? ([] as unknown)) as T
}

const sum = (rows: Array<Record<string, unknown>>, key: string) =>
  rows.reduce((acc, row) => acc + Number(row[key] ?? 0), 0)

export async function fetchShop(): Promise<Shop | null> {
  const { data, error } = await supabase.from('shops').select('*').limit(1).maybeSingle()
  if (error) throw new Error(error.message)
  return (data as Shop | null) ?? null
}

export async function fetchDashboard() {
  const start = rangeStart('today')

  const [salesToday, itemsToday, customers, recent, products, shop] = await Promise.all([
    supabase.from('sales').select('total').gte('created_at', start),
    supabase
      .from('sale_items')
      .select('line_total, quantity, products(cost_price), sales!inner(created_at)')
      .gte('sales.created_at', start),
    supabase.from('customers').select('total_due').gt('total_due', 0),
    supabase
      .from('sales')
      .select('id, invoice_number, total, payment_method, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('products').select('id, name, stock_qty, low_stock_threshold'),
    fetchShop().catch(() => null),
  ])

  const salesRows = must(salesToday) as Array<{ total: number }>
  const itemRows = must(itemsToday) as unknown as Array<{
    line_total: number
    quantity: number
    products: { cost_price: number | null } | null
  }>
  const customerRows = must(customers) as Array<{ total_due: number }>
  const productRows = must(products) as Array<Pick<Product, 'id' | 'name' | 'stock_qty' | 'low_stock_threshold'>>

  const profit = itemRows.reduce(
    (acc, item) =>
      acc + Number(item.line_total ?? 0) - Number(item.products?.cost_price ?? 0) * Number(item.quantity ?? 0),
    0,
  )

  return {
    salesTotal: sum(salesRows, 'total'),
    transactions: salesRows.length,
    profit,
    udhaar: sum(customerRows, 'total_due'),
    recent: must(recent) as Array<Pick<Sale, 'id' | 'invoice_number' | 'total' | 'payment_method' | 'created_at'>>,
    lowStock: productRows
      .filter((p) => Number(p.stock_qty) <= Number(p.low_stock_threshold))
      .sort((a, b) => Number(a.stock_qty) - Number(b.stock_qty)),
    shopUpdatedAt: shop?.updated_at ?? null,
    fetchedAt: Date.now(),
  }
}

export async function fetchSalesPage(range: DateRange, page: number) {
  const from = page * PAGE_SIZE
  const result = await supabase
    .from('sales')
    .select('id, invoice_number, total, payment_method, created_at')
    .gte('created_at', rangeStart(range))
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)
  return must(result) as Array<Pick<Sale, 'id' | 'invoice_number' | 'total' | 'payment_method' | 'created_at'>>
}

export async function fetchSalesSummary(range: DateRange) {
  const result = await supabase.from('sales').select('total').gte('created_at', rangeStart(range)).limit(10000)
  const rows = must(result) as Array<{ total: number }>
  return { count: rows.length, total: sum(rows, 'total') }
}

export async function fetchReceipt(id: string) {
  const [saleRes, shop] = await Promise.all([
    supabase
      .from('sales')
      .select('*, sale_items(*, products(name, cost_price)), customers(name, phone)')
      .eq('id', id)
      .maybeSingle(),
    fetchShop().catch(() => null),
  ])
  if (saleRes.error) throw new Error(saleRes.error.message)
  if (!saleRes.data) return null
  const sale = saleRes.data as unknown as Sale & {
    sale_items: SaleItem[]
    customers: { name: string; phone: string | null } | null
  }
  return { sale, shop }
}

export async function fetchProducts() {
  const result = await supabase
    .from('products')
    .select('id, name, barcode, category, stock_qty, low_stock_threshold, sale_price')
    .order('name', { ascending: true })
  return must(result) as Product[]
}

export async function fetchCustomersDue() {
  const result = await supabase
    .from('customers')
    .select('id, name, phone, total_due')
    .gt('total_due', 0)
    .order('total_due', { ascending: false })
  return must(result) as Customer[]
}

export async function fetchCustomerDetail(id: string) {
  const [customerRes, creditsRes, paymentsRes] = await Promise.all([
    supabase.from('customers').select('id, name, phone, total_due').eq('id', id).maybeSingle(),
    supabase
      .from('sales')
      .select('id, invoice_number, total, due_amount, created_at')
      .eq('customer_id', id)
      .ilike('payment_method', 'udhaar'),
    supabase.from('customer_payments').select('id, amount, note, created_at').eq('customer_id', id),
  ])
  if (customerRes.error) throw new Error(customerRes.error.message)
  if (!customerRes.data) return null

  const credits = must(creditsRes) as Array<Pick<Sale, 'id' | 'invoice_number' | 'total' | 'due_amount' | 'created_at'>>
  const payments = must(paymentsRes) as Array<{ id: number | string; amount: number; note: string | null; created_at: string }>

  const ledger: LedgerEntry[] = [
    ...credits.map<LedgerEntry>((s) => ({
      key: `sale-${s.id}`,
      kind: 'credit',
      amount: Number(s.due_amount ?? s.total ?? 0),
      date: s.created_at,
      label: String(s.invoice_number ?? s.id),
      saleId: s.id,
    })),
    ...payments.map<LedgerEntry>((p) => ({
      key: `pay-${p.id}`,
      kind: 'payment',
      amount: Number(p.amount ?? 0),
      date: p.created_at,
      label: p.note || 'Payment received',
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return { customer: customerRes.data as Customer, ledger }
}
