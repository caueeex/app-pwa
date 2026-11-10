import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
  Alert,
  Button,
  Metric,
  Page,
  PageHeader,
} from '../components/ui'

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
        supabase.from('products').select('id, quantity, purchase_price'),
        supabase.from('purchases').select('total_amount'),
        supabase.from('sales').select('product_id, quantity, total_amount'),
        supabase.from('expenses').select('amount'),
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

  const firstName =
    String(user?.user_metadata?.full_name || 'você').split(' ')[0]

  return (
    <Page>
      <PageHeader
        eyebrow="Bancada"
        title={`Oi, ${firstName}`}
        subtitle="Resumo rápido do que está rodando hoje."
        action={
          <Button variant="ghost" size="sm" onClick={signOut}>
            Sair
          </Button>
        }
      />

      <div className="stack">
        <Metric
          accent
          label="Lucro estimado"
          value={loading ? '…' : formatCurrency(data.profit)}
          hint="Após custos e despesas"
        />

        <div className="grid-2">
          <Metric
            label="Estoque"
            value={loading ? '…' : `${data.productCount}`}
            hint={`${data.stockQuantity} unidades`}
          />
          <Metric
            label="Vendas"
            value={loading ? '…' : formatCurrency(data.sales)}
            hint="Faturamento total"
          />
          <Metric
            label="Compras"
            value={loading ? '…' : formatCurrency(data.purchases)}
            hint="Total investido"
          />
          <Metric
            label="Unidades"
            value={loading ? '…' : String(data.stockQuantity)}
            hint="Em mãos agora"
          />
        </div>

        {error ? (
          <Alert>
            {error}{' '}
            <button type="button" className="linkish" onClick={loadDashboard}>
              Tentar de novo
            </button>
          </Alert>
        ) : null}

        <div className="stack-sm">
          <Link to="/products" className="btn btn-primary btn-block">
            Ir para o estoque
          </Link>
          <Button
            variant="ghost"
            block
            onClick={loadDashboard}
            disabled={loading}
          >
            Atualizar números
          </Button>
        </div>

        <p className="text-muted" style={{ fontSize: '0.82rem', margin: 0 }}>
          O lucro usa o custo médio atual dos produtos. Ele fica mais preciso
          quando cada venda registra o custo no momento da saída.
        </p>
      </div>
    </Page>
  )
}
