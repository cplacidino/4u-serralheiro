import { useEffect, useState, useRef } from 'react'
import useAutoRefresh from '../../hooks/useAutoRefresh'
import { Plus, Search, Package, Pencil, Trash2, ArrowUpDown, Camera, X, ImageOff } from 'lucide-react'
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
    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--c-tx1)' }}>{label}</label>
    {children}
    {error && <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>{error}</p>}
  </div>
)

const inp = (err) => ({
  background: 'var(--c-bg2)', border: `1px solid ${err ? '#ef4444' : 'var(--c-bd1)'}`,
  color: 'var(--c-tx0)', borderRadius: 10, padding: '9px 12px', fontSize: 13, width: '100%', outline: 'none',
})

// ─── Upload de Foto ────────────────────────────────────────────────────────────
const ImageUpload = ({ currentUrl, onFileChange, onDeleteCurrent }) => {
  const fileRef = useRef(null)
  const [preview, setPreview] = useState(null)

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem deve ter no máximo 5 MB'); return }
    setPreview(URL.createObjectURL(file))
    onFileChange(file)
  }

  const clearPreview = () => {
    setPreview(null)
    onFileChange(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const imgSrc = preview || currentUrl

  return (
    <div className="sm:col-span-2">
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--c-tx1)' }}>Foto do Produto</label>
      <div className="flex items-center gap-4">
        {/* Área de preview */}
        <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0"
          style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-bd1)' }}>
          {imgSrc ? (
            <>
              <img src={imgSrc} alt="preview" className="w-full h-full object-cover" />
              <button type="button"
                onClick={preview ? clearPreview : onDeleteCurrent}
                className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.6)' }}
                title="Remover foto">
                <X size={10} color="white" />
              </button>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1">
              <ImageOff size={20} style={{ color: 'var(--c-tx3)' }} />
              <span className="text-xs" style={{ color: 'var(--c-tx3)' }}>Sem foto</span>
            </div>
          )}
        </div>

        {/* Botões */}
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
            style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)' }}>
            <Camera size={13} /> {imgSrc ? 'Alterar foto' : 'Adicionar foto'}
          </button>
          <p className="text-xs" style={{ color: 'var(--c-tx3)' }}>JPG, PNG ou WebP · máx 5 MB</p>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
      </div>
    </div>
  )
}

// ─── Modal Criar/Editar ────────────────────────────────────────────────────────
const ProductModal = ({ product, onClose, onSuccess }) => {
  const isEdit = !!product
  const [imageFile, setImageFile] = useState(null)
  const [imageDeleted, setImageDeleted] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: isEdit ? product : { unit: 'un', stock: 0, minStock: 0, cost: 0 },
  })

  const handleDeleteCurrentImage = async () => {
    if (!isEdit || !product.imageUrl) return
    try {
      await api.delete(`/s/products/${product._id}/image`)
      setImageDeleted(true)
      toast.success('Foto removida!')
    } catch { toast.error('Erro ao remover foto') }
  }

  const onSubmit = async (data) => {
    try {
      const formData = new FormData()
      Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== '') formData.append(k, v) })
      if (imageFile) formData.append('image', imageFile)

      if (isEdit) {
        await api.put(`/s/products/${product._id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success('Produto atualizado!')
      } else {
        await api.post('/s/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success('Produto cadastrado!')
      }
      onSuccess()
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erro ao salvar produto')
    }
  }

  const currentImageUrl = imageDeleted ? null : product?.imageUrl

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-lg rounded-2xl my-4" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
        <div className="p-5" style={{ borderBottom: '1px solid var(--c-bd0)' }}>
          <h2 className="text-base font-bold" style={{ color: 'var(--c-tx0)' }}>
            {isEdit ? 'Editar Produto' : 'Novo Produto / Serviço'}
          </h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Foto */}
            <ImageUpload
              currentUrl={currentImageUrl}
              onFileChange={setImageFile}
              onDeleteCurrent={handleDeleteCurrentImage}
            />

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
              className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: 'var(--c-bd0)', color: 'var(--c-tx1)' }}>
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
      <div className="w-full max-w-sm rounded-2xl" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
        <div className="p-5" style={{ borderBottom: '1px solid var(--c-bd0)' }}>
          {product.imageUrl && (
            <img src={product.imageUrl} alt={product.name}
              className="w-12 h-12 rounded-xl object-cover mb-3"
              style={{ border: '1px solid var(--c-bd0)' }} />
          )}
          <h2 className="text-base font-bold" style={{ color: 'var(--c-tx0)' }}>Ajustar Estoque</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--c-tx3)' }}>{product.name}</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: 'var(--c-bg2)' }}>
            <span className="text-sm" style={{ color: 'var(--c-tx2)' }}>Estoque atual</span>
            <span className="text-base font-bold" style={{ color: '#f97316' }}>
              {product.stock} {product.unit}
            </span>
          </div>

          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--c-bd1)' }}>
            {[{ v: 'entrada', label: '+ Entrada' }, { v: 'saida', label: '− Saída' }].map(({ v, label }) => (
              <button key={v} onClick={() => setType(v)}
                className="flex-1 py-2.5 text-sm font-semibold transition-all"
                style={{
                  background: type === v ? (v === 'entrada' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)') : 'var(--c-bg2)',
                  color: type === v ? (v === 'entrada' ? '#22c55e' : '#ef4444') : 'var(--c-tx2)',
                }}>
                {label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--c-tx1)' }}>
              Quantidade ({product.unit}) *
            </label>
            <input value={qty} onChange={e => { setQty(e.target.value); setError('') }}
              type="number" step="0.01" min="0.01"
              style={{ background: 'var(--c-bg2)', border: `1px solid ${error ? '#ef4444' : 'var(--c-bd1)'}`, color: 'var(--c-tx0)', borderRadius: 10, padding: '10px 14px', fontSize: 14, width: '100%', outline: 'none' }}
              placeholder="0" />
            {error && <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>{error}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--c-tx1)' }}>
              Motivo (opcional)
            </label>
            <input value={reason} onChange={e => setReason(e.target.value)}
              style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-bd1)', color: 'var(--c-tx0)', borderRadius: 10, padding: '10px 14px', fontSize: 14, width: '100%', outline: 'none' }}
              placeholder="Ex: Compra, uso em obra, ajuste..." />
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: 'var(--c-bd0)', color: 'var(--c-tx1)' }}>
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
  'Cobertura': '#38bdf8', 'Serviço': '#f472b6', 'Outros': 'var(--c-tx2)',
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
          <h2 className="text-xl font-bold" style={{ color: 'var(--c-tx0)' }}>Produtos e Serviços</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--c-tx2)' }}>Catálogo completo da sua serralheria</p>
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
          style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
          <Search size={16} style={{ color: 'var(--c-tx3)', flexShrink: 0 }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar produto..."
            className="flex-1 bg-transparent outline-none text-base"
            style={{ color: 'var(--c-tx0)' }} />
        </div>
        <select value={category} onChange={e => { setCategory(e.target.value); setPage(1) }}
          className="py-2.5 px-3 rounded-xl text-sm outline-none"
          style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)', color: 'var(--c-tx0)' }}>
          <option value="">Todas categorias</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center h-48 items-center">
          <div className="w-8 h-8 border-4 rounded-full animate-spin"
            style={{ borderColor: 'var(--c-bd1)', borderTopColor: '#f97316' }} />
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl text-center py-14" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
          <Package size={36} className="mx-auto mb-3" style={{ color: 'var(--c-bd1)' }} />
          <p style={{ color: 'var(--c-tx2)' }}>
            {search || category ? 'Nenhum produto encontrado' : 'Cadastre seu primeiro produto ou serviço'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {products.map((p) => {
            const catColor = CATEGORY_COLORS[p.category] ?? 'var(--c-tx2)'
            const margin = p.cost > 0 ? (((p.price - p.cost) / p.price) * 100).toFixed(0) : null
            const lowStock = p.minStock > 0 && p.stock <= p.minStock
            return (
              <div key={p._id} className="rounded-xl overflow-hidden flex flex-col"
                style={{ background: 'var(--c-bg1)', border: `1px solid ${lowStock ? 'rgba(239,68,68,0.3)' : 'var(--c-bd0)'}` }}>

                {/* Foto do produto */}
                {p.imageUrl ? (
                  <div className="w-full h-40 overflow-hidden" style={{ background: 'var(--c-bg2)' }}>
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-20 flex items-center justify-center"
                    style={{ background: `${catColor}11` }}>
                    <Package size={28} style={{ color: `${catColor}66` }} />
                  </div>
                )}

                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: `${catColor}22`, color: catColor }}>
                      {p.category}
                    </span>
                    <p className="text-sm font-semibold mt-1.5 truncate" style={{ color: 'var(--c-tx0)' }}>{p.name}</p>
                    {p.description && (
                      <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--c-tx3)' }}>{p.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-lg font-bold" style={{ color: '#f97316' }}>{fmt(p.price)}</p>
                      <p className="text-xs" style={{ color: 'var(--c-tx3)' }}>
                        por {p.unit}
                        {margin && <span style={{ color: '#22c55e' }}> · {margin}% margem</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium" style={{ color: lowStock ? '#ef4444' : 'var(--c-tx2)' }}>
                        {p.stock} {p.unit}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--c-tx3)' }}>em estoque</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1" style={{ borderTop: '1px solid var(--c-bd0)' }}>
                    <button onClick={() => setModal(p)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs"
                      style={{ background: 'var(--c-bg2)', color: 'var(--c-tx2)' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#f97316'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--c-tx2)'}>
                      <Pencil size={12} /> Editar
                    </button>
                    <button onClick={() => setStockModal(p)}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                      style={{ background: 'var(--c-bg2)', color: 'var(--c-tx2)' }}
                      title="Ajustar estoque"
                      onMouseEnter={e => e.currentTarget.style.color = '#22c55e'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--c-tx2)'}>
                      <ArrowUpDown size={12} />
                    </button>
                    <button onClick={() => handleDelete(p)}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                      style={{ background: 'var(--c-bg2)', color: 'var(--c-tx2)' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--c-tx2)'}>
                      <Trash2 size={12} />
                    </button>
                  </div>
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
              style={{ background: p === page ? '#f97316' : 'var(--c-bg1)', color: p === page ? 'white' : 'var(--c-tx2)' }}>
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
