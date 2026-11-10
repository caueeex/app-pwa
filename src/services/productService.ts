import { supabase } from '../lib/supabase'
import {
  isForeignKeyViolation,
  isMissingRelation,
  isMissingRpc,
  toUserError,
} from '../lib/supabaseErrors'
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

async function deleteIgnoreMissing(table: string, column: string, ids: string[]) {
  if (ids.length === 0) return

  const { error } = await supabase.from(table).delete().in(column, ids)

  if (error && !isMissingRelation(error)) {
    throw error
  }
}

export async function deleteProduct(id: string): Promise<void> {
  const rpc = await supabase.rpc('delete_product', {
    p_product_id: id,
  })

  if (!rpc.error) return

  const rpcMessage = rpc.error.message || ''
  const canFallback =
    isMissingRpc(rpc.error) ||
    isForeignKeyViolation(rpc.error) ||
    /stock_movements|purchases/i.test(rpcMessage)

  if (!canFallback) {
    throw new Error(rpcMessage || 'Não foi possível excluir o produto.')
  }

  const { count: salesCount, error: salesError } = await supabase
    .from('sales')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', id)

  if (salesError) throw salesError

  if ((salesCount ?? 0) > 0) {
    throw new Error(
      'Este produto possui vendas. Exclua as vendas relacionadas antes de apagar o produto, ou marque-o como Baixado.'
    )
  }

  const { data: purchases, error: purchasesLookupError } = await supabase
    .from('purchases')
    .select('id')
    .eq('product_id', id)

  if (purchasesLookupError) throw purchasesLookupError

  const purchaseIds = (purchases ?? []).map((purchase) => purchase.id)

  await deleteIgnoreMissing('stock_movements', 'product_id', [id])
  await deleteIgnoreMissing('stock_movements', 'purchase_id', purchaseIds)
  await deleteIgnoreMissing('purchase_installments', 'purchase_id', purchaseIds)
  await deleteIgnoreMissing('purchase_payments', 'purchase_id', purchaseIds)

  if (purchaseIds.length > 0) {
    const { error: purchasesDeleteError } = await supabase
      .from('purchases')
      .delete()
      .eq('product_id', id)

    if (purchasesDeleteError) {
      if (isForeignKeyViolation(purchasesDeleteError)) {
        throw new Error(
          'Não foi possível limpar as compras deste produto. Há registros vinculados (parcelas/pagamentos).'
        )
      }

      throw purchasesDeleteError
    }
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  if (error) {
    if (isForeignKeyViolation(error)) {
      throw new Error(
        'Não foi possível excluir: ainda existem registros ligados a este produto.'
      )
    }

    throw toUserError(error, 'Erro ao excluir produto.')
  }
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
