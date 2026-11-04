
export type PaymentMethod =
  | 'pix'
  | 'cash'
  | 'credit_card'
  | 'debit_card'
  | 'bank_transfer'
  | 'other'

export interface Purchase {
  id: string
  user_id: string
  product_id: string
  seller_name: string | null
  seller_phone: string | null
  purchase_date: string
  quantity: number
  unit_price: number
  total_amount: number
  status: string
  notes: string | null
  created_at: string
  products?: {
    name: string
  } | null
}

export interface PurchaseInput {
  product_id: string
  quantity: number
  unit_price: number
  seller_name: string
  seller_phone: string
  purchase_date: string
  payment_method: PaymentMethod
  installments_count: number
  first_due_date: string
  notes: string
}
