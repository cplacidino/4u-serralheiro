import { useEffect, useState } from 'react'
import { AlertTriangle, Clock, CalendarClock, CheckCircle, CalendarPlus, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

const fmtDate = (d) => new Date(d).toLocaleDateString('pt-BR')

const daysUntil = (date) => {
  const diff = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24))
  return diff
}

const daysSince = (date) => {
  const diff = Math.ceil((new Date() - new Date(date)) / (1000 * 60 * 60 * 24))
  return diff
}

// ─── Modal de extensão rápida de plano ───
const ExtendModal = ({ company, onClose, onSuccess }) => {
  const [months, setMonths] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!months || Number(months) < 1) return toast.error('Informe quantos meses adicionar')
    setSaving(true)
    try {
      await api.put(`/admin/companies/${company._id}`, { addMonths: Number(months) })
      toast.success(`Plano de "${company.name}" estendido por ${months} mês(es)`)
      onSuccess()
      onClose()
    } catch {
      toast.error('Erro ao estender plano')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: '#1a1a1f', border: '1px solid #2e2e35' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold" style={{ color: '#e0e0ec' }}>Estender Plano</h3>
        </div>
        <p className="text-sm mb-4" style={{ color: '#8a8a9a' }}>
          Empresa: <strong style={{ color: '#e0e0ec' }}>{company.name}</strong><br />
          Vence em: <strong style={{ color: '#e0e0ec' }}>{fmtDate(company.planExpiresAt)}</strong>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#b8b8c8' }}>Quantos meses adicionar?</label>
            <input
              type="number"
              min="1"
              max="36"
              value={months}
              onChange={e => setMonths(e.target.value)}
              placeholder="Ex: 3"
              style={{ background: '#242429', border: '1px solid #3d3d47', color: '#e0e0ec', borderRadius: 12, padding: '10px 14px', fontSize: 14, width: '100%', outline: 'none' }}
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm"
              style={{ background: '#2e2e35', color: '#b8b8c8' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea6c10)', color: 'white', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Salvando...' : 'Estender'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Seção de alertas ───
const AlertSection = ({ title, icon: Icon, color, companies, emptyText, labelFn, onExtend }) => (
  <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1a1f', border: `1px solid ${color}33` }}>
    {/* Header da seção */}
    <div className="flex items-center gap-3 px-5 py-4" style={{ background: `${color}10`, borderBottom: `1px solid ${color}22` }}>
      <Icon size={18} style={{ color, flexShrink: 0 }} />
      <span className="text-sm font-semibold" style={{ color }}>{title}</span>
      <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full"
        style={{ background: `${color}22`, color }}>
        {companies.length}
      </span>
    </div>

    {/* Lista */}
    {companies.length === 0 ? (
      <div className="px-5 py-6 text-center">
        <CheckCircle size={24} className="mx-auto mb-2" style={{ color: '#3d3d47' }} />
        <p className="text-sm" style={{ color: '#5c5c6b' }}>{emptyText}</p>
      </div>
    ) : (
      <div className="divide-y" style={{ borderColor: '#2e2e35' }}>
        {companies.map(c => (
          <div key={c._id} className="flex items-center gap-3 px-5 py-3.5">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: '#e0e0ec' }}>{c.name}</p>
              <p className="text-xs truncate" style={{ color: '#5c5c6b' }}>
                {c.plan?.name ?? '—'} · {c.email}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs font-semibold" style={{ color }}>
                {labelFn(c)}
              </p>
              <p className="text-xs" style={{ color: '#5c5c6b' }}>{fmtDate(c.planExpiresAt)}</p>
            </div>
            <button
              onClick={() => onExtend(c)}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl flex-shrink-0"
              style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)' }}
            >
              <CalendarPlus size={13} />
              <span className="hidden sm:inline">Estender</span>
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
)

// ─── Página principal ───
const AdminAlertsPage = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [extending, setExtending] = useState(null)

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/alerts')
      setData(res.data.data)
    } catch {
      toast.error('Erro ao carregar alertas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAlerts() }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 rounded-full animate-spin"
          style={{ borderColor: '#3d3d47', borderTopColor: '#f97316' }} />
      </div>
    )
  }

  const total = (data?.expired?.length ?? 0) + (data?.expiring7?.length ?? 0) +
    (data?.expiring15?.length ?? 0) + (data?.expiring30?.length ?? 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold" style={{ color: '#e0e0ec' }}>Alertas de Vencimento</h2>
          <p className="text-sm mt-0.5" style={{ color: '#8a8a9a' }}>
            {total > 0 ? `${total} empresa${total > 1 ? 's' : ''} requer${total === 1 ? ' atenção' : 'em atenção'}` : 'Tudo em dia'}
          </p>
        </div>
        <button onClick={fetchAlerts}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: '#1a1a1f', border: '1px solid #2e2e35', color: '#b8b8c8' }}>
          <RefreshCw size={15} /> Atualizar
        </button>
      </div>

      <div className="space-y-4">
        <AlertSection
          title="Plano Vencido"
          icon={AlertTriangle}
          color="#ef4444"
          companies={data?.expired ?? []}
          emptyText="Nenhuma empresa com plano vencido."
          labelFn={c => `Venceu há ${daysSince(c.planExpiresAt)}d`}
          onExtend={setExtending}
        />
        <AlertSection
          title="Vence em até 7 dias"
          icon={AlertTriangle}
          color="#ef4444"
          companies={data?.expiring7 ?? []}
          emptyText="Nenhuma empresa vencendo nos próximos 7 dias."
          labelFn={c => `Faltam ${daysUntil(c.planExpiresAt)} dia${daysUntil(c.planExpiresAt) !== 1 ? 's' : ''}`}
          onExtend={setExtending}
        />
        <AlertSection
          title="Vence entre 8 e 15 dias"
          icon={Clock}
          color="#eab308"
          companies={data?.expiring15 ?? []}
          emptyText="Nenhuma empresa neste intervalo."
          labelFn={c => `Faltam ${daysUntil(c.planExpiresAt)} dias`}
          onExtend={setExtending}
        />
        <AlertSection
          title="Vence entre 16 e 30 dias"
          icon={CalendarClock}
          color="#f97316"
          companies={data?.expiring30 ?? []}
          emptyText="Nenhuma empresa neste intervalo."
          labelFn={c => `Faltam ${daysUntil(c.planExpiresAt)} dias`}
          onExtend={setExtending}
        />
      </div>

      {extending && (
        <ExtendModal
          company={extending}
          onClose={() => setExtending(null)}
          onSuccess={fetchAlerts}
        />
      )}
    </div>
  )
}

export default AdminAlertsPage
