import { supabase } from './supabase'
import { toDataError } from './errors'
import { rangeStart, type DateRange } from './format'
import type { Customer, LedgerEntry, Product, Sale, SaleItem, Shop } from './types'

export const PAGE_SIZE = 20

type Result<T> = { data: T | null; error: { message: string; code?: string } | null }

function must<T>(result: Result<T>): T {
  if (result.error) throw toDataError(result.error)
  return (result.data ?? ([] as unknown)) as T
}

function mustMaybe<T>(result: Result<T>): T | null {
  if (result.error) throw toDataError(result.error)
  return result.data ?? null
}

type SaleSummaryRow = Pick<Sale, 'id' | 'invoice_number' | 'total' | 'payment_method' | 'created_at'>

export type Dashboard = {
  salesTotal: number
  transactions: number
  profit: number
  udhaar: number
  recent: SaleSummaryRow[]
  lowStock: Array<Pick<Product, 'id' | 'name' | 'stock_qty' | 'low_stock_threshold'>>
  shopUpdatedAt: string | null
  fetchedAt: number
}

export async function fetchShop(): Promise<Shop | null> {
  return mustMaybe(await supabase.from('shops').select('*').order('id').limit(1).maybeSingle()) as Shop | null
}

const isMissingFunction = (error: { code?: string } | null) => error?.code === 'PGRST202' || error?.code === '42883'

async function dashboardFallback(startAt: string): Promise<Omit<Dashboard, 'fetchedAt'>> {
  const [salesRes, dueRes, recentRes, productsRes, shop] = await Promise.all([
    supabase.from('sales').select('id, total').gte('created_at', startAt),
    supabase.from('customers').select('total_due').gt('total_due', 0),
    supabase
      .from('sales')
      .select('id, invoice_number, total, payment_method, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('products').select('id, name, stock_qty, low_stock_threshold, cost_price'),
    fetchShop().catch(() => null),
  ])
  const sales = must(salesRes) as Array<{ id: string | number; total: number }>
  const allProducts = must(productsRes) as Array<
    Pick<Product, 'id' | 'name' | 'stock_qty' | 'low_stock_threshold'> & { cost_price: number | null }
  >
  const costById = new Map(allProducts.map((p) => [String(p.id), Number(p.cost_price ?? 0)]))
  const items = sales.length
    ? (must(
        await supabase
          .from('sale_items')
          .select('product_id, quantity, line_total')
          .in(
            'sale_id',
            sales.map((s) => s.id),
          ),
      ) as Array<{ product_id: string | number | null; quantity: number; line_total: number }>)
    : []
  const due = must(dueRes) as Array<{ total_due: number }>
  const products = allProducts.map(({ cost_price: _cost, ...p }) => p)

  return {
    salesTotal: sales.reduce((sum, s) => sum + Number(s.total ?? 0), 0),
    transactions: sales.length,
    profit: items.reduce(
      (sum, i) =>
        sum + Number(i.line_total ?? 0) - (costById.get(String(i.product_id)) ?? 0) * Number(i.quantity ?? 0),
      0,
    ),
    udhaar: due.reduce((sum, c) => sum + Number(c.total_due ?? 0), 0),
    recent: must(recentRes) as SaleSummaryRow[],
    lowStock: products
      .filter((p) => Number(p.stock_qty) <= Number(p.low_stock_threshold))
      .sort((a, b) => Number(a.stock_qty) - Number(b.stock_qty))
      .slice(0, 5),
    shopUpdatedAt: shop?.updated_at ?? null,
  }
}

export async function fetchDashboard(): Promise<Dashboard> {
  const startAt = rangeStart('today')
  const rpc = await supabase.rpc('dashboard_summary', { start_at: startAt })
  const data = (
    isMissingFunction(rpc.error) ? await dashboardFallback(startAt) : must(rpc)
  ) as Omit<Dashboard, 'fetchedAt'>
  return {
    salesTotal: Number(data.salesTotal ?? 0),
    transactions: Number(data.transactions ?? 0),
    profit: Number(data.profit ?? 0),
    udhaar: Number(data.udhaar ?? 0),
    recent: data.recent ?? [],
    lowStock: data.lowStock ?? [],
    shopUpdatedAt: data.shopUpdatedAt ?? null,
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
  return must(result) as SaleSummaryRow[]
}

export async function fetchSalesSummary(range: DateRange) {
  const startAt = rangeStart(range)
  const rpc = await supabase.rpc('sales_summary', { start_at: startAt })
  if (isMissingFunction(rpc.error)) {
    const rows = must(await supabase.from('sales').select('total').gte('created_at', startAt)) as Array<{ total: number }>
    return { count: rows.length, total: rows.reduce((sum, s) => sum + Number(s.total ?? 0), 0) }
  }
  const data = must(rpc) as { count: number; total: number }
  return { count: Number(data.count ?? 0), total: Number(data.total ?? 0) }
}

export async function fetchReceipt(id: string) {
  // Fetched without PostgREST embeds so it works even when foreign keys are missing.
  const [saleRes, itemsRes, shop] = await Promise.all([
    supabase.from('sales').select('*').eq('id', id).maybeSingle(),
    supabase.from('sale_items').select('*').eq('sale_id', id),
    fetchShop().catch(() => null),
  ])
  const base = mustMaybe(saleRes) as Sale | null
  if (!base) return null
  const items = must(itemsRes) as SaleItem[]

  const productIds = [...new Set(items.map((i) => i.product_id).filter((v) => v != null))]
  const [productsRes, customerRes] = await Promise.all([
    productIds.length
      ? supabase.from('products').select('id, name, cost_price').in('id', productIds)
      : Promise.resolve({ data: [], error: null }),
    base.customer_id != null
      ? supabase.from('customers').select('name, phone').eq('id', base.customer_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])
  const products = must(productsRes as Result<Array<{ id: unknown; name: string; cost_price: number | null }>>)
  const productById = new Map(products.map((p) => [String(p.id), { name: p.name, cost_price: p.cost_price }]))

  const sale = {
    ...base,
    sale_items: items.map((i) => ({ ...i, products: productById.get(String(i.product_id)) ?? null })),
    customers: mustMaybe(customerRes as Result<{ name: string; phone: string | null }>),
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
  const customer = mustMaybe(customerRes) as Customer | null
  if (!customer) return null

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

  return { customer, ledger }
}
