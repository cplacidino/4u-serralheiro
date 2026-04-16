import { useEffect, useState } from 'react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

const inputStyle = {
  background: 'var(--c-bg2)',
  border: '1px solid var(--c-bd1)',
  color: 'var(--c-tx0)',
  borderRadius: 12,
  padding: '10px 14px',
  fontSize: 14,
  width: '100%',
  outline: 'none',
}

// ─── Modal de criar/editar plano ───
const PlanModal = ({ plan, onClose, onSuccess }) => {
  const isEdit = !!plan
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: plan?.name ?? '',
    price: plan?.price ?? '',
    maxUsers: plan?.maxUsers ?? 5,
    maxSessions: plan?.maxSessions ?? 3,
    features: plan?.features?.join('\n') ?? '',
  })

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Nome é obrigatório')
    if (form.price === '' || isNaN(Number(form.price))) return toast.error('Preço inválido')

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        price: Number(form.price),
        maxUsers: Number(form.maxUsers),
        maxSessions: Number(form.maxSessions),
        features: form.features.split('\n').map(f => f.trim()).filter(Boolean),
      }
      if (isEdit) {
        await api.put(`/admin/plans/${plan._id}`, payload)
        toast.success('Plano atualizado!')
      } else {
        await api.post('/admin/plans', payload)
        toast.success('Plano criado!')
      }
      onSuccess()
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao salvar plano')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--c-bd0)' }}>
          <h2 className="text-base font-bold" style={{ color: 'var(--c-tx0)' }}>
            {isEdit ? `Editar Plano — ${plan.name}` : 'Novo Plano'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--c-tx3)' }}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--c-tx1)' }}>Nome do plano *</label>
              <input value={form.name} onChange={set('name')} placeholder="Ex: Profissional" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--c-tx1)' }}>Preço (R$/mês) *</label>
              <input type="number" step="0.01" min="0" value={form.price} onChange={set('price')} placeholder="99.90" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--c-tx1)' }}>Máx. usuários</label>
              <input type="number" min="-1" value={form.maxUsers} onChange={set('maxUsers')} placeholder="-1 = ilimitado" style={inputStyle} />
              <p className="text-xs mt-1" style={{ color: 'var(--c-tx3)' }}>-1 = ilimitado</p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--c-tx1)' }}>Máx. sessões simultâneas</label>
              <input type="number" min="-1" value={form.maxSessions} onChange={set('maxSessions')} placeholder="-1 = ilimitado" style={inputStyle} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--c-tx1)' }}>
              Funcionalidades <span style={{ color: 'var(--c-tx3)' }}>(uma por linha)</span>
            </label>
            <textarea
              value={form.features}
              onChange={set('features')}
              rows={6}
              placeholder={"Clientes ilimitados\nOrçamentos ilimitados\nFinanceiro completo"}
              className="resize-none"
              style={{ ...inputStyle }}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm"
              style={{ background: 'var(--c-bd0)', color: 'var(--c-tx1)' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea6c10)', color: 'white', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar Plano'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal de confirmação de exclusão ───
const DeleteConfirm = ({ plan, onClose, onSuccess }) => {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/admin/plans/${plan._id}`)
      toast.success('Plano excluído')
      onSuccess()
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao excluir plano')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl mx-auto mb-4"
          style={{ background: 'rgba(239,68,68,0.15)' }}>
          <Trash2 size={22} style={{ color: '#ef4444' }} />
        </div>
        <h3 className="text-base font-bold text-center mb-2" style={{ color: 'var(--c-tx0)' }}>Excluir plano "{plan.name}"?</h3>
        <p className="text-sm text-center mb-6" style={{ color: 'var(--c-tx2)' }}>
          Esta ação não pode ser desfeita. Empresas que usam este plano precisarão ser migradas antes.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm"
            style={{ background: 'var(--c-bd0)', color: 'var(--c-tx1)' }}>
            Cancelar
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', opacity: deleting ? 0.7 : 1 }}>
            {deleting ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ───
const AdminPlansPage = () => {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)       // null | 'create' | planObj (edit)
  const [toDelete, setToDelete] = useState(null) // null | planObj

  const fetchPlans = async () => {
    try {
      const res = await api.get('/admin/plans')
      setPlans(res.data.data.plans)
    } catch {
      toast.error('Erro ao carregar planos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPlans() }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 rounded-full animate-spin"
          style={{ borderColor: 'var(--c-bd1)', borderTopColor: '#f97316' }} />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--c-tx0)' }}>Planos</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--c-tx2)' }}>Gerencie os planos de assinatura</p>
        </div>
        <button onClick={() => setModal('create')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg, #f97316, #ea6c10)', color: 'white' }}>
          <Plus size={15} /> Novo Plano
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div key={plan._id} className="rounded-2xl p-5 flex flex-col"
            style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>

            {/* Header do card */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--c-tx0)' }}>{plan.name}</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--c-tx2)' }}>
                  {plan.maxUsers === -1 ? 'Usuários ilimitados' : `Até ${plan.maxUsers} usuário${plan.maxUsers > 1 ? 's' : ''}`}
                  {' · '}
                  {plan.maxSessions === -1 ? 'sessões ilimitadas' : `${plan.maxSessions} sessõe${plan.maxSessions > 1 ? 's' : ''} simultâneas`}
                </p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0 ml-2">
                <button onClick={() => setModal(plan)}
                  className="p-2 rounded-xl"
                  style={{ background: 'var(--c-bd0)', color: 'var(--c-tx2)' }}
                  title="Editar">
                  <Pencil size={14} />
                </button>
                <button onClick={() => setToDelete(plan)}
                  className="p-2 rounded-xl"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                  title="Excluir">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Preço */}
            <div className="mb-4">
              <span className="text-3xl font-bold" style={{ color: 'var(--c-tx0)' }}>
                R$ {plan.price.toFixed(2).replace('.', ',')}
              </span>
              <span className="text-sm ml-1" style={{ color: 'var(--c-tx2)' }}>/mês</span>
            </div>

            {/* Funcionalidades */}
            {plan.features.length > 0 ? (
              <ul className="space-y-2 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--c-tx1)' }}>
                    <Check size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#22c55e' }} />
                    {f}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm flex-1" style={{ color: 'var(--c-tx3)' }}>Nenhuma funcionalidade cadastrada.</p>
            )}
          </div>
        ))}

        {/* Card de adicionar */}
        <button onClick={() => setModal('create')}
          className="rounded-2xl p-5 flex flex-col items-center justify-center gap-3 transition-all"
          style={{ background: 'transparent', border: '2px dashed var(--c-bd0)', minHeight: 180 }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#f97316'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--c-bd0)'}>
          <Plus size={28} style={{ color: 'var(--c-tx3)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--c-tx3)' }}>Adicionar plano</span>
        </button>
      </div>

      {(modal === 'create' || (modal && modal !== 'create')) && (
        <PlanModal
          plan={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSuccess={fetchPlans}
        />
      )}

      {toDelete && (
        <DeleteConfirm
          plan={toDelete}
          onClose={() => setToDelete(null)}
          onSuccess={fetchPlans}
        />
      )}
    </div>
  )
}

export default AdminPlansPage
