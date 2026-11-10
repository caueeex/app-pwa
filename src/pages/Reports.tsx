import { useEffect, useMemo, useState } from 'react'
import {
  getReportData,
  type ReportData,
} from '../services/reportService'
import {
  Alert,
  EmptyState,
  Field,
  Metric,
  Page,
  PageHeader,
  TextInput,
} from '../components/ui'

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
    <Page>
      <PageHeader
        eyebrow="Números"
        title="Relatórios"
        subtitle="Como a bancada performou no período."
      />

      <div className="stack">
        <section className="sheet sheet-pad stack">
          <div>
            <h2 className="section-title">Período</h2>
            <p className="page-sub">Escolha o intervalo da análise.</p>
          </div>

          <div className="segmented">
            {[
              { value: '7', label: '7 dias' },
              { value: '30', label: '30 dias' },
              { value: 'month', label: 'Mês' },
              { value: 'year', label: 'Ano' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => changePeriod(option.value as Period)}
                className={
                  period === option.value ? 'seg-btn is-active' : 'seg-btn'
                }
              >
                {option.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setPeriod('custom')}
            className={
              period === 'custom'
                ? 'btn btn-accent btn-block'
                : 'btn btn-ghost btn-block'
            }
          >
            Personalizar datas
          </button>

          {period === 'custom' && (
            <div className="grid-2">
              <Field label="Início">
                <TextInput
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </Field>
              <Field label="Fim">
                <TextInput
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </Field>
            </div>
          )}
        </section>

        {loading ? (
          <p className="text-muted">Carregando relatórios...</p>
        ) : null}

        {!loading && error ? <Alert>{error}</Alert> : null}

        {!loading && !error && summary && data ? (
          <>
            <section className="stack">
              <h2 className="section-title">Resumo financeiro</h2>
              <div className="grid-2">
                <Metric label="Faturamento" value={formatCurrency(summary.revenue)} />
                <Metric
                  label="Lucro das vendas"
                  value={formatCurrency(summary.grossProfit)}
                />
                <Metric
                  label="Despesas"
                  value={formatCurrency(summary.expenses)}
                />
                <Metric
                  accent={summary.netProfit >= 0}
                  label="Resultado"
                  value={formatCurrency(summary.netProfit)}
                  hint="Lucro menos despesas"
                />
              </div>
            </section>

            <section className="stack">
              <h2 className="section-title">Vendas e caixa</h2>
              <div className="grid-2">
                <Metric label="Vendas" value={String(summary.salesCount)} />
                <Metric label="Unidades" value={String(summary.unitsSold)} />
                <Metric
                  label="Ticket médio"
                  value={formatCurrency(summary.averageTicket)}
                />
                <Metric
                  label="Recebido"
                  value={formatCurrency(summary.received)}
                />
              </div>
              <Metric
                label="Parcelas pendentes no período"
                value={formatCurrency(summary.pending)}
                hint="Com vencimento dentro do filtro"
              />
            </section>

            <section className="sheet sheet-pad stack">
              <div>
                <h2 className="section-title">Faturamento por dia</h2>
                <p className="page-sub">Até os últimos 10 dias com venda.</p>
              </div>

              {dailySales.length === 0 ? (
                <EmptyState
                  title="Sem vendas"
                  text="Nenhuma venda encontrada neste período."
                />
              ) : (
                <div className="stack">
                  {dailySales.map((item) => (
                    <div key={item.date} className="stack-sm">
                      <div className="list-item__top">
                        <span className="text-muted" style={{ fontSize: '0.82rem' }}>
                          {new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR')}
                        </span>
                        <strong style={{ fontSize: '0.9rem' }}>
                          {formatCurrency(item.value)}
                        </strong>
                      </div>
                      <div className="progress">
                        <span
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

            <section className="sheet sheet-pad stack">
              <h2 className="section-title">Mais lucrativos</h2>

              {topProducts.length === 0 ? (
                <EmptyState
                  title="Sem ranking"
                  text="Ainda não existem vendas neste período."
                />
              ) : (
                <div className="list">
                  {topProducts.map((product, index) => (
                    <article key={product.name + index} className="list-item">
                      <div className="list-item__top">
                        <div>
                          <p className="list-item__title">
                            {index + 1}. {product.name}
                          </p>
                          <p className="list-item__meta">
                            {product.quantity} unidade(s)
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p className="list-item__value text-ok">
                            {formatCurrency(product.profit)}
                          </p>
                          <p className="list-item__meta">Lucro</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="sheet sheet-pad stack">
              <h2 className="section-title">Por canal</h2>

              {marketplaces.length === 0 ? (
                <EmptyState
                  title="Sem canais"
                  text="Nenhuma venda encontrada neste período."
                />
              ) : (
                <div className="stack">
                  {marketplaces.map((item) => {
                    const percentage =
                      summary.revenue > 0
                        ? Math.min((item.value / summary.revenue) * 100, 100)
                        : 0

                    return (
                      <div key={item.name} className="stack-sm">
                        <div className="list-item__top">
                          <span style={{ fontSize: '0.92rem' }}>
                            {marketplaceLabels[item.name] || item.name}
                          </span>
                          <strong style={{ fontSize: '0.9rem' }}>
                            {formatCurrency(item.value)}
                          </strong>
                        </div>
                        <div className="progress">
                          <span style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="stack">
              <h2 className="section-title">Estoque agora</h2>
              <Metric
                label="Valor investido"
                value={formatCurrency(summary.inventoryValue)}
                hint={`${data.products.reduce(
                  (sum, product) => sum + Number(product.quantity || 0),
                  0
                )} unidade(s) disponíveis`}
              />
            </section>
          </>
        ) : null}
      </div>
    </Page>
  )
}
