
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
    <main className="min-h-screen bg-[#101411] text-white px-4 pt-6 pb-32">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Cabeçalho */}
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-gray-400">
              Controle de estoque
            </p>
            <h1 className="text-2xl font-bold">
              Compras
            </h1>
          </div>

          <button
            onClick={() => {
              setError('')
              setSuccess('')
              setShowForm(!showForm)
            }}
            className="bg-[#a3e635] text-[#101411] font-semibold px-4 py-3 rounded-xl hover:bg-lime-300 transition"
          >
            {showForm ? 'Fechar' : '+ Nova compra'}
          </button>
        </header>

        {/* Mensagens */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-lime-400/10 border border-lime-400/30 text-lime-300 rounded-xl p-4 text-sm">
            {success}
          </div>
        )}

        {/* Indicadores */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-[#1b211d] border border-white/5 rounded-2xl p-4">
            <p className="text-sm text-gray-400">
              Total em compras
            </p>
            <p className="text-xl font-bold mt-2">
              {currency(totalPurchases)}
            </p>
          </div>

          <div className="bg-[#1b211d] border border-white/5 rounded-2xl p-4">
            <p className="text-sm text-gray-400">
              Unidades adquiridas
            </p>
            <p className="text-xl font-bold mt-2">
              {totalUnits}
            </p>
          </div>
        </section>

        {/* Formulário */}
        {showForm && (
          <section className="bg-[#1b211d] border border-white/5 rounded-2xl p-5">
            <h2 className="text-lg font-bold mb-5">
              Registrar nova compra
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Produto *
                </label>

                <select
                  required
                  value={productId}
                  onChange={(event) => setProductId(event.target.value)}
                  className="w-full bg-[#101411] border border-white/10 rounded-xl p-3 outline-none focus:border-lime-400"
                >
                  <option value="">Selecione um produto</option>

                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>

                {products.length === 0 && (
                  <p className="text-xs text-yellow-400 mt-2">
                    Cadastre um produto antes de registrar uma compra.
                  </p>
                )}
              </div>

              {selectedProduct && (
                <div className="bg-[#101411] rounded-xl p-3 text-sm text-gray-400">
                  Estoque atual: {selectedProduct.quantity} unidade(s)
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">
                    Quantidade *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    className="w-full bg-[#101411] border border-white/10 rounded-xl p-3 outline-none focus:border-lime-400"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">
                    Custo unitário *
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={unitPrice}
                    onChange={(event) => setUnitPrice(event.target.value)}
                    placeholder="0,00"
                    className="w-full bg-[#101411] border border-white/10 rounded-xl p-3 outline-none focus:border-lime-400"
                  />
                </div>
              </div>

              <div className="bg-lime-400/10 border border-lime-400/20 rounded-xl p-4">
                <p className="text-sm text-lime-300">
                  Valor total da compra
                </p>
                <p className="text-2xl font-bold text-lime-300 mt-1">
                  {currency(total)}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">
                    Fornecedor
                  </label>
                  <input
                    value={sellerName}
                    onChange={(event) => setSellerName(event.target.value)}
                    placeholder="Nome do vendedor"
                    className="w-full bg-[#101411] border border-white/10 rounded-xl p-3 outline-none focus:border-lime-400"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">
                    Telefone
                  </label>
                  <input
                    value={sellerPhone}
                    onChange={(event) => setSellerPhone(event.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-[#101411] border border-white/10 rounded-xl p-3 outline-none focus:border-lime-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Data da compra *
                </label>
                <input
                  type="date"
                  required
                  value={purchaseDate}
                  onChange={(event) => {
                    setPurchaseDate(event.target.value)
                    if (paymentMethod !== 'credit_card') {
                      setFirstDueDate(event.target.value)
                    }
                  }}
                  className="w-full bg-[#101411] border border-white/10 rounded-xl p-3 outline-none focus:border-lime-400 [color-scheme:dark]"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Forma de pagamento *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(event) => {
                    const method = event.target.value as PaymentMethod
                    setPaymentMethod(method)
                    if (method !== 'credit_card') {
                      setInstallmentsCount('1')
                      setFirstDueDate(purchaseDate)
                    }
                  }}
                  className="w-full bg-[#101411] border border-white/10 rounded-xl p-3 outline-none focus:border-lime-400"
                >
                  {Object.entries(paymentLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {isCreditCard && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">
                      Número de parcelas *
                    </label>
                    <select
                      value={installmentsCount}
                      onChange={(event) => setInstallmentsCount(event.target.value)}
                      className="w-full bg-[#101411] border border-white/10 rounded-xl p-3 outline-none focus:border-lime-400"
                    >
                      {Array.from({ length: 48 }, (_, index) => index + 1).map((number) => (
                        <option key={number} value={number}>
                          {number}x
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-2">
                      Primeiro vencimento *
                    </label>
                    <input
                      type="date"
                      required
                      value={firstDueDate}
                      onChange={(event) => setFirstDueDate(event.target.value)}
                      className="w-full bg-[#101411] border border-white/10 rounded-xl p-3 outline-none focus:border-lime-400 [color-scheme:dark]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Observações
                </label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="Informações adicionais sobre a compra..."
                  className="w-full bg-[#101411] border border-white/10 rounded-xl p-3 outline-none focus:border-lime-400 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving || !products.length}
                className="w-full bg-[#a3e635] text-[#101411] font-bold rounded-xl p-4 hover:bg-lime-300 transition disabled:opacity-50"
              >
                {saving ? 'Registrando compra...' : 'Confirmar compra'}
              </button>
            </form>
          </section>
        )}

        {/* Histórico */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">
              Histórico de compras
            </h2>

            <button
              onClick={() => void loadData()}
              className="text-sm text-lime-300"
            >
              Atualizar
            </button>
          </div>

          {loading ? (
            <div className="text-center text-gray-400 py-10">
              Carregando compras...
            </div>
          ) : purchases.length === 0 ? (
            <div className="bg-[#1b211d] border border-white/5 rounded-2xl p-8 text-center">
              <p className="text-3xl mb-3">🛒</p>
              <p className="font-semibold">
                Nenhuma compra registrada
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Suas aquisições aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {purchases.map((purchase) => (
                <article
                  key={purchase.id}
                  className="bg-[#1b211d] border border-white/5 rounded-2xl p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">
                        {purchase.products?.name ?? 'Produto'}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        {dateFormat(purchase.purchase_date)}
                      </p>
                    </div>

                    <p className="font-bold text-lime-300 whitespace-nowrap">
                      {currency(Number(purchase.total_amount))}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-sm text-gray-400">
                    <span>
                      {purchase.quantity} unidade(s)
                    </span>
                    <span>
                      {currency(Number(purchase.unit_price))} / un.
                    </span>
                  </div>

                  {purchase.seller_name && (
                    <p className="text-xs text-gray-500 mt-3">
                      Fornecedor: {purchase.seller_name}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
