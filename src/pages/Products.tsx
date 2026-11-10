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
      `Excluir "${product.name}"?\n\nCompras ligadas a este produto também serão removidas. Se houver vendas, exclua as vendas antes.`
    )

    if (!confirmed) return

    try {
      setError('')
      await deleteProduct(product.id)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir produto.')
    }
  }

  async function handleArchive(product: Product) {
    if (!user) return

    const confirmed = window.confirm(
      `Marcar "${product.name}" como baixado?\n\nO item sai do estoque ativo, mas o histórico permanece.`
    )

    if (!confirmed) return

    try {
      setError('')
      await updateProduct(product.id, {
        category_id: product.category_id,
        name: product.name,
        description: product.description,
        brand: product.brand,
        model: product.model,
        condition: product.condition,
        status: 'written_off',
        quantity: 0,
        sku: product.sku,
        purchase_price: product.purchase_price,
        suggested_sale_price: product.suggested_sale_price,
        notes: product.notes,
        purchased_at: product.purchased_at,
      })
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao baixar produto.')
    }
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Estoque"
        title="Produtos"
        subtitle="O que você tem parado e quanto já investiu."
        action={
          <Button size="sm" onClick={openNewForm}>
            Novo
          </Button>
        }
      />

      <div className="stack">
        <div className="grid-2">
          <Metric label="Unidades" value={String(totalUnits)} />
          <Metric label="Investido" value={money(invested)} />
        </div>
        <Metric
          label="Venda potencial"
          value={money(potentialRevenue)}
          hint="Somando preço sugerido do estoque"
        />

        {showForm && (
          <section className="sheet sheet-pad stack">
            <div className="page-header" style={{ marginBottom: 0 }}>
              <div>
                <h2 className="section-title">
                  {editingId ? 'Editar produto' : 'Novo produto'}
                </h2>
                <p className="page-sub">Dados essenciais do item.</p>
              </div>
              <Button variant="ghost" size="sm" type="button" onClick={() => setShowForm(false)}>
                Fechar
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="stack">
              <Field label="Nome *">
                <TextInput
                  required
                  value={form.name}
                  onChange={(e) => changeField('name', e.target.value)}
                  placeholder="Ex.: iPhone 13"
                />
              </Field>

              <div className="grid-2">
                <Field label="Marca">
                  <TextInput
                    value={form.brand ?? ''}
                    onChange={(e) => changeField('brand', e.target.value)}
                    placeholder="Apple"
                  />
                </Field>
                <Field label="Modelo">
                  <TextInput
                    value={form.model ?? ''}
                    onChange={(e) => changeField('model', e.target.value)}
                    placeholder="128GB"
                  />
                </Field>
              </div>

              <Field label="Categoria">
                <SelectInput
                  value={form.category_id ?? ''}
                  onChange={(e) =>
                    changeField('category_id', e.target.value || null)
                  }
                >
                  <option value="">Sem categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              <div className="grid-2">
                <Field label="Condição">
                  <SelectInput
                    value={form.condition}
                    onChange={(e) =>
                      changeField('condition', e.target.value as ProductCondition)
                    }
                  >
                    <option value="new">Novo</option>
                    <option value="used">Usado</option>
                    <option value="refurbished">Recondicionado</option>
                  </SelectInput>
                </Field>
                <Field label="Situação">
                  <SelectInput
                    value={form.status}
                    onChange={(e) =>
                      changeField('status', e.target.value as ProductStatus)
                    }
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </SelectInput>
                </Field>
              </div>

              <div className="grid-2">
                <Field label="Quantidade">
                  <TextInput
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={form.quantity}
                    onChange={(e) =>
                      changeField('quantity', Number(e.target.value))
                    }
                  />
                </Field>
                <Field label="SKU">
                  <TextInput
                    value={form.sku ?? ''}
                    onChange={(e) => changeField('sku', e.target.value)}
                    placeholder="IPH-001"
                  />
                </Field>
              </div>

              <Field label="Data da aquisição">
                <TextInput
                  type="date"
                  value={form.purchased_at ?? ''}
                  onChange={(e) =>
                    changeField('purchased_at', e.target.value || null)
                  }
                />
              </Field>

              <div className="grid-2">
                <Field label="Custo (R$)">
                  <TextInput
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={form.purchase_price}
                    onChange={(e) =>
                      changeField('purchase_price', Number(e.target.value))
                    }
                  />
                </Field>
                <Field label="Venda sugerida">
                  <TextInput
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={form.suggested_sale_price}
                    onChange={(e) =>
                      changeField('suggested_sale_price', Number(e.target.value))
                    }
                  />
                </Field>
              </div>

              <Field label="Descrição">
                <TextArea
                  rows={3}
                  value={form.description ?? ''}
                  onChange={(e) => changeField('description', e.target.value)}
                  placeholder="Detalhes do produto..."
                />
              </Field>

              <Field label="Observações">
                <TextArea
                  rows={2}
                  value={form.notes ?? ''}
                  onChange={(e) => changeField('notes', e.target.value)}
                  placeholder="Estado, acessórios..."
                />
              </Field>

              {error ? <Alert>{error}</Alert> : null}

              <div className="stack-sm">
                <Button type="submit" block disabled={saving}>
                  {saving ? 'Salvando...' : editingId ? 'Salvar' : 'Cadastrar'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  block
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </section>
        )}

        <section className="stack">
          <div className="stack-sm">
            <TextInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nome, marca, modelo ou SKU"
            />
            <SelectInput
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todas as situações</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </SelectInput>
          </div>

          {error && !showForm ? <Alert>{error}</Alert> : null}

          {loading ? (
            <p className="text-muted">Carregando produtos...</p>
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              title="Nada por aqui"
              text="Cadastre o primeiro item para começar o estoque."
              action={
                <Button onClick={openNewForm}>Cadastrar produto</Button>
              }
            />
          ) : (
            <div className="list">
              {filteredProducts.map((product) => (
                <article key={product.id} className="list-item">
                  <div className="list-item__top">
                    <div>
                      <h3 className="list-item__title">{product.name}</h3>
                      <p className="list-item__meta">
                        {[product.brand, product.model].filter(Boolean).join(' · ') ||
                          'Sem marca/modelo'}
                        {' · '}
                        {conditionLabels[product.condition]}
                      </p>
                    </div>
                    <p className="list-item__value">
                      {money(product.suggested_sale_price)}
                    </p>
                  </div>

                  <div className="row" style={{ flexWrap: 'wrap' }}>
                    <span className="chip chip-ok">{product.quantity} un.</span>
                    <span className="chip">{statusLabels[product.status]}</span>
                    <span className="chip">Custo {money(product.purchase_price)}</span>
                  </div>

                  <div className="row" style={{ flexWrap: 'wrap' }}>
                    <Button
                      size="sm"
                      variant="accent"
                      onClick={() => void openProductDetails(product)}
                    >
                      Detalhes
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditForm(product)}
                    >
                      Editar
                    </Button>
                    {product.status !== 'written_off' ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void handleArchive(product)}
                      >
                        Baixar
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => void handleDelete(product)}
                    >
                      Excluir
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedProduct && (
        <div className="overlay" role="dialog" aria-modal="true">
          <section className="drawer stack">
            <div className="page-header" style={{ marginBottom: 0 }}>
              <div>
                <p className="eyebrow">Produto</p>
                <h2 className="page-title" style={{ fontSize: '1.55rem' }}>
                  {selectedProduct.name}
                </h2>
                <p className="page-sub">
                  {[selectedProduct.brand, selectedProduct.model]
                    .filter(Boolean)
                    .join(' · ') || 'Sem marca/modelo'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedProduct(null)}
              >
                Fechar
              </Button>
            </div>

            <div className="grid-2">
              <Metric label="Estoque" value={`${selectedProduct.quantity} un.`} />
              <Metric
                label="Custo médio"
                value={money(selectedProduct.purchase_price)}
              />
            </div>

            <div className="section-head">
              <h3 className="section-title">Aquisições</h3>
              <Button
                size="sm"
                onClick={() => {
                  setShowAcquisitionForm((current) => !current)
                  setAcquisitionError('')
                }}
              >
                {showAcquisitionForm ? 'Fechar' : 'Adicionar'}
              </Button>
            </div>

            {showAcquisitionForm && (
              <form onSubmit={handleAddAcquisition} className="sheet sheet-pad stack">
                <div className="grid-2">
                  <Field label="Quantidade">
                    <TextInput
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={acquisitionForm.quantity}
                      onChange={(e) =>
                        setAcquisitionForm((current) => ({
                          ...current,
                          quantity: Number(e.target.value),
                        }))
                      }
                    />
                  </Field>
                  <Field label="Custo unitário">
                    <TextInput
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={acquisitionForm.unit_price}
                      onChange={(e) =>
                        setAcquisitionForm((current) => ({
                          ...current,
                          unit_price: Number(e.target.value),
                        }))
                      }
                    />
                  </Field>
                </div>

                <Field label="Data">
                  <TextInput
                    type="date"
                    required
                    value={acquisitionForm.purchase_date}
                    onChange={(e) =>
                      setAcquisitionForm((current) => ({
                        ...current,
                        purchase_date: e.target.value,
                      }))
                    }
                  />
                </Field>

                <div className="grid-2">
                  <Field label="Fornecedor">
                    <TextInput
                      value={acquisitionForm.seller_name}
                      onChange={(e) =>
                        setAcquisitionForm((current) => ({
                          ...current,
                          seller_name: e.target.value,
                        }))
                      }
                      placeholder="Nome"
                    />
                  </Field>
                  <Field label="Telefone">
                    <TextInput
                      value={acquisitionForm.seller_phone}
                      onChange={(e) =>
                        setAcquisitionForm((current) => ({
                          ...current,
                          seller_phone: e.target.value,
                        }))
                      }
                      placeholder="Opcional"
                    />
                  </Field>
                </div>

                <Field label="Observações">
                  <TextArea
                    rows={2}
                    value={acquisitionForm.notes}
                    onChange={(e) =>
                      setAcquisitionForm((current) => ({
                        ...current,
                        notes: e.target.value,
                      }))
                    }
                  />
                </Field>

                <Metric
                  label="Total da aquisição"
                  value={money(
                    acquisitionForm.quantity * acquisitionForm.unit_price
                  )}
                />

                {acquisitionError ? <Alert>{acquisitionError}</Alert> : null}

                <Button type="submit" block disabled={acquisitionSaving}>
                  {acquisitionSaving ? 'Registrando...' : 'Registrar aquisição'}
                </Button>
              </form>
            )}

            {acquisitionError && !showAcquisitionForm ? (
              <Alert>{acquisitionError}</Alert>
            ) : null}

            {acquisitionLoading ? (
              <p className="text-muted">Carregando histórico...</p>
            ) : acquisitions.length === 0 ? (
              <EmptyState
                title="Sem aquisições"
                text="Registre a primeira entrada deste produto."
              />
            ) : (
              <div className="list">
                {acquisitions.map((item) => (
                  <article key={item.id} className="list-item">
                    <div className="list-item__top">
                      <div>
                        <p className="list-item__title">
                          {item.quantity} un. · {money(Number(item.unit_price))}
                        </p>
                        <p className="list-item__meta">
                          {new Date(`${item.purchase_date}T12:00:00`).toLocaleDateString('pt-BR')}
                          {item.seller_name ? ` · ${item.seller_name}` : ''}
                        </p>
                      </div>
                      <p className="list-item__value text-ok">
                        {money(Number(item.total_amount))}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </Page>
  )
}
