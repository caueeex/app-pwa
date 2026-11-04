export type ProductCondition = 'new' | 'used' | 'refurbished'

export type ProductStatus =
  | 'in_stock'
  | 'reserved'
  | 'sold'
  | 'returned'
  | 'written_off'

export interface Product {
  id: string
  user_id: string
  category_id: string | null
  name: string
  description: string | null
  brand: string | null
  model: string | null
  condition: ProductCondition
  status: ProductStatus
  quantity: number
  sku: string | null
  purchase_price: number
  suggested_sale_price: number
  photo_urls: string[]
  notes: string | null
  purchased_at: string | null
  sold_at: string | null
  created_at: string
  updated_at: string
}

export type ProductInput = {
  category_id: string | null
  name: string
  description: string | null
  brand: string | null
  model: string | null
  condition: ProductCondition
  status: ProductStatus
  quantity: number
  sku: string | null
  purchase_price: number
  suggested_sale_price: number
  notes: string | null
  purchased_at: string | null
}