
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  addAcquisition,
  createProduct,
  deleteProduct,
  getAcquisitionHistory,
  getProducts,
  updateProduct,
} from '../services/productService'
import type { Acquisition } from '../services/productService'
import type {
  Product,
  ProductCondition,
  ProductInput,
  ProductStatus,
} from '../types/product'

const emptyForm: ProductInput = {
  category_id: null,
  name: '',
  description: null,
  brand: null,
  model: null,
  condition: 'used',
  status: 'in_stock',
  quantity: 1,
  sku: null,
  purchase_price: 0,
  suggested_sale_price: 0,
  notes: null,
  purchased_at: new Date().toISOString().slice(0, 10),
}

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)

const conditionLabels: Record<ProductCondition, string> = {
  new: 'Novo',
  used: 'Usado',
  refurbished: 'Recondicionado',
}

const statusLabels: Record<ProductStatus, string> = {
  in_stock: 'Em estoque',
  reserved: 'Reservado',
  sold: 'Vendido',
  returned: 'Devolvido',
  written_off: 'Baixado',
}

export default function Products() {
  const { user } = useAuth()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState<ProductInput>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [acquisitions, setAcquisitions] = useState<Acquisition[]>([])
  const [showAcquisitionForm, setShowAcquisitionForm] = useState(false)
  const [acquisitionLoading, setAcquisitionLoading] = useState(false)
  const [acquisitionSaving, setAcquisitionSaving] = useState(false)
  const [acquisitionError, setAcquisitionError] = useState('')
  const [acquisitionForm, setAcquisitionForm] = useState({
    quantity: 1,
    unit_price: 0,
    purchase_date: new Date().toISOString().slice(0, 10),
    seller_name: '',
    seller_phone: '',
    notes: '',
  })

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const [productData, categoryResult] = await Promise.all([
        getProducts(),
        supabase.from('categories').select('id, name').order('name'),
      ])

      if (categoryResult.error) throw categoryResult.error

      setProducts(productData)
      setCategories(categoryResult.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os produtos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const term = search.toLowerCase()

      const matchesSearch =
        product.name.toLowerCase().includes(term) ||
        (product.brand ?? '').toLowerCase().includes(term) ||
        (product.model ?? '').toLowerCase().includes(term) ||
        (product.sku ?? '').toLowerCase().includes(term)

      const matchesStatus =
        statusFilter === 'all' || product.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [products, search, statusFilter])

  const stockProducts = products.filter(
    (product) => product.status === 'in_stock' || product.status === 'reserved'
  )

  const totalUnits = stockProducts.reduce(
    (total, product) => total + product.quantity,
    0
  )

  const invested = stockProducts.reduce(
    (total, product) => total + product.purchase_price * product.quantity,
    0
  )

  const potentialRevenue = stockProducts.reduce(
    (total, product) => total + product.suggested_sale_price * product.quantity,
    0
  )

  function openNewForm() {
    setEditingId(null)
    setForm({ ...emptyForm })
    setError('')
    setShowForm(true)
  }

  function openEditForm(product: Product) {
    setEditingId(product.id)

    setForm({
      category_id: product.category_id,
      name: product.name,
      description: product.description,
      brand: product.brand,
      model: product.model,
      condition: product.condition,
      status: product.status,
      quantity: product.quantity,
      sku: product.sku,
      purchase_price: product.purchase_price,
      suggested_sale_price: product.suggested_sale_price,
      notes: product.notes,
      purchased_at: product.purchased_at,
    })

    setError('')
    setShowForm(true)
  }

  function changeField<K extends keyof ProductInput>(
    field: K,
    value: ProductInput[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!user) return

    if (form.name.trim().length < 2) {
      setError('Informe um nome com pelo menos 2 caracteres.')
      return
    }

    if (form.quantity < 0 || !Number.isInteger(form.quantity)) {
      setError('Informe uma quantidade inteira igual ou maior que zero.')
      return
    }

    if (form.purchase_price < 0 || form.suggested_sale_price < 0) {
      setError('Os valores não podem ser negativos.')
      return
    }

    try {
      setSaving(true)
      setError('')

      const payload: ProductInput = {
        ...form,
        name: form.name.trim(),
        brand: form.brand?.trim() || null,
        model: form.model?.trim() || null,
        sku: form.sku?.trim() || null,
        description: form.description?.trim() || null,
        notes: form.notes?.trim() || null,
      }

      if (editingId) {
        await updateProduct(editingId, payload)
      } else {
        await createProduct(payload, user.id)
      }

      setShowForm(false)
      setForm({ ...emptyForm })
      setEditingId(null)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar produto.')
    } finally {
      setSaving(false)
    }
  }

  async function openProductDetails(product: Product) {
    setSelectedProduct(product)
    setShowAcquisitionForm(false)
    setAcquisitionError('')
    setAcquisitionLoading(true)

    try {
      const history = await getAcquisitionHistory(product.id)
      setAcquisitions(history)
    } catch (err) {
      setAcquisitionError(
        err instanceof Error ? err.message : 'Erro ao carregar histórico.'
      )
    } finally {
      setAcquisitionLoading(false)
    }
  }

  async function handleAddAcquisition(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedProduct) return

    if (acquisitionForm.quantity <= 0 || !Number.isInteger(acquisitionForm.quantity)) {
      setAcquisitionError('Informe uma quantidade inteira maior que zero.')
      return
    }

    if (acquisitionForm.unit_price < 0 || !Number.isFinite(acquisitionForm.unit_price)) {
      setAcquisitionError('Informe um custo unitário válido.')
      return
    }

    try {
      setAcquisitionSaving(true)
      setAcquisitionError('')

      await addAcquisition({
        product_id: selectedProduct.id,
        quantity: acquisitionForm.quantity,
        unit_price: acquisitionForm.unit_price,
        purchase_date: acquisitionForm.purchase_date,
        seller_name: acquisitionForm.seller_name.trim() || null,
        seller_phone: acquisitionForm.seller_phone.trim() || null,
        notes: acquisitionForm.notes.trim() || null,
      })

      const [updatedProducts, history] = await Promise.all([
        getProducts(),
        getAcquisitionHistory(selectedProduct.id),
      ])

      setProducts(updatedProducts)
      setAcquisitions(history)

      const updatedProduct = updatedProducts.find(
        (item) => item.id === selectedProduct.id
      )
      if (updatedProduct) setSelectedProduct(updatedProduct)

      setAcquisitionForm({
        quantity: 1,
        unit_price: 0,
        purchase_date: new Date().toISOString().slice(0, 10),
        seller_name: '',
        seller_phone: '',
        notes: '',
      })
      setShowAcquisitionForm(false)
    } catch (err) {
      setAcquisitionError(
        err instanceof Error ? err.message : 'Erro ao registrar aquisição.'
      )
    } finally {
      setAcquisitionSaving(false)
    }
  }

  async function handleDelete(product: Product) {
    const confirmed = window.confirm(
      `Deseja realmente excluir "${product.name}"?`
    )

    if (!confirmed) return

    try {
      await deleteProduct(product.id)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir produto.')
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 px-4 pt-6 pb-32 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-green-400">Gerenciamento</p>
            <h1 className="mt-1 text-3xl font-bold">Produtos e estoque</h1>
            <p className="mt-2 text-sm text-gray-400">
              Gerencie seus produtos e acompanhe seu investimento.
            </p>
          </div>

          <button
            onClick={openNewForm}
            className="rounded-xl bg-green-500 px-5 py-3 font-semibold text-gray-950 transition hover:bg-green-400"
          >
            + Novo produto
          </button>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard label="Unidades em estoque" value={String(totalUnits)} />
          <SummaryCard label="Valor investido" value={money(invested)} />
          <SummaryCard label="Venda potencial" value={money(potentialRevenue)} />
        </div>

        {showForm && (
          <section className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-5 sm:p-7">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">
                  {editingId ? 'Editar produto' : 'Cadastrar produto'}
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  Preencha as informações do item.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg px-3 py-2 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Nome do produto *">
                  <input
                    required
                    value={form.name}
                    onChange={(e) => changeField('name', e.target.value)}
                    placeholder="Ex.: iPhone 13"
                    className="input"
                  />
                </Field>

                <Field label="Marca">
                  <input
                    value={form.brand ?? ''}
                    onChange={(e) => changeField('brand', e.target.value)}
                    placeholder="Ex.: Apple"
                    className="input"
                  />
                </Field>

                <Field label="Modelo">
                  <input
                    value={form.model ?? ''}
                    onChange={(e) => changeField('model', e.target.value)}
                    placeholder="Ex.: 128GB"
                    className="input"
                  />
                </Field>

                <Field label="Categoria">
                  <select
                    value={form.category_id ?? ''}
                    onChange={(e) =>
                      changeField('category_id', e.target.value || null)
                    }
                    className="input"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Condição">
                  <select
                    value={form.condition}
                    onChange={(e) =>
                      changeField('condition', e.target.value as ProductCondition)
                    }
                    className="input"
                  >
                    <option value="new">Novo</option>
                    <option value="used">Usado</option>
                    <option value="refurbished">Recondicionado</option>
                  </select>
                </Field>

                <Field label="Situação">
                  <select
                    value={form.status}
                    onChange={(e) =>
                      changeField('status', e.target.value as ProductStatus)
                    }
                    className="input"
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Quantidade">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={form.quantity}
                    onChange={(e) =>
                      changeField('quantity', Number(e.target.value))
                    }
                    className="input"
                  />
                </Field>

                <Field label="Código / SKU">
                  <input
                    value={form.sku ?? ''}
                    onChange={(e) => changeField('sku', e.target.value)}
                    placeholder="Ex.: IPH-001"
                    className="input"
                  />
                </Field>

                <Field label="Data da aquisição">
                  <input
                    type="date"
                    value={form.purchased_at ?? ''}
                    onChange={(e) =>
                      changeField('purchased_at', e.target.value || null)
                    }
                    className="input"
                  />
                </Field>

                <Field label="Preço de compra (R$)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={form.purchase_price}
                    onChange={(e) =>
                      changeField('purchase_price', Number(e.target.value))
                    }
                    className="input"
                  />
                </Field>

                <Field label="Preço sugerido de venda (R$)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={form.suggested_sale_price}
                    onChange={(e) =>
                      changeField('suggested_sale_price', Number(e.target.value))
                    }
                    className="input"
                  />
                </Field>
              </div>

              <Field label="Descrição">
                <textarea
                  rows={3}
                  value={form.description ?? ''}
                  onChange={(e) => changeField('description', e.target.value)}
                  placeholder="Detalhes e características do produto..."
                  className="input"
                />
              </Field>

              <Field label="Observações internas">
                <textarea
                  rows={2}
                  value={form.notes ?? ''}
                  onChange={(e) => changeField('notes', e.target.value)}
                  placeholder="Estado de conservação, acessórios, detalhes..."
                  className="input"
                />
              </Field>

              {error && (
                <p className="rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-300">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-gray-700 px-5 py-3 text-gray-300 hover:bg-gray-800"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-green-500 px-6 py-3 font-semibold text-gray-950 hover:bg-green-400 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar produto'}
                </button>
              </div>
            </form>
          </section>
        )}

        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4">
            <section className="my-auto w-full max-w-2xl rounded-2xl border border-gray-800 bg-gray-900 p-5 sm:p-7">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-green-400">Detalhes do produto</p>
                  <h2 className="mt-1 text-2xl font-bold">{selectedProduct.name}</h2>
                  <p className="mt-1 text-sm text-gray-400">
                    {[selectedProduct.brand, selectedProduct.model].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="rounded-lg px-3 py-2 text-gray-400 hover:bg-gray-800"
                >
                  Fechar
                </button>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-gray-800 p-4">
                  <p className="text-sm text-gray-400">Estoque atual</p>
                  <p className="mt-2 text-2xl font-bold">{selectedProduct.quantity} un.</p>
                </div>
                <div className="rounded-xl bg-gray-800 p-4">
                  <p className="text-sm text-gray-400">Custo médio</p>
                  <p className="mt-2 text-2xl font-bold text-green-400">{money(selectedProduct.purchase_price)}</p>
                </div>
              </div>

              <div className="mb-5 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">Histórico de aquisições</h3>
                <button
                  onClick={() => {
                    setShowAcquisitionForm((current) => !current)
                    setAcquisitionError('')
                  }}
                  className="rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-green-400"
                >
                  + Adicionar aquisição
                </button>
              </div>

              {showAcquisitionForm && (
                <form onSubmit={handleAddAcquisition} className="mb-6 space-y-4 rounded-xl border border-gray-700 bg-gray-800/60 p-4">
                  <h4 className="font-semibold">Nova aquisição</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Quantidade adquirida">
                      <input type="number" min="1" step="1" required value={acquisitionForm.quantity}
                        onChange={(e) => setAcquisitionForm((current) => ({ ...current, quantity: Number(e.target.value) }))} className="input" />
                    </Field>
                    <Field label="Custo unitário (R$)">
                      <input type="number" min="0" step="0.01" required value={acquisitionForm.unit_price}
                        onChange={(e) => setAcquisitionForm((current) => ({ ...current, unit_price: Number(e.target.value) }))} className="input" />
                    </Field>
                    <Field label="Data da aquisição">
                      <input type="date" required value={acquisitionForm.purchase_date}
                        onChange={(e) => setAcquisitionForm((current) => ({ ...current, purchase_date: e.target.value }))} className="input" />
                    </Field>
                    <Field label="Fornecedor / vendedor">
                      <input value={acquisitionForm.seller_name}
                        onChange={(e) => setAcquisitionForm((current) => ({ ...current, seller_name: e.target.value }))}
                        placeholder="Nome do vendedor" className="input" />
                    </Field>
                    <Field label="Telefone do vendedor">
                      <input value={acquisitionForm.seller_phone}
                        onChange={(e) => setAcquisitionForm((current) => ({ ...current, seller_phone: e.target.value }))}
                        placeholder="Telefone (opcional)" className="input" />
                    </Field>
                  </div>
                  <Field label="Observações">
                    <textarea rows={2} value={acquisitionForm.notes}
                      onChange={(e) => setAcquisitionForm((current) => ({ ...current, notes: e.target.value }))}
                      placeholder="Informações adicionais..." className="input" />
                  </Field>
                  <div className="rounded-lg bg-gray-900 p-3">
                    <p className="text-sm text-gray-400">Total da aquisição</p>
                    <p className="mt-1 text-xl font-bold text-green-400">{money(acquisitionForm.quantity * acquisitionForm.unit_price)}</p>
                  </div>
                  {acquisitionError && (
                    <p className="rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-300">{acquisitionError}</p>
                  )}
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => setShowAcquisitionForm(false)} className="rounded-xl border border-gray-700 px-4 py-2 text-gray-300">Cancelar</button>
                    <button type="submit" disabled={acquisitionSaving} className="rounded-xl bg-green-500 px-5 py-2 font-semibold text-gray-950 disabled:opacity-50">
                      {acquisitionSaving ? 'Registrando...' : 'Registrar aquisição'}
                    </button>
                  </div>
                </form>
              )}

              {acquisitionError && !showAcquisitionForm && (
                <p className="mb-4 rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-300">{acquisitionError}</p>
              )}

              {acquisitionLoading ? (
                <p className="py-8 text-center text-gray-400">Carregando histórico...</p>
              ) : acquisitions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-700 p-6 text-center text-sm text-gray-400">
                  Nenhuma aquisição registrada para este produto.
                </p>
              ) : (
                <div className="space-y-3">
                  {acquisitions.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-800 bg-gray-800/50 p-4">
                      <div>
                        <p className="font-medium">{item.quantity} unidade(s) · {money(Number(item.unit_price))} cada</p>
                        <p className="mt-1 text-xs text-gray-400">
                          {new Date(`${item.purchase_date}T12:00:00`).toLocaleDateString('pt-BR')}
                          {item.seller_name ? ` · ${item.seller_name}` : ''}
                        </p>
                      </div>
                      <p className="whitespace-nowrap font-semibold text-green-400">{money(Number(item.total_amount))}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, marca, modelo ou SKU..."
              className="input flex-1"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input sm:w-48"
            >
              <option value="all">Todas as situações</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {error && !showForm && (
            <p className="mb-4 rounded-lg bg-red-950/50 p-3 text-sm text-red-300">
              {error}
            </p>
          )}

          {loading ? (
            <p className="py-10 text-center text-gray-400">Carregando produtos...</p>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-lg font-semibold">Nenhum produto encontrado</p>
              <p className="mt-2 text-sm text-gray-400">
                Cadastre seu primeiro produto para começar a controlar o estoque.
              </p>
              <button
                onClick={openNewForm}
                className="mt-5 rounded-xl bg-green-500 px-5 py-3 font-semibold text-gray-950"
              >
                Cadastrar primeiro produto
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-gray-800 text-gray-400">
                  <tr>
                    <th className="px-3 py-4 font-medium">Produto</th>
                    <th className="px-3 py-4 font-medium">Condição</th>
                    <th className="px-3 py-4 font-medium">Quantidade</th>
                    <th className="px-3 py-4 font-medium">Compra</th>
                    <th className="px-3 py-4 font-medium">Venda sugerida</th>
                    <th className="px-3 py-4 font-medium">Situação</th>
                    <th className="px-3 py-4 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-800/40">
                      <td className="px-3 py-4">
                        <p className="font-semibold">{product.name}</p>
                        <p className="mt-1 text-xs text-gray-400">
                          {[product.brand, product.model].filter(Boolean).join(' · ') || 'Sem marca/modelo'}
                        </p>
                      </td>
                      <td className="px-3 py-4 text-gray-300">
                        {conditionLabels[product.condition]}
                      </td>
                      <td className="px-3 py-4">{product.quantity}</td>
                      <td className="px-3 py-4">{money(product.purchase_price)}</td>
                      <td className="px-3 py-4">{money(product.suggested_sale_price)}</td>
                      <td className="px-3 py-4">
                        <span className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-300">
                          {statusLabels[product.status]}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => void openProductDetails(product)}
                            className="rounded-lg border border-green-800 px-3 py-2 text-xs text-green-400 hover:bg-green-950"
                          >
                            Detalhes
                          </button>
                          <button
                            onClick={() => openEditForm(product)}
                            className="rounded-lg border border-gray-700 px-3 py-2 text-xs hover:bg-gray-700"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => void handleDelete(product)}
                            className="rounded-lg border border-red-900 px-3 py-2 text-xs text-red-300 hover:bg-red-950"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-3 text-2xl font-bold">{value}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-gray-300">{label}</span>
      {children}
    </label>
  )
}
