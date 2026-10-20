export interface Shop {
  name: string | null
  address: string | null
  phone: string | null
  updated_at: string | null
}

export interface Sale {
  id: number | string
  invoice_number: string | number | null
  total: number
  subtotal: number | null
  discount: number | null
  tax: number | null
  payment_method: string | null
  customer_id: number | string | null
  paid_amount: number | null
  due_amount: number | null
  created_at: string
}

export interface SaleItem {
  id: number | string
  sale_id: number | string
  product_name?: string | null
  name?: string | null
  quantity: number
  unit_price?: number | null
  price?: number | null
  line_total: number
  products?: { name: string | null; cost_price: number | null } | null
}

export interface Product {
  id: number | string
  name: string
  barcode: string | null
  category: string | null
  stock_qty: number
  low_stock_threshold: number
  sale_price: number
}

export interface Customer {
  id: number | string
  name: string
  phone: string | null
  total_due: number
}

export interface LedgerEntry {
  key: string
  kind: 'credit' | 'payment'
  amount: number
  date: string
  label: string
  saleId?: number | string
}
