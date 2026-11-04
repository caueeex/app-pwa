import { supabase } from '../lib/supabase'
import type { Product, ProductInput } from '../types/product'

export interface Acquisition {
  id: string
  product_id: string
  purchase_date: string
  quantity: number
  unit_price: number
  total_amount: number
  seller_name: string | null
  seller_phone: string | null
  notes: string | null
  created_at: string
}

export interface AcquisitionInput {
  product_id: string
  quantity: number
  unit_price: number
  purchase_date: string
  seller_name: string | null
  seller_phone: string | null
  notes: string | null
}

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []) as Product[]
}

export async function createProduct(
  product: ProductInput,
  userId: string
): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      ...product,
      user_id: userId,
    })
    .select()
    .single()

  if (error) throw error

  return data as Product
}

export async function updateProduct(
  id: string,
  product: ProductInput
): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update(product)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  return data as Product
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function addAcquisition(
  acquisition: AcquisitionInput
): Promise<string> {
  const { data, error } = await supabase.rpc('register_purchase', {
    p_product_id: acquisition.product_id,
    p_quantity: acquisition.quantity,
    p_unit_price: acquisition.unit_price,
    p_purchase_date: acquisition.purchase_date,
    p_seller_name: acquisition.seller_name,
    p_seller_phone: acquisition.seller_phone,
    p_notes: acquisition.notes,
  })

  if (error) throw error

  return data as string
}

export async function getAcquisitionHistory(
  productId: string
): Promise<Acquisition[]> {
  const { data, error } = await supabase
    .from('purchases')
    .select(`
      id,
      product_id,
      purchase_date,
      quantity,
      unit_price,
      total_amount,
      seller_name,
      seller_phone,
      notes,
      created_at
    `)
    .eq('product_id', productId)
    .order('purchase_date', { ascending: false })

  if (error) throw error

  return (data ?? []) as Acquisition[]
}
