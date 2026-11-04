
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Product = {
  id: string
  quantity: number
  purchase_price: number
}

type Purchase = {
  total_amount: number
}

type Sale = {
  product_id: string | null
  quantity: number
  total_amount: number
}

type Expense = {
  amount: number
}

type DashboardData = {
  productCount: number
  stockQuantity: number
  purchases: number
  sales: number
  profit: number
}

const initialData: DashboardData = {
  productCount: 0,
  stockQuantity: 0,
  purchases: 0,
  sales: 0,
  profit: 0,
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)

export default function Dashboard() {
  const { user, signOut } = useAuth()

  const [data, setData] = useState<DashboardData>(initialData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [
        productsResponse,
        purchasesResponse,
        salesResponse,
        expensesResponse,
      ] = await Promise.all([
        supabase
          .from('products')
          .select('id, quantity, purchase_price'),

        supabase
          .from('purchases')
          .select('total_amount'),

        supabase
          .from('sales')
          .select('product_id, quantity, total_amount'),

        supabase
          .from('expenses')
          .select('amount'),
      ])

      if (productsResponse.error) throw productsResponse.error
      if (purchasesResponse.error) throw purchasesResponse.error
      if (salesResponse.error) throw salesResponse.error
      if (expensesResponse.error) throw expensesResponse.error

      const products = (productsResponse.data || []) as Product[]
      const purchases = (purchasesResponse.data || []) as Purchase[]
      const sales = (salesResponse.data || []) as Sale[]
      const expenses = (expensesResponse.data || []) as Expense[]

      const productCount = products.length

      const stockQuantity = products.reduce(
        (total, product) => total + Number(product.quantity || 0),
        0
      )

      const totalPurchases = purchases.reduce(
        (total, purchase) => total + Number(purchase.total_amount || 0),
        0
      )

      const totalSales = sales.reduce(
        (total, sale) => total + Number(sale.total_amount || 0),
        0
      )

      const totalExpenses = expenses.reduce(
        (total, expense) => total + Number(expense.amount || 0),
        0
      )

      const productCosts = new Map(
        products.map((product) => [
          product.id,
          Number(product.purchase_price || 0),
        ])
      )

      const estimatedCostOfSales = sales.reduce((total, sale) => {
        const unitCost = sale.product_id
          ? productCosts.get(sale.product_id) || 0
          : 0

        return total + Number(sale.quantity || 0) * unitCost
      }, 0)

      const estimatedProfit =
        totalSales - estimatedCostOfSales - totalExpenses

      setData({
        productCount,
        stockQuantity,
        purchases: totalPurchases,
        sales: totalSales,
        profit: estimatedProfit,
      })
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
      setError('Não foi possível carregar os indicadores.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const cards = [
    {
      title: 'Estoque',
      value: `${data.productCount} produtos`,
      detail: `${data.stockQuantity} unidades`,
    },
    {
      title: 'Compras',
      value: formatCurrency(data.purchases),
      detail: 'Total investido',
    },
    {
      title: 'Vendas',
      value: formatCurrency(data.sales),
      detail: 'Faturamento total',
    },
    {
      title: 'Lucro estimado',
      value: formatCurrency(data.profit),
      detail: 'Após custos e despesas',
    },
  ]

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Resale Manager</h1>

          <p className="text-slate-400 text-sm mt-1">
            Olá, {user?.user_metadata?.full_name || 'Usuário'}!
          </p>
        </div>

        <button
          onClick={signOut}
          className="text-sm text-red-400 border border-red-400/30 rounded-xl px-4 py-2"
        >
          Sair
        </button>
      </header>

      <section className="mt-10">
        <p className="text-slate-400">Seu negócio começa aqui.</p>

        <h2 className="text-3xl font-bold mt-2">
          Bem-vindo ao seu painel!
        </h2>

        <div className="grid grid-cols-2 gap-4 mt-8">
          {cards.map((card) => (
            <div
              key={card.title}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
            >
              <p className="text-slate-400 text-sm">
                {card.title}
              </p>

              <p className="text-xl font-bold mt-3">
                {loading ? 'Carregando...' : card.value}
              </p>

              <p className="text-xs text-slate-500 mt-2">
                {loading ? ' ' : card.detail}
              </p>
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm text-red-400">{error}</p>

            <button
              onClick={loadDashboard}
              className="text-sm text-white underline mt-2"
            >
              Tentar novamente
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-3 mt-5">
          <Link
            to="/products"
            className="inline-flex items-center rounded-xl bg-green-500 px-5 py-3 font-semibold text-gray-950 hover:bg-green-400"
          >
            Gerenciar produtos
          </Link>

          <button
            onClick={loadDashboard}
            disabled={loading}
            className="inline-flex items-center rounded-xl border border-slate-700 px-5 py-3 text-slate-300 hover:bg-slate-900 disabled:opacity-50"
          >
            Atualizar dados
          </button>
        </div>

        <p className="text-xs text-slate-500 mt-4">
          O lucro é estimado com base no custo médio atual dos produtos.
          Ele poderá mudar até implementarmos o registro histórico do
          custo no momento de cada venda.
        </p>
      </section>
    </main>
  )
}
