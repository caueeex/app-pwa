
import { useEffect, useMemo, useState } from 'react'
import {
  getReportData,
  type ReportData,
} from '../services/reportService'

type Period = '7' | '30' | 'month' | 'year' | 'custom'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getInitialDates(period: Period) {
  const end = new Date()
  const start = new Date()

  if (period === '7') {
    start.setDate(start.getDate() - 6)
  } else if (period === '30') {
    start.setDate(start.getDate() - 29)
  } else if (period === 'month') {
    start.setDate(1)
  } else if (period === 'year') {
    start.setMonth(0, 1)
  }

  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  }
}

function MetricCard({
  label,
  value,
  description,
  color = 'text-white',
}: {
  label: string
  value: string
  description?: string
  color?: string
}) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`mt-2 text-xl font-bold ${color}`}>{value}</p>
      {description && (
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      )}
    </div>
  )
}

function ProgressBar({
  label,
  value,
  total,
  color = 'bg-green-400',
  formattedValue,
}: {
  label: string
  value: number
  total: number
  color?: string
  formattedValue: string
}) {
  const percentage = total > 0
    ? Math.min((value / total) * 100, 100)
    : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate text-gray-300">{label}</span>
        <span className="shrink-0 font-medium text-white">
          {formattedValue}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-gray-800">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export default function Reports() {
  const [period, setPeriod] = useState<Period>('30')
  const [startDate, setStartDate] = useState(
    getInitialDates('30').startDate
  )
  const [endDate, setEndDate] = useState(
    getInitialDates('30').endDate
  )
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function changePeriod(value: Period) {
    setPeriod(value)

    if (value !== 'custom') {
      const dates = getInitialDates(value)
      setStartDate(dates.startDate)
      setEndDate(dates.endDate)
    }
  }

  useEffect(() => {
    let active = true

    async function loadReports() {
      setLoading(true)
      setError('')

      try {
        const result = await getReportData({
          startDate,
          endDate,
        })

        if (active) {
          setData(result)
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Não foi possível carregar os relatórios.'
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    if (startDate && endDate && startDate <= endDate) {
      loadReports()
    } else {
      setLoading(false)
      setError('Informe um período válido.')
    }

    return () => {
      active = false
    }
  }, [startDate, endDate])

  const summary = useMemo(() => {
    if (!data) return null

    const revenue = data.sales.reduce(
      (sum, sale) => sum + Number(sale.total_amount || 0),
      0
    )

    const grossProfit = data.sales.reduce(
      (sum, sale) => sum + Number(sale.profit_amount || 0),
      0
    )

    const expenses = data.expenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0
    )

    const received = data.payments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0
    )

    const pending = data.installments.reduce(
      (sum, installment) => sum + Number(installment.amount || 0),
      0
    )

    const inventoryValue = data.products.reduce(
      (sum, product) =>
        sum +
        Number(product.quantity || 0) *
        Number(product.purchase_price || 0),
      0
    )

    return {
      revenue,
      grossProfit,
      expenses,
      netProfit: grossProfit - expenses,
      received,
      pending,
      inventoryValue,
      salesCount: data.sales.length,
      unitsSold: data.sales.reduce(
        (sum, sale) => sum + Number(sale.quantity || 0),
        0
      ),
      averageTicket: data.sales.length > 0
        ? revenue / data.sales.length
        : 0,
    }
  }, [data])

  const topProducts = useMemo(() => {
    if (!data) return []

    const grouped = new Map<
      string,
      { name: string; profit: number; revenue: number; quantity: number }
    >()

    data.sales.forEach((sale) => {
      const name = sale.products?.name || 'Produto não identificado'
      const current = grouped.get(sale.product_id) || {
        name,
        profit: 0,
        revenue: 0,
        quantity: 0,
      }

      current.profit += Number(sale.profit_amount || 0)
      current.revenue += Number(sale.total_amount || 0)
      current.quantity += Number(sale.quantity || 0)

      grouped.set(sale.product_id, current)
    })

    return Array.from(grouped.values())
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5)
  }, [data])

  const marketplaces = useMemo(() => {
    if (!data) return []

    const grouped = new Map<string, number>()

    data.sales.forEach((sale) => {
      const name = sale.marketplace || 'Não informado'
      grouped.set(
        name,
        (grouped.get(name) || 0) + Number(sale.total_amount || 0)
      )
    })

    return Array.from(grouped.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [data])

  const dailySales = useMemo(() => {
    if (!data) return []

    const grouped = new Map<string, number>()

    data.sales.forEach((sale) => {
      grouped.set(
        sale.sale_date,
        (grouped.get(sale.sale_date) || 0) +
          Number(sale.total_amount || 0)
      )
    })

    return Array.from(grouped.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10)
  }, [data])

  const maxDailySales = Math.max(
    ...dailySales.map((item) => item.value),
    1
  )

  const marketplaceLabels: Record<string, string> = {
    direct: 'Venda direta',
    facebook_marketplace: 'Facebook Marketplace',
    olx: 'OLX',
    mercado_livre: 'Mercado Livre',
    shopee: 'Shopee',
    instagram: 'Instagram',
    whatsapp: 'WhatsApp',
    other: 'Outro',
  }

  return (
    <div className="min-h-screen space-y-6 bg-gray-950 px-4 pt-6 pb-28 text-white">
      <div>
        <h1 className="text-2xl font-bold text-white">Relatórios</h1>
        <p className="mt-1 text-sm text-gray-400">
          Acompanhe o desempenho financeiro da sua operação.
        </p>
      </div>

      <section className="space-y-3 rounded-2xl border border-gray-800 bg-gray-900 p-4">
        <div>
          <h2 className="font-semibold text-white">Período de análise</h2>
          <p className="text-xs text-gray-500">
            Selecione o intervalo que deseja consultar.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { value: '7', label: '7 dias' },
            { value: '30', label: '30 dias' },
            { value: 'month', label: 'Este mês' },
            { value: 'year', label: 'Este ano' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => changePeriod(option.value as Period)}
              className={`rounded-xl border px-3 py-2 text-sm transition ${
                period === option.value
                  ? 'border-green-400 bg-green-400/10 text-green-400'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setPeriod('custom')}
          className={`w-full rounded-xl border px-3 py-2 text-sm ${
            period === 'custom'
              ? 'border-green-400 bg-green-400/10 text-green-400'
              : 'border-gray-700 text-gray-400'
          }`}
        >
          Personalizar período
        </button>

        {period === 'custom' && (
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-xs text-gray-400">
              Data inicial
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 p-2 text-sm text-white"
              />
            </label>

            <label className="space-y-1 text-xs text-gray-400">
              Data final
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 p-2 text-sm text-white"
              />
            </label>
          </div>
        )}
      </section>

      {loading && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">
          Carregando relatórios...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && summary && data && (
        <>
          <section className="space-y-3">
            <div>
              <h2 className="font-semibold text-white">Resumo financeiro</h2>
              <p className="text-xs text-gray-500">
                Resultados das vendas no período selecionado.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Faturamento"
                value={formatCurrency(summary.revenue)}
                color="text-white"
              />
              <MetricCard
                label="Lucro das vendas"
                value={formatCurrency(summary.grossProfit)}
                color="text-green-400"
              />
              <MetricCard
                label="Despesas"
                value={formatCurrency(summary.expenses)}
                color="text-red-400"
              />
              <MetricCard
                label="Resultado após despesas"
                value={formatCurrency(summary.netProfit)}
                color={summary.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}
                description="Lucro das vendas menos despesas cadastradas"
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-white">Vendas e recebimentos</h2>

            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Vendas realizadas"
                value={String(summary.salesCount)}
              />
              <MetricCard
                label="Unidades vendidas"
                value={String(summary.unitsSold)}
              />
              <MetricCard
                label="Ticket médio"
                value={formatCurrency(summary.averageTicket)}
              />
              <MetricCard
                label="Dinheiro recebido"
                value={formatCurrency(summary.received)}
                color="text-green-400"
              />
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
              <p className="text-sm text-gray-400">
                Parcelas pendentes com vencimento no período
              </p>
              <p className="mt-2 text-xl font-bold text-yellow-400">
                {formatCurrency(summary.pending)}
              </p>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-gray-800 bg-gray-900 p-4">
            <div>
              <h2 className="font-semibold text-white">Faturamento por dia</h2>
              <p className="text-xs text-gray-500">
                Até os últimos 10 dias com vendas no período.
              </p>
            </div>

            {dailySales.length === 0 ? (
              <p className="py-5 text-center text-sm text-gray-500">
                Nenhuma venda encontrada neste período.
              </p>
            ) : (
              <div className="space-y-4">
                {dailySales.map((item) => (
                  <div key={item.date} className="space-y-1">
                    <div className="flex justify-between gap-2 text-xs">
                      <span className="text-gray-400">
                        {new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-white">
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-800">
                      <div
                        className="h-full rounded-full bg-green-400"
                        style={{
                          width: `${(item.value / maxDailySales) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3 rounded-2xl border border-gray-800 bg-gray-900 p-4">
            <h2 className="font-semibold text-white">
              Produtos mais lucrativos
            </h2>

            {topProducts.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">
                Ainda não existem vendas neste período.
              </p>
            ) : (
              topProducts.map((product, index) => (
                <div
                  key={product.name + index}
                  className="flex items-center justify-between gap-3 border-b border-gray-800 pb-3 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {index + 1}. {product.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {product.quantity} unidade(s) vendida(s)
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-green-400">
                      {formatCurrency(product.profit)}
                    </p>
                    <p className="text-xs text-gray-500">Lucro</p>
                  </div>
                </div>
              ))
            )}
          </section>

          <section className="space-y-3 rounded-2xl border border-gray-800 bg-gray-900 p-4">
            <h2 className="font-semibold text-white">Vendas por marketplace</h2>

            {marketplaces.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">
                Nenhuma venda encontrada neste período.
              </p>
            ) : (
              <div className="space-y-4">
                {marketplaces.map((item) => (
                  <ProgressBar
                    key={item.name}
                    label={marketplaceLabels[item.name] || item.name}
                    value={item.value}
                    total={summary.revenue}
                    formattedValue={formatCurrency(item.value)}
                    color="bg-blue-400"
                  />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3 rounded-2xl border border-gray-800 bg-gray-900 p-4">
            <h2 className="font-semibold text-white">Posição do estoque</h2>

            <MetricCard
              label="Valor investido no estoque atual"
              value={formatCurrency(summary.inventoryValue)}
              description={`${data.products.reduce(
                (sum, product) => sum + Number(product.quantity || 0),
                0
              )} unidade(s) disponíveis`}
            />
          </section>
        </>
      )}
    </div>
  )
}
