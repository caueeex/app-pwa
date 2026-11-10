import { supabase } from '../lib/supabase'
import {
  isForeignKeyViolation,
  isMissingRelation,
  isMissingRpc,
  toUserError,
} from '../lib/supabaseErrors'

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

export async function deleteSale(saleId: string): Promise<void> {
  const rpc = await supabase.rpc('delete_sale', {
    p_sale_id: saleId,
  })

  if (!rpc.error) return

  if (!isMissingRpc(rpc.error)) {
    throw new Error(rpc.error.message || 'Não foi possível excluir a venda.')
  }

  const { data: sale, error: saleLookupError } = await supabase
    .from('sales')
    .select('id, product_id, quantity')
    .eq('id', saleId)
    .single()

  if (saleLookupError) {
    throw toUserError(saleLookupError, 'Venda não encontrada.')
  }

  const relatedDeletes = await Promise.all([
    supabase.from('sale_payments').delete().eq('sale_id', saleId),
    supabase.from('sale_installments').delete().eq('sale_id', saleId),
  ])

  for (const result of relatedDeletes) {
    if (result.error && !isMissingRelation(result.error)) {
      throw result.error
    }
  }

  const { error: saleDeleteError } = await supabase
    .from('sales')
    .delete()
    .eq('id', saleId)

  if (saleDeleteError) {
    if (isForeignKeyViolation(saleDeleteError)) {
      throw new Error(
        'Não foi possível excluir a venda: ainda há pagamentos ou parcelas vinculadas.'
      )
    }

    throw saleDeleteError
  }

  const { data: product, error: productLookupError } = await supabase
    .from('products')
    .select('id, quantity, status')
    .eq('id', sale.product_id)
    .single()

  if (productLookupError) {
    throw new Error(
      'Venda excluída, mas não foi possível devolver o estoque automaticamente.'
    )
  }

  const restoredQuantity =
    Number(product.quantity || 0) + Number(sale.quantity || 0)

  const { error: stockError } = await supabase
    .from('products')
    .update({
      quantity: restoredQuantity,
      status:
        restoredQuantity > 0 && product.status === 'sold'
          ? 'in_stock'
          : product.status,
    })
    .eq('id', sale.product_id)

  if (stockError) {
    throw new Error(
      'Venda excluída, mas o estoque não foi atualizado. Ajuste a quantidade manualmente.'
    )
  }
}
