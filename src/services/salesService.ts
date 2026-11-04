import { supabase } from '../lib/supabase'

export type SaleProduct = {
  id: string
  name: string
  quantity: number
  purchase_price: number
  suggested_sale_price: number | null
}

export type Sale = {
  id: string
  product_id: string
  buyer_name: string | null
  buyer_phone: string | null
  sale_date: string
  quantity: number
  unit_price: number
  total_amount: number
  marketplace: string | null
  status: string
  notes: string | null
  unit_cost_snapshot: number
  profit_amount: number
  products?: { name: string } | null
}

export type SaleInput = {
  productId: string
  quantity: number
  unitPrice: number
  saleDate: string
  buyerName?: string
  buyerPhone?: string
  marketplace?: string
  notes?: string
  paymentMethod: string
  paidAmount: number
  installments: { amount: number; due_date: string }[]
}

export async function getSaleProducts(): Promise<SaleProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, quantity, purchase_price, suggested_sale_price')
    .gt('quantity', 0)
    .order('name')

  if (error) throw error
  return (data || []) as SaleProduct[]
}

export async function getSales(): Promise<Sale[]> {
  const { data, error } = await supabase
    .from('sales')
    .select(`
      id, product_id, buyer_name, buyer_phone, sale_date,
      quantity, unit_price, total_amount, marketplace, status,
      notes, unit_cost_snapshot, profit_amount,
      products ( name )
    `)
    .order('sale_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
const normalizedData = (data || []).map((sale) => {
  const product = Array.isArray(sale.products)
    ? sale.products[0]
    : sale.products

  return {
    ...sale,
    products: product || null,
  }
})

return normalizedData as unknown as Sale[]
}

export async function registerSale(input: SaleInput): Promise<string> {
  const { data, error } = await supabase.rpc('register_sale', {
    p_product_id: input.productId,
    p_quantity: input.quantity,
    p_unit_price: input.unitPrice,
    p_sale_date: input.saleDate,
    p_buyer_name: input.buyerName || null,
    p_buyer_phone: input.buyerPhone || null,
    p_marketplace: input.marketplace || null,
    p_notes: input.notes || null,
    p_payment_method: input.paymentMethod,
    p_paid_amount: input.paidAmount,
    p_installments: input.installments,
  })

  if (error) throw error
  return data as string
}
