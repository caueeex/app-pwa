
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  getSaleProducts,
  getSales,
  registerSale,
  type Sale,
  type SaleProduct,
} from '../services/salesService'

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

    // Ajusta a última parcela para compensar diferenças de centavos.
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
    <main className="min-h-screen bg-slate-950 text-white p-5 pb-28">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">Resale Manager</p>
          <h1 className="text-2xl font-bold">Vendas</h1>
          <p className="text-sm text-slate-400 mt-1">
            Acompanhe suas vendas e recebimentos.
          </p>
        </div>

        <button
          onClick={() => {
            setShowForm((value) => !value)
            setError('')
            setSuccess('')
          }}
          className="rounded-xl bg-green-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-green-400"
        >
          {showForm ? 'Fechar' : 'Nova venda'}
        </button>
      </header>

      <section className="grid grid-cols-2 gap-3 mt-7">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">Faturamento</p>
          <p className="mt-2 text-lg font-bold">
            {currency(totals.revenue)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">
            Lucro bruto registrado
          </p>
          <p className="mt-2 text-lg font-bold text-green-400">
            {currency(totals.profit)}
          </p>
        </div>
      </section>

      {error && (
        <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-5 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300">
          {success}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5"
        >
          <div>
            <h2 className="text-lg font-semibold">
              Registrar venda
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              O estoque será atualizado após a confirmação.
            </p>
          </div>

          <label className="block text-sm">
            <span className="mb-1.5 block text-slate-300">
              Produto
            </span>

            <select
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value)
                setUnitPrice('')
              }}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
            >
              {products.length === 0 && (
                <option value="">Nenhum produto disponível</option>
              )}

              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} · {product.quantity} disponível(is)
                </option>
              ))}
            </select>
          </label>

          {selectedProduct && (
            <p className="text-xs text-slate-400">
              Estoque disponível: {selectedProduct.quantity} ·
              Custo médio:{' '}
              {currency(Number(selectedProduct.purchase_price))}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1.5 block text-slate-300">
                Quantidade
              </span>

              <input
                type="number"
                min="1"
                max={selectedProduct?.quantity || 1}
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block text-slate-300">
                Preço unitário (R$)
              </span>

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
              />
            </label>
          </div>

          <div className="rounded-xl bg-slate-950 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">
                Total da venda
              </span>
              <strong>{currency(total)}</strong>
            </div>

            <div className="mt-2 flex justify-between">
              <span className="text-slate-400">
                Lucro bruto estimado
              </span>
              <strong
                className={
                  estimatedProfit >= 0
                    ? 'text-green-400'
                    : 'text-red-400'
                }
              >
                {currency(estimatedProfit)}
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1.5 block text-slate-300">
                Data da venda
              </span>

              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block text-slate-300">
                Canal
              </span>

              <select
                value={marketplace}
                onChange={(e) => setMarketplace(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
              >
                {marketplaceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1.5 block text-slate-300">
                Comprador
              </span>

              <input
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Nome do comprador"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block text-slate-300">
                Telefone
              </span>

              <input
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
              />
            </label>
          </div>

          <div className="border-t border-slate-800 pt-4 space-y-3">
            <h3 className="font-semibold">Pagamento</h3>

            <label className="block text-sm">
              <span className="mb-1.5 block text-slate-300">
                Forma de pagamento
              </span>

              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
              >
                <option value="pix">Pix</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="credito">Cartão de crédito</option>
                <option value="debito">Cartão de débito</option>
                <option value="transferencia">Transferência</option>
                <option value="outro">Outro</option>
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block text-slate-300">
                Valor já recebido (R$)
              </span>

              <input
                type="number"
                min="0"
                max={total}
                step="0.01"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
              />
            </label>

            <div className="flex justify-between text-sm">
              <span className="text-slate-400">
                Valor pendente
              </span>
              <strong>{currency(pending)}</strong>
            </div>

            {pending > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="mb-1.5 block text-slate-300">
                    Número de parcelas
                  </span>

                  <input
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
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1.5 block text-slate-300">
                    1º vencimento
                  </span>

                  <input
                    type="date"
                    value={firstDueDate}
                    onChange={(e) => setFirstDueDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
                  />
                </label>
              </div>
            )}
          </div>

          <label className="block text-sm">
            <span className="mb-1.5 block text-slate-300">
              Observações
            </span>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Informações adicionais..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
            />
          </label>

          <button
            type="submit"
            disabled={saving || !selectedProduct}
            className="w-full rounded-xl bg-green-500 p-3 font-semibold text-slate-950 hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Registrando venda...' : 'Confirmar venda'}
          </button>
        </form>
      )}

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Histórico de vendas
          </h2>

          <button
            onClick={loadData}
            disabled={loading}
            className="text-sm text-green-400 disabled:opacity-50"
          >
            Atualizar
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">
            Carregando vendas...
          </p>
        ) : sales.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center">
            <p className="font-medium">
              Nenhuma venda registrada
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Suas vendas aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sales.map((sale) => (
              <article
                key={sale.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">
                      {sale.products?.name || 'Produto'}
                    </h3>

                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(
                        `${sale.sale_date}T12:00:00`
                      ).toLocaleDateString('pt-BR')}
                      {' · '}
                      {sale.quantity} unidade(s)
                    </p>

                    {sale.buyer_name && (
                      <p className="mt-1 text-xs text-slate-400">
                        Comprador: {sale.buyer_name}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="font-bold">
                      {currency(Number(sale.total_amount))}
                    </p>

                    <p className="mt-1 text-xs text-green-400">
                      Lucro {currency(Number(sale.profit_amount || 0))}
                    </p>
                  </div>
                </div>

                <div className="mt-3 border-t border-slate-800 pt-3 text-xs text-slate-500">
                  Custo unitário registrado:{' '}
                  {currency(Number(sale.unit_cost_snapshot || 0))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
