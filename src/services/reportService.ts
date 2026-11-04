
import { supabase } from '../lib/supabase'

export type ReportFilters = {
  startDate: string
  endDate: string
}

export type ReportSale = {
  id: string
  product_id: string
  sale_date: string
  quantity: number
  unit_price: number
  total_amount: number
  unit_cost_snapshot: number | null
  profit_amount: number | null
  marketplace: string | null
  products: { name: string } | null
}

export type ReportExpense = {
  id: string
  description: string
  category: string
  amount: number
  expense_date: string
}

export type ReportPayment = {
  id: string
  amount: number
  received_at: string | null
  status: string
}

export type ReportInstallment = {
  id: string
  amount: number
  due_date: string
  status: string
}

export type ReportProduct = {
  id: string
  name: string
  quantity: number
  purchase_price: number
  status: string
}

export type ReportData = {
  sales: ReportSale[]
  expenses: ReportExpense[]
  payments: ReportPayment[]
  installments: ReportInstallment[]
  products: ReportProduct[]
}

export async function getReportData(
  filters: ReportFilters
): Promise<ReportData> {
  const [
    salesResult,
    expensesResult,
    paymentsResult,
    installmentsResult,
    productsResult,
  ] = await Promise.all([
    supabase
      .from('sales')
      .select(`
        id,
        product_id,
        sale_date,
        quantity,
        unit_price,
        total_amount,
        unit_cost_snapshot,
        profit_amount,
        marketplace,
        products(name)
      `)
      .gte('sale_date', filters.startDate)
      .lte('sale_date', filters.endDate)
      .order('sale_date', { ascending: false }),

    supabase
      .from('expenses')
      .select('id, description, category, amount, expense_date')
      .gte('expense_date', filters.startDate)
      .lte('expense_date', filters.endDate)
      .order('expense_date', { ascending: false }),

    supabase
      .from('sale_payments')
      .select('id, amount, received_at, status')
      .eq('status', 'received')
      .gte('received_at', `${filters.startDate}T00:00:00`)
      .lte('received_at', `${filters.endDate}T23:59:59`),

    supabase
      .from('sale_installments')
      .select('id, amount, due_date, status')
      .in('status', ['pending', 'partial', 'overdue'])
      .gte('due_date', filters.startDate)
      .lte('due_date', filters.endDate),

    supabase
      .from('products')
      .select('id, name, quantity, purchase_price, status')
      .gt('quantity', 0)
      .order('name', { ascending: true }),
  ])

  const errors = [
    salesResult.error,
    expensesResult.error,
    paymentsResult.error,
    installmentsResult.error,
    productsResult.error,
  ].filter(Boolean)

  if (errors.length > 0) {
    console.error('Erro ao carregar relatórios:', errors)
    throw new Error(errors[0]?.message || 'Erro ao carregar relatórios.')
  }

  return {
    sales: (salesResult.data || []) as unknown as ReportSale[],
    expenses: (expensesResult.data || []) as ReportExpense[],
    payments: (paymentsResult.data || []) as ReportPayment[],
    installments: (installmentsResult.data || []) as ReportInstallment[],
    products: (productsResult.data || []) as ReportProduct[],
  }
}
