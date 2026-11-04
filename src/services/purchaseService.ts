
import { supabase } from '../lib/supabase'
import type { Purchase, PurchaseInput } from '../types/purchase'

export async function getPurchases(): Promise<Purchase[]> {
  const { data, error } = await supabase
    .from('purchases')
    .select(`
      *,
      products (
        name
      )
    `)
    .order('purchase_date', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as Purchase[]
}

export async function registerPurchase(
  purchase: PurchaseInput
): Promise<string> {
  const { data, error } = await supabase.rpc('register_purchase', {
    p_product_id: purchase.product_id,
    p_quantity: purchase.quantity,
    p_unit_price: purchase.unit_price,
    p_seller_name: purchase.seller_name || null,
    p_seller_phone: purchase.seller_phone || null,
    p_purchase_date: purchase.purchase_date,
    p_payment_method: purchase.payment_method,
    p_installments_count: purchase.installments_count,
    p_first_due_date: purchase.first_due_date,
    p_notes: purchase.notes || null,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data as string
}
