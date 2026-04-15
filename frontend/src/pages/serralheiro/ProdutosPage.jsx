import { useEffect, useState } from 'react'
import useAutoRefresh from '../../hooks/useAutoRefresh'
import { Plus, Search, Package, Pencil, Trash2, ArrowUpDown } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import api from '../../services/api'

const CATEGORIES = [
  'Calha', 'Portão', 'Grade', 'Janela', 'Porta', 'Rufo',
  'Estrutura Metálica', 'Esquadria', 'Cobertura', 'Serviço', 'Outros',
]
const UNITS = ['un', 'm', 'm²', 'm³', 'kg', 'par', 'conjunto', 'hora']

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  category: z.string().min(1, 'Categoria obrigatória'),
  unit: z.string().min(1, 'Unidade obrigatória'),
  price: z.coerce.number().min(0, 'Preço inválido'),
  cost: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().min(0).optional(),
  minStock: z.coerce.number().min(0).optional(),
  description: z.string().optional(),
})

const Field = ({ label, error, children }) => (
  <div>
    <label className="block text-xs font-medium mb-1.5" style={{ color: '#b8b8c8' }}>{label}</label>
    {children}
    {error && <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>{error}</p>}
  </div>
)

const inp = (err) => ({
  background: '#242429', border: `1px solid ${err ? '#ef4444' : '#3d3d47'}`,
  color: '#e0e0ec', borderRadius: 10, padding: '9px 12px', fontSize: 13, width: '100%', outline: 'none',
})

const ProductModal = ({ product, onClose, onSuccess }) => {
  const isEdit = !!product
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: isEdit ? product : { unit: 'un', stock: 0, minStock: 0, cost: 0 },
  })

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        await api.put(`/s/products/${product._id}`, data)
        toast.success('Produto atualizado!')
      } else {
        await api.post('/s/products', data)
        toast.success('Produto cadastrado!')
      }
      onSuccess()
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erro ao salvar produto')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-lg rounded-2xl my-4" style={{ background: '#1a1a1f', border: '1px solid #2e2e35' }}>
        <div className="p-5" style={{ borderBottom: '1px solid #2e2e35' }}>
          <h2 className="text-base font-bold" style={{ color: '#e0e0ec' }}>
            {isEdit ? 'Editar Produto' : 'Novo Produto / Serviço'}
          </h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Field label="Nome *" error={errors.name?.message}>
                <input {...register('name')} style={inp(errors.name)} placeholder="Ex: Calha Meia Cana 3m" />
              </Field>
            </div>
            <Field label="Categoria *" error={errors.category?.message}>
              <select {...register('category')} style={inp(errors.category)}>
                <option value="">Selecione...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Unidade *" error={errors.unit?.message}>
              <select {...register('unit')} style={inp(errors.unit)}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="Preço de venda (R$) *" error={errors.price?.message}>
              <input {...register('price')} type="number" step="0.01" style={inp(errors.price)} placeholder="0,00" />
            </Field>
            <Field label="Custo (R$)">
              <input {...register('cost')} type="number" step="0.01" style={inp()} placeholder="0,00" />
            </Field>
            <Field label="Estoque atual">
              <input {...register('stock')} type="number" step="0.01" style={inp()} placeholder="0" />
            </Field>
            <Field label="Estoque mínimo">
              <input {...register('minStock')} type="number" step="0.01" style={inp()} placeholder="0" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Descrição">
                <textarea {...register('description')} rows={2} style={{ ...inp(), resize: 'none' }}
                  placeholder="Detalhes sobre o produto ou serviço..." />
              </Field>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: '#2e2e35', color: '#b8b8c8' }}>
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea6c10)', color: 'white', opacity: isSubmitting ? 0.7 : 1 }}>
              {isSubmitting ? 'Salvando...' : isEdit ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal de Ajuste de Estoque ───────────────────────────────────────────────
const StockModal = ({ product, onClose, onSuccess }) => {
  const [type, setType] = useState('entrada')
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    const n = parseFloat(qty)
    if (!qty || isNaN(n) || n <= 0) return setError('Informe uma quantidade válida')
    setError('')
    setSaving(true)
    try {
      const delta = type === 'entrada' ? n : -n
      await api.post(`/s/products/${product._id}/stock`, { delta, reason })
      toast.success(`Estoque ${type === 'entrada' ? 'adicionado' : 'retirado'} com sucesso!`)
      onSuccess()
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erro ao ajustar estoque')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-sm rounded-2xl" style={{ background: '#1a1a1f', border: '1px solid #2e2e35' }}>
        <div className="p-5" style={{ borderBottom: '1px solid #2e2e35' }}>
          <h2 className="text-base font-bold" style={{ color: '#e0e0ec' }}>Ajustar Estoque</h2>
          <p className="text-xs mt-0.5" style={{ color: '#5c5c6b' }}>{product.name}</p>
        </div>
        <div className="p-5 space-y-4">
          {/* Estoque atual */}
          <div className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: '#242429' }}>
            <span className="text-sm" style={{ color: '#8a8a9a' }}>Estoque atual</span>
            <span className="text-base font-bold" style={{ color: '#f97316' }}>
              {product.stock} {product.unit}
            </span>
          </div>

          {/* Tipo */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid #3d3d47' }}>
            {[{ v: 'entrada', label: '+ Entrada' }, { v: 'saida', label: '− Saída' }].map(({ v, label }) => (
              <button key={v} onClick={() => setType(v)}
                className="flex-1 py-2.5 text-sm font-semibold transition-all"
                style={{
                  background: type === v ? (v === 'entrada' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)') : '#242429',
                  color: type === v ? (v === 'entrada' ? '#22c55e' : '#ef4444') : '#8a8a9a',
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* Quantidade */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#b8b8c8' }}>
              Quantidade ({product.unit}) *
            </label>
            <input value={qty} onChange={e => { setQty(e.target.value); setError('') }}
              type="number" step="0.01" min="0.01"
              style={{ background: '#242429', border: `1px solid ${error ? '#ef4444' : '#3d3d47'}`, color: '#e0e0ec', borderRadius: 10, padding: '10px 14px', fontSize: 14, width: '100%', outline: 'none' }}
              placeholder="0" />
            {error && <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>{error}</p>}
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#b8b8c8' }}>
              Motivo (opcional)
            </label>
            <input value={reason} onChange={e => setReason(e.target.value)}
              style={{ background: '#242429', border: '1px solid #3d3d47', color: '#e0e0ec', borderRadius: 10, padding: '10px 14px', fontSize: 14, width: '100%', outline: 'none' }}
              placeholder="Ex: Compra, uso em obra, ajuste..." />
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: '#2e2e35', color: '#b8b8c8' }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{
                background: type === 'entrada' ? 'rgba(34,197,94,0.8)' : 'rgba(239,68,68,0.8)',
                color: 'white', opacity: saving ? 0.7 : 1,
              }}>
              {saving ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const CATEGORY_COLORS = {
  'Calha': '#60a5fa', 'Portão': '#f97316', 'Grade': '#a78bfa',
  'Janela': '#34d399', 'Porta': '#fb923c', 'Rufo': '#94a3b8',
  'Estrutura Metálica': '#fbbf24', 'Esquadria': '#4ade80',
  'Cobertura': '#38bdf8', 'Serviço': '#f472b6', 'Outros': '#8a8a9a',
}

const ProdutosPage = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [modal, setModal] = useState(null)
  const [stockModal, setStockModal] = useState(null)

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/s/products?search=${search}&category=${category}&page=${page}&limit=15`)
      setProducts(res.data.data.products)
      setTotalPages(res.data.data.pages)
    } catch { toast.error('Erro ao carregar produtos') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchProducts() }, [search, category, page])
  useAutoRefresh(fetchProducts)

  const handleDelete = async (product) => {
    if (!confirm(`Desativar "${product.name}"?`)) return
    try {
      await api.delete(`/s/products/${product._id}`)
      toast.success('Produto desativado')
      fetchProducts()
    } catch { toast.error('Erro ao desativar produto') }
  }

  const fmt = (v) => Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold" style={{ color: '#e0e0ec' }}>Produtos e Serviços</h2>
          <p className="text-sm mt-0.5" style={{ color: '#8a8a9a' }}>Catálogo completo da sua serralheria</p>
        </div>
        <button onClick={() => setModal('new')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #f97316, #ea6c10)', color: 'white' }}>
          <Plus size={15} /> Novo Produto
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl flex-1 min-w-48"
          style={{ background: '#1a1a1f', border: '1px solid #2e2e35' }}>
          <Search size={16} style={{ color: '#5c5c6b', flexShrink: 0 }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar produto..."
            className="flex-1 bg-transparent outline-none text-base"
            style={{ color: '#e0e0ec' }} />
        </div>
        <select value={category} onChange={e => { setCategory(e.target.value); setPage(1) }}
          className="py-2.5 px-3 rounded-xl text-sm outline-none"
          style={{ background: '#1a1a1f', border: '1px solid #2e2e35', color: '#e0e0ec' }}>
          <option value="">Todas categorias</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center h-48 items-center">
          <div className="w-8 h-8 border-4 rounded-full animate-spin"
            style={{ borderColor: '#3d3d47', borderTopColor: '#f97316' }} />
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl text-center py-14" style={{ background: '#1a1a1f', border: '1px solid #2e2e35' }}>
          <Package size={36} className="mx-auto mb-3" style={{ color: '#3d3d47' }} />
          <p style={{ color: '#8a8a9a' }}>
            {search || category ? 'Nenhum produto encontrado' : 'Cadastre seu primeiro produto ou serviço'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {products.map((p) => {
            const catColor = CATEGORY_COLORS[p.category] ?? '#8a8a9a'
            const margin = p.cost > 0 ? (((p.price - p.cost) / p.price) * 100).toFixed(0) : null
            const lowStock = p.minStock > 0 && p.stock <= p.minStock
            return (
              <div key={p._id} className="rounded-xl p-4 flex flex-col gap-3"
                style={{ background: '#1a1a1f', border: `1px solid ${lowStock ? 'rgba(239,68,68,0.3)' : '#2e2e35'}` }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: `${catColor}22`, color: catColor }}>
                      {p.category}
                    </span>
                    <p className="text-sm font-semibold mt-1.5 truncate" style={{ color: '#e0e0ec' }}>{p.name}</p>
                    {p.description && (
                      <p className="text-xs mt-0.5 line-clamp-1" style={{ color: '#5c5c6b' }}>{p.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-lg font-bold" style={{ color: '#f97316' }}>{fmt(p.price)}</p>
                    <p className="text-xs" style={{ color: '#5c5c6b' }}>
                      por {p.unit}
                      {margin && <span style={{ color: '#22c55e' }}> · {margin}% margem</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium" style={{ color: lowStock ? '#ef4444' : '#8a8a9a' }}>
                      {p.stock} {p.unit}
                    </p>
                    <p className="text-xs" style={{ color: '#5c5c6b' }}>em estoque</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-1" style={{ borderTop: '1px solid #2e2e35' }}>
                  <button onClick={() => setModal(p)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs"
                    style={{ background: '#242429', color: '#8a8a9a' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#f97316'}
                    onMouseLeave={e => e.currentTarget.style.color = '#8a8a9a'}>
                    <Pencil size={12} /> Editar
                  </button>
                  <button onClick={() => setStockModal(p)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                    style={{ background: '#242429', color: '#8a8a9a' }}
                    title="Ajustar estoque"
                    onMouseEnter={e => e.currentTarget.style.color = '#22c55e'}
                    onMouseLeave={e => e.currentTarget.style.color = '#8a8a9a'}>
                    <ArrowUpDown size={12} />
                  </button>
                  <button onClick={() => handleDelete(p)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                    style={{ background: '#242429', color: '#8a8a9a' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color = '#8a8a9a'}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className="w-8 h-8 rounded-lg text-sm"
              style={{ background: p === page ? '#f97316' : '#1a1a1f', color: p === page ? 'white' : '#8a8a9a' }}>
              {p}
            </button>
          ))}
        </div>
      )}

      {modal && (
        <ProductModal
          product={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSuccess={fetchProducts}
        />
      )}

      {stockModal && (
        <StockModal
          product={stockModal}
          onClose={() => setStockModal(null)}
          onSuccess={fetchProducts}
        />
      )}
    </div>
  )
}

export default ProdutosPage
