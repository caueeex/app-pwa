import { useEffect, useMemo, useState } from 'react'
import { getProducts } from '../services/productService'
import {
  getPurchases,
  registerPurchase,
} from '../services/purchaseService'
import type { Product } from '../types/product'
import type {
  PaymentMethod,
  Purchase,
} from '../types/purchase'
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

const dateFormat = (value: string) =>
  new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR')

const today = () => {
  const date = new Date()
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000)
    .toISOString()
    .split('T')[0]
}

const paymentLabels: Record<PaymentMethod, string> = {
  pix: 'PIX',
  cash: 'Dinheiro',
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  bank_transfer: 'Transferência bancária',
  other: 'Outro',
}

export default function Purchases() {
  const [products, setProducts] = useState<Product[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')
  const [sellerName, setSellerName] = useState('')
  const [sellerPhone, setSellerPhone] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(today())
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('pix')
  const [installmentsCount, setInstallmentsCount] = useState('1')
  const [firstDueDate, setFirstDueDate] = useState(today())
  const [notes, setNotes] = useState('')

  const total = useMemo(() => {
    return Math.max(0, Number(quantity) || 0) *
      Math.max(0, Number(unitPrice) || 0)
  }, [quantity, unitPrice])

  const selectedProduct = products.find(
    (product) => product.id === productId
  )

  const isCreditCard = paymentMethod === 'credit_card'

  async function loadData() {
    try {
      setLoading(true)
      setError('')

      const [productData, purchaseData] = await Promise.all([
        getProducts(),
        getPurchases(),
      ])

      setProducts(productData)
      setPurchases(purchaseData)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar as compras.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  function resetForm() {
    setProductId('')
    setQuantity('1')
    setUnitPrice('')
    setSellerName('')
    setSellerPhone('')
    setPurchaseDate(today())
    setPaymentMethod('pix')
    setInstallmentsCount('1')
    setFirstDueDate(today())
    setNotes('')
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!productId) {
      setError('Selecione um produto.')
      return
    }

    if (Number(quantity) <= 0 || Number(unitPrice) <= 0) {
      setError('Informe uma quantidade e um custo válidos.')
      return
    }

    if (!purchaseDate || !firstDueDate) {
      setError('Informe as datas da compra e do vencimento.')
      return
    }

    if (!isCreditCard && Number(installmentsCount) !== 1) {
      setError(
        'Nesta versão, o parcelamento está disponível apenas para cartão de crédito.'
      )
      return
    }

    try {
      setSaving(true)

      await registerPurchase({
        product_id: productId,
        quantity: Number(quantity),
        unit_price: Number(unitPrice),
        seller_name: sellerName.trim(),
        seller_phone: sellerPhone.trim(),
        purchase_date: purchaseDate,
        payment_method: paymentMethod,
        installments_count: Number(installmentsCount),
        first_due_date: firstDueDate,
        notes: notes.trim(),
      })

      resetForm()
      setShowForm(false)
      setSuccess('Compra registrada com sucesso!')

      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível registrar a compra.'
      )
    } finally {
      setSaving(false)
    }
  }

  const totalPurchases = purchases.reduce(
    (sum, purchase) => sum + Number(purchase.total_amount),
    0
  )

  const totalUnits = purchases.reduce(
    (sum, purchase) => sum + Number(purchase.quantity),
    0
  )

  return (
    <Page>
      <PageHeader
        eyebrow="Entradas"
        title="Compras"
        subtitle="Registre o que entrou e quanto custou."
        action={
          <Button
            size="sm"
            onClick={() => {
              setError('')
              setSuccess('')
              setShowForm(!showForm)
            }}
          >
            {showForm ? 'Fechar' : 'Nova'}
          </Button>
        }
      />

      <div className="stack">
        {error ? <Alert>{error}</Alert> : null}
        {success ? <Alert tone="ok">{success}</Alert> : null}

        <div className="grid-2">
          <Metric label="Total em compras" value={currency(totalPurchases)} />
          <Metric label="Unidades" value={String(totalUnits)} />
        </div>

        {showForm && (
          <section className="sheet sheet-pad">
            <form onSubmit={handleSubmit} className="stack">
              <h2 className="section-title">Nova compra</h2>

              <Field label="Produto *">
                <SelectInput
                  required
                  value={productId}
                  onChange={(event) => setProductId(event.target.value)}
                >
                  <option value="">Selecione um produto</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              {products.length === 0 ? (
                <p className="text-mark" style={{ margin: 0, fontSize: '0.86rem' }}>
                  Cadastre um produto antes de registrar uma compra.
                </p>
              ) : null}

              {selectedProduct ? (
                <p className="text-muted" style={{ margin: 0, fontSize: '0.86rem' }}>
                  Estoque atual: {selectedProduct.quantity} unidade(s)
                </p>
              ) : null}

              <div className="grid-2">
                <Field label="Quantidade *">
                  <TextInput
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                  />
                </Field>
                <Field label="Custo unitário *">
                  <TextInput
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={unitPrice}
                    onChange={(event) => setUnitPrice(event.target.value)}
                    placeholder="0,00"
                  />
                </Field>
              </div>

              <Metric label="Total da compra" value={currency(total)} accent />

              <div className="grid-2">
                <Field label="Fornecedor">
                  <TextInput
                    value={sellerName}
                    onChange={(event) => setSellerName(event.target.value)}
                    placeholder="Nome"
                  />
                </Field>
                <Field label="Telefone">
                  <TextInput
                    value={sellerPhone}
                    onChange={(event) => setSellerPhone(event.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </Field>
              </div>

              <Field label="Data da compra *">
                <TextInput
                  type="date"
                  required
                  value={purchaseDate}
                  onChange={(event) => {
                    setPurchaseDate(event.target.value)
                    if (paymentMethod !== 'credit_card') {
                      setFirstDueDate(event.target.value)
                    }
                  }}
                />
              </Field>

              <Field label="Forma de pagamento *">
                <SelectInput
                  value={paymentMethod}
                  onChange={(event) => {
                    const method = event.target.value as PaymentMethod
                    setPaymentMethod(method)
                    if (method !== 'credit_card') {
                      setInstallmentsCount('1')
                      setFirstDueDate(purchaseDate)
                    }
                  }}
                >
                  {Object.entries(paymentLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              {isCreditCard && (
                <div className="grid-2">
                  <Field label="Parcelas *">
                    <SelectInput
                      value={installmentsCount}
                      onChange={(event) => setInstallmentsCount(event.target.value)}
                    >
                      {Array.from({ length: 48 }, (_, index) => index + 1).map((number) => (
                        <option key={number} value={number}>
                          {number}x
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                  <Field label="1º vencimento *">
                    <TextInput
                      type="date"
                      required
                      value={firstDueDate}
                      onChange={(event) => setFirstDueDate(event.target.value)}
                    />
                  </Field>
                </div>
              )}

              <Field label="Observações">
                <TextArea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="Detalhes da compra..."
                />
              </Field>

              <Button
                type="submit"
                block
                disabled={saving || !products.length}
              >
                {saving ? 'Registrando...' : 'Confirmar compra'}
              </Button>
            </form>
          </section>
        )}

        <section>
          <div className="section-head">
            <h2 className="section-title">Histórico</h2>
            <button type="button" className="linkish" onClick={() => void loadData()}>
              Atualizar
            </button>
          </div>

          {loading ? (
            <p className="text-muted">Carregando compras...</p>
          ) : purchases.length === 0 ? (
            <EmptyState
              title="Nenhuma compra"
              text="Suas aquisições aparecem aqui depois do primeiro registro."
            />
          ) : (
            <div className="list">
              {purchases.map((purchase) => (
                <article key={purchase.id} className="list-item">
                  <div className="list-item__top">
                    <div>
                      <h3 className="list-item__title">
                        {purchase.products?.name ?? 'Produto'}
                      </h3>
                      <p className="list-item__meta">
                        {dateFormat(purchase.purchase_date)}
                      </p>
                    </div>
                    <p className="list-item__value text-ok">
                      {currency(Number(purchase.total_amount))}
                    </p>
                  </div>

                  <div className="row" style={{ flexWrap: 'wrap' }}>
                    <span className="chip">{purchase.quantity} un.</span>
                    <span className="chip">
                      {currency(Number(purchase.unit_price))} / un.
                    </span>
                  </div>

                  {purchase.seller_name ? (
                    <p className="list-item__meta" style={{ margin: 0 }}>
                      Fornecedor: {purchase.seller_name}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </Page>
  )
}
