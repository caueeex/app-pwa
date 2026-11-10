import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  getSaleProducts,
  getSales,
  registerSale,
  type Sale,
  type SaleProduct,
} from '../services/salesService'
import {
  Alert,
  Button,
  EmptyState,
  Field,
  Metric,
  Page,
  PageHeader,
  SelectInput,
  TextArea,
  TextInput,
} from '../components/ui'

const currency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)

const today = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function addMonths(dateString: string, months: number) {
  const [year, month, day] = dateString.split('-').map(Number)

  const targetMonth = month - 1 + months
  const targetYear = year + Math.floor(targetMonth / 12)
  const normalizedMonth = ((targetMonth % 12) + 12) % 12

  const lastDay = new Date(
    targetYear,
    normalizedMonth + 1,
    0
  ).getDate()

  const targetDay = Math.min(day, lastDay)

  return [
    targetYear,
    String(normalizedMonth + 1).padStart(2, '0'),
    String(targetDay).padStart(2, '0'),
  ].join('-')
}

const marketplaceOptions = [
  { value: 'direct', label: 'Venda direta' },
  { value: 'facebook_marketplace', label: 'Facebook Marketplace' },
  { value: 'olx', label: 'OLX' },
  { value: 'mercado_livre', label: 'Mercado Livre' },
  { value: 'shopee', label: 'Shopee' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'other', label: 'Outro' },
]

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<SaleProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)

  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [unitPrice, setUnitPrice] = useState('')
  const [saleDate, setSaleDate] = useState(today())
  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [marketplace, setMarketplace] = useState('direct')
  const [paymentMethod, setPaymentMethod] = useState('pix')
  const [paidAmount, setPaidAmount] = useState('')
  const [installmentCount, setInstallmentCount] = useState(1)
  const [firstDueDate, setFirstDueDate] = useState(today())
  const [notes, setNotes] = useState('')

  const selectedProduct = products.find(
    (product) => product.id === productId
  )

  const total = quantity * (Number(unitPrice) || 0)
  const received = Math.min(Number(paidAmount) || 0, total)
  const pending = Math.max(0, total - received)

  const estimatedProfit = selectedProduct
    ? (Number(unitPrice || 0) -
        Number(selectedProduct.purchase_price || 0)) * quantity
    : 0

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [salesData, productData] = await Promise.all([
        getSales(),
        getSaleProducts(),
      ])

      setSales(salesData)
      setProducts(productData)

      if (!productId && productData.length > 0) {
        setProductId(productData[0].id)
      }
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar as vendas.'
      )
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (selectedProduct && !unitPrice) {
      setUnitPrice(
        String(selectedProduct.suggested_sale_price || '')
      )
    }
  }, [selectedProduct, unitPrice])

  const totals = useMemo(
    () => ({
      revenue: sales.reduce(
        (sum, sale) => sum + Number(sale.total_amount || 0),
        0
      ),
      profit: sales.reduce(
        (sum, sale) => sum + Number(sale.profit_amount || 0),
        0
      ),
    }),
    [sales]
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (!selectedProduct) {
      setError('Selecione um produto disponível.')
      return
    }

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      quantity > selectedProduct.quantity
    ) {
      setError(
        `Informe uma quantidade entre 1 e ${selectedProduct.quantity}.`
      )
      return
    }

    if (!Number(unitPrice) || Number(unitPrice) <= 0) {
      setError('Informe um preço de venda válido.')
      return
    }

    if (
      Number(paidAmount || 0) < 0 ||
      Number(paidAmount || 0) > total
    ) {
      setError('Confira o valor já recebido.')
      return
    }

    if (pending > 0 && (!installmentCount || installmentCount < 1)) {
      setError('Informe uma quantidade válida de parcelas.')
      return
    }

    const installments =
      pending > 0
        ? Array.from({ length: installmentCount }, (_, index) => ({
            amount: Number(
              (pending / installmentCount).toFixed(2)
            ),
            due_date: addMonths(firstDueDate, index),
          }))
        : []

    if (installments.length > 0) {
      const installmentSum = installments.reduce(
        (sum, item) => sum + item.amount,
        0
      )

      const lastIndex = installments.length - 1

      installments[lastIndex].amount = Number(
        (
          installments[lastIndex].amount +
          pending -
          installmentSum
        ).toFixed(2)
      )
    }

    setSaving(true)

    try {
      await registerSale({
        productId,
        quantity,
        unitPrice: Number(unitPrice),
        saleDate,
        buyerName,
        buyerPhone,
        marketplace,
        notes,
        paymentMethod,
        paidAmount: received,
        installments,
      })

      setSuccess('Venda registrada com sucesso!')
      setShowForm(false)

      setQuantity(1)
      setBuyerName('')
      setBuyerPhone('')
      setNotes('')
      setPaidAmount('')
      setUnitPrice('')
      setInstallmentCount(1)
      setSaleDate(today())
      setFirstDueDate(today())
      setMarketplace('direct')
      setPaymentMethod('pix')

      await loadData()
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível registrar a venda.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Saídas"
        title="Vendas"
        subtitle="Feche negócios e acompanhe o lucro."
        action={
          <Button
            size="sm"
            onClick={() => {
              setShowForm((value) => !value)
              setError('')
              setSuccess('')
            }}
          >
            {showForm ? 'Fechar' : 'Nova'}
          </Button>
        }
      />

      <div className="stack">
        <div className="grid-2">
          <Metric label="Faturamento" value={currency(totals.revenue)} />
          <Metric
            label="Lucro bruto"
            value={currency(totals.profit)}
            hint="Com snapshot de custo"
          />
        </div>

        {error ? <Alert>{error}</Alert> : null}
        {success ? <Alert tone="ok">{success}</Alert> : null}

        {showForm && (
          <form onSubmit={handleSubmit} className="sheet sheet-pad stack">
            <div>
              <h2 className="section-title">Registrar venda</h2>
              <p className="page-sub">O estoque atualiza na confirmação.</p>
            </div>

            <Field label="Produto">
              <SelectInput
                value={productId}
                onChange={(e) => {
                  setProductId(e.target.value)
                  setUnitPrice('')
                }}
                required
              >
                {products.length === 0 && (
                  <option value="">Nenhum produto disponível</option>
                )}

                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} · {product.quantity} disponível(is)
                  </option>
                ))}
              </SelectInput>
            </Field>

            {selectedProduct ? (
              <p className="text-muted" style={{ margin: 0, fontSize: '0.86rem' }}>
                Estoque: {selectedProduct.quantity} · Custo médio:{' '}
                {currency(Number(selectedProduct.purchase_price))}
              </p>
            ) : null}

            <div className="grid-2">
              <Field label="Quantidade">
                <TextInput
                  type="number"
                  min="1"
                  max={selectedProduct?.quantity || 1}
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  required
                />
              </Field>
              <Field label="Preço unitário">
                <TextInput
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  required
                />
              </Field>
            </div>

            <div className="sheet sheet-pad stack-sm">
              <div className="list-item__top">
                <span className="text-muted">Total</span>
                <strong>{currency(total)}</strong>
              </div>
              <div className="list-item__top">
                <span className="text-muted">Lucro estimado</span>
                <strong className={estimatedProfit >= 0 ? 'text-ok' : 'text-danger'}>
                  {currency(estimatedProfit)}
                </strong>
              </div>
            </div>

            <div className="grid-2">
              <Field label="Data">
                <TextInput
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  required
                />
              </Field>
              <Field label="Canal">
                <SelectInput
                  value={marketplace}
                  onChange={(e) => setMarketplace(e.target.value)}
                  required
                >
                  {marketplaceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>

            <div className="grid-2">
              <Field label="Comprador">
                <TextInput
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Nome"
                />
              </Field>
              <Field label="Telefone">
                <TextInput
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </Field>
            </div>

            <div className="stack">
              <h3 className="section-title">Pagamento</h3>

              <Field label="Forma de pagamento">
                <SelectInput
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="pix">Pix</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="credito">Cartão de crédito</option>
                  <option value="debito">Cartão de débito</option>
                  <option value="transferencia">Transferência</option>
                  <option value="outro">Outro</option>
                </SelectInput>
              </Field>

              <Field label="Valor já recebido">
                <TextInput
                  type="number"
                  min="0"
                  max={total}
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="0,00"
                />
              </Field>

              <div className="list-item__top">
                <span className="text-muted">Pendente</span>
                <strong>{currency(pending)}</strong>
              </div>

              {pending > 0 && (
                <div className="grid-2">
                  <Field label="Parcelas">
                    <TextInput
                      type="number"
                      min="1"
                      max="48"
                      value={installmentCount}
                      onChange={(e) =>
                        setInstallmentCount(
                          Math.max(
                            1,
                            Math.min(48, Number(e.target.value))
                          )
                        )
                      }
                    />
                  </Field>
                  <Field label="1º vencimento">
                    <TextInput
                      type="date"
                      value={firstDueDate}
                      onChange={(e) => setFirstDueDate(e.target.value)}
                      required
                    />
                  </Field>
                </div>
              )}
            </div>

            <Field label="Observações">
              <TextArea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Informações adicionais..."
              />
            </Field>

            <Button
              type="submit"
              block
              disabled={saving || !selectedProduct}
            >
              {saving ? 'Registrando...' : 'Confirmar venda'}
            </Button>
          </form>
        )}

        <section>
          <div className="section-head">
            <h2 className="section-title">Histórico</h2>
            <button
              type="button"
              className="linkish"
              onClick={loadData}
              disabled={loading}
            >
              Atualizar
            </button>
          </div>

          {loading ? (
            <p className="text-muted">Carregando vendas...</p>
          ) : sales.length === 0 ? (
            <EmptyState
              title="Nenhuma venda"
              text="Quando fechar o primeiro negócio, ele aparece aqui."
            />
          ) : (
            <div className="list">
              {sales.map((sale) => (
                <article key={sale.id} className="list-item">
                  <div className="list-item__top">
                    <div>
                      <h3 className="list-item__title">
                        {sale.products?.name || 'Produto'}
                      </h3>
                      <p className="list-item__meta">
                        {new Date(
                          `${sale.sale_date}T12:00:00`
                        ).toLocaleDateString('pt-BR')}
                        {' · '}
                        {sale.quantity} unidade(s)
                      </p>
                      {sale.buyer_name ? (
                        <p className="list-item__meta">
                          Comprador: {sale.buyer_name}
                        </p>
                      ) : null}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p className="list-item__value">
                        {currency(Number(sale.total_amount))}
                      </p>
                      <p className="list-item__meta text-ok">
                        Lucro {currency(Number(sale.profit_amount || 0))}
                      </p>
                    </div>
                  </div>
                  <p className="list-item__meta" style={{ margin: 0 }}>
                    Custo registrado:{' '}
                    {currency(Number(sale.unit_cost_snapshot || 0))}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </Page>
  )
}
