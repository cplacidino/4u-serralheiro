import { useEffect, useState } from 'react'
import { Check, Pencil } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../../services/api'

const EditModal = ({ plan, onClose, onSuccess }) => {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { price: plan.price, features: plan.features.join('\n') },
  })

  const onSubmit = async (data) => {
    try {
      await api.put(`/admin/plans/${plan._id}`, {
        price: Number(data.price),
        features: data.features.split('\n').map(f => f.trim()).filter(Boolean),
      })
      toast.success('Plano atualizado!')
      onSuccess()
      onClose()
    } catch {
      toast.error('Erro ao atualizar plano')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl" style={{ background: '#1a1a1f', border: '1px solid #2e2e35' }}>
        <div className="p-5" style={{ borderBottom: '1px solid #2e2e35' }}>
          <h2 className="text-base font-bold" style={{ color: '#e0e0ec' }}>Editar Plano {plan.name}</h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#b8b8c8' }}>Preço (R$)</label>
            <input {...register('price')} type="number" step="0.01"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#242429', border: '1px solid #3d3d47', color: '#e0e0ec' }} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#b8b8c8' }}>
              Funcionalidades <span style={{ color: '#5c5c6b' }}>(uma por linha)</span>
            </label>
            <textarea {...register('features')} rows={7}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ background: '#242429', border: '1px solid #3d3d47', color: '#e0e0ec' }} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: '#2e2e35', color: '#b8b8c8' }}>
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea6c10)', color: 'white', opacity: isSubmitting ? 0.7 : 1 }}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const AdminPlansPage = () => {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)

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
          style={{ borderColor: '#3d3d47', borderTopColor: '#f97316' }} />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold" style={{ color: '#e0e0ec' }}>Planos</h2>
        <p className="text-sm mt-0.5" style={{ color: '#8a8a9a' }}>Gerencie os planos de assinatura</p>
      </div>

      {/* Cards — empilha no mobile, lado a lado no desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
        {plans.map((plan) => (
          <div key={plan._id} className="rounded-2xl p-5 flex flex-col"
            style={{ background: '#1a1a1f', border: `1px solid ${plan.name === 'Premium' ? 'rgba(249,115,22,0.35)' : '#2e2e35'}` }}>

            <div className="flex items-start justify-between mb-4">
              <div>
                {plan.name === 'Premium' && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold block mb-1.5"
                    style={{ background: 'rgba(249,115,22,0.2)', color: '#f97316', width: 'fit-content' }}>
                    ★ Mais popular
                  </span>
                )}
                <h3 className="text-lg font-bold" style={{ color: '#e0e0ec' }}>{plan.name}</h3>
              </div>
              <button onClick={() => setEditing(plan)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg flex-shrink-0 ml-2"
                style={{ background: '#2e2e35', color: '#8a8a9a' }}>
                <Pencil size={11} /> Editar
              </button>
            </div>

            <div className="mb-4">
              <span className="text-3xl font-bold" style={{ color: '#e0e0ec' }}>
                R$ {plan.price.toFixed(2).replace('.', ',')}
              </span>
              <span className="text-sm ml-1" style={{ color: '#8a8a9a' }}>/mês</span>
            </div>

            <p className="text-sm mb-4 font-medium" style={{ color: '#f97316' }}>
              {plan.maxUsers === -1 ? 'Usuários ilimitados' : `Até ${plan.maxUsers} usuários simultâneos`}
            </p>

            <ul className="space-y-2 flex-1">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#b8b8c8' }}>
                  <Check size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#22c55e' }} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {editing && <EditModal plan={editing} onClose={() => setEditing(null)} onSuccess={fetchPlans} />}
    </div>
  )
}

export default AdminPlansPage
