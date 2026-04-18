import { useEffect, useState, useCallback } from 'react'
import { HandCoins, RefreshCw, ChevronDown, ChevronUp, X, AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

const fmt = (v) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

const isOverdue = (dueDate) => dueDate && new Date(dueDate) < new Date()
const isDueToday = (dueDate) => {
  if (!dueDate) return false
  const d = new Date(dueDate)
  const today = new Date()
  return d.toDateString() === today.toDateString()
}

// ─── Modal confirmação de recebimento ─────────────────────────────────────────
const ReceiveModal = ({ payment, onClose, onReceived }) => {
  const [saving, setSaving] = useState(false)

  const handleReceive = async () => {
    setSaving(true)
    try {
      await api.post(`/s/payments/${payment._id}/receive`)
      toast.success('Fiado recebido! Valor registrado no financeiro.')
      onReceived()
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erro ao registrar recebimento.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold" style={{ color: 'var(--c-tx0)' }}>Confirmar Recebimento</h3>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'var(--c-tx3)' }}><X size={18} /></button>
        </div>
        <div className="rounded-xl p-4 mb-4 space-y-2" style={{ background: 'var(--c-bg2)' }}>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--c-tx2)' }}>Cliente</span>
            <span className="font-medium" style={{ color: 'var(--c-tx0)' }}>{payment.client?.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--c-tx2)' }}>Orçamento</span>
            <span className="font-medium" style={{ color: '#f97316' }}>
              ORC-{String(payment.budget?.number ?? 0).padStart(3, '0')}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--c-tx2)' }}>Vencimento</span>
            <span style={{ color: isOverdue(payment.dueDate) ? '#ef4444' : 'var(--c-tx0)' }}>{fmtDate(payment.dueDate)}</span>
          </div>
          <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid var(--c-bd0)' }}>
            <span className="font-semibold" style={{ color: 'var(--c-tx1)' }}>Valor</span>
            <span className="text-xl font-bold" style={{ color: '#22c55e' }}>{fmt(payment.amount)}</span>
          </div>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--c-tx3)' }}>
          Ao confirmar, o valor será lançado automaticamente como receita no Financeiro.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm"
            style={{ background: 'var(--c-bg2)', color: 'var(--c-tx1)' }}>Cancelar</button>
          <button onClick={handleReceive} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: '#22c55e', color: 'white', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Registrando...' : 'Confirmar Recebimento'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Card de cliente com seus fiados ──────────────────────────────────────────
const ClientCard = ({ group, onReceive }) => {
  const [expanded, setExpanded] = useState(false)
  const overdueItems = group.items.filter(f => isOverdue(f.dueDate))
  const todayItems = group.items.filter(f => isDueToday(f.dueDate))

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--c-bg1)', border: `1px solid ${overdueItems.length > 0 ? 'rgba(239,68,68,0.35)' : 'var(--c-bd0)'}` }}>
      {/* Cabeçalho do cliente */}
      <button className="w-full flex items-center justify-between p-5" onClick={() => setExpanded(v => !v)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0"
            style={{ background: overdueItems.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)', color: overdueItems.length > 0 ? '#ef4444' : '#f97316' }}>
            {group.client.name.charAt(0).toUpperCase()}
          </div>
          <div className="text-left">
            <p className="text-base font-semibold" style={{ color: 'var(--c-tx0)' }}>{group.client.name}</p>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs" style={{ color: 'var(--c-tx3)' }}>
                {group.items.length} fiado{group.items.length > 1 ? 's' : ''} pendente{group.items.length > 1 ? 's' : ''}
              </span>
              {overdueItems.length > 0 && (
                <span className="flex items-center gap-1 text-xs font-semibold"
                  style={{ color: '#ef4444' }}>
                  <AlertTriangle size={11} /> {overdueItems.length} vencido{overdueItems.length > 1 ? 's' : ''}
                </span>
              )}
              {todayItems.length > 0 && overdueItems.length === 0 && (
                <span className="flex items-center gap-1 text-xs font-semibold"
                  style={{ color: '#eab308' }}>
                  <Clock size={11} /> vence hoje
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-bold" style={{ color: '#f97316' }}>{fmt(group.total)}</p>
            <p className="text-xs" style={{ color: 'var(--c-tx3)' }}>total pendente</p>
          </div>
          {expanded ? <ChevronUp size={18} style={{ color: 'var(--c-tx3)' }} /> : <ChevronDown size={18} style={{ color: 'var(--c-tx3)' }} />}
        </div>
      </button>

      {/* Lista expandida dos fiados */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--c-bd0)' }}>
          {group.items.map(f => {
            const overdue = isOverdue(f.dueDate)
            const dueToday = isDueToday(f.dueDate)
            return (
              <div key={f._id} className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: '1px solid var(--c-bd0)', background: overdue ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: overdue ? '#ef4444' : dueToday ? '#eab308' : '#22c55e' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--c-tx0)' }}>
                      ORC-{String(f.budget?.number ?? 0).padStart(3, '0')}
                      {f.note && <span className="ml-2 text-xs font-normal" style={{ color: 'var(--c-tx3)' }}>— {f.note}</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {overdue ? (
                        <span className="text-xs font-semibold" style={{ color: '#ef4444' }}>
                          ⚠ Vencido em {fmtDate(f.dueDate)}
                        </span>
                      ) : dueToday ? (
                        <span className="text-xs font-semibold" style={{ color: '#eab308' }}>
                          ⏰ Vence hoje
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--c-tx3)' }}>
                          Vence em {fmtDate(f.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-base font-bold" style={{ color: overdue ? '#ef4444' : 'var(--c-tx0)' }}>
                    {fmt(f.amount)}
                  </p>
                  <button onClick={() => onReceive(f)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
                    style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                    <CheckCircle size={14} /> Receber
                  </button>
                  {group.client.phone && (
                    <button
                      onClick={() => {
                        const phone = group.client.phone.replace(/\D/g, '')
                        const num = phone.startsWith('55') ? phone : `55${phone}`
                        const msg = encodeURIComponent(
                          `Olá ${group.client.name}! Passando para lembrar sobre o valor de *${fmt(f.amount)}* em aberto (ORC-${String(f.budget?.number ?? 0).padStart(3,'0')}). ${overdue ? 'O vencimento já passou.' : `Vencimento: ${fmtDate(f.dueDate)}.`} Qualquer dúvida estamos à disposição!`
                        )
                        window.open(`https://wa.me/${num}?text=${msg}`, '_blank')
                      }}
                      className="p-2 rounded-xl text-xs"
                      title="Cobrar via WhatsApp"
                      style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                      💬
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {/* Subtotal do cliente */}
          <div className="flex justify-between items-center px-5 py-3" style={{ background: 'var(--c-bg2)' }}>
            <span className="text-sm font-medium" style={{ color: 'var(--c-tx2)' }}>Total do cliente</span>
            <span className="text-base font-bold" style={{ color: '#f97316' }}>{fmt(group.total)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────
const FiadosPage = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [receivePayment, setReceivePayment] = useState(null)
  const [filter, setFilter] = useState('todos') // 'todos' | 'vencidos' | 'hoje'

  const fetchFiados = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/s/payments/fiados')
      setData(res.data.data)
    } catch {
      toast.error('Erro ao carregar fiados')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFiados() }, [fetchFiados])

  const byClient = data?.byClient ?? []
  const totalPendente = data?.totalPendente ?? 0

  const overdueCount = data?.fiados?.filter(f => isOverdue(f.dueDate)).length ?? 0
  const todayCount = data?.fiados?.filter(f => isDueToday(f.dueDate)).length ?? 0

  // Filtra clientes conforme filtro selecionado
  const filteredGroups = byClient.filter(g => {
    if (filter === 'vencidos') return g.items.some(f => isOverdue(f.dueDate))
    if (filter === 'hoje') return g.items.some(f => isDueToday(f.dueDate))
    return true
  })

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--c-tx0)' }}>Fiado</h1>
          <p className="text-base mt-1" style={{ color: 'var(--c-tx2)' }}>Valores pendentes de recebimento por cliente</p>
        </div>
        <button onClick={fetchFiados}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium"
          style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)', color: 'var(--c-tx2)' }}>
          <RefreshCw size={15} /> Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl p-5" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
          <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--c-tx3)' }}>Total em Aberto</p>
          <p className="text-2xl font-bold" style={{ color: '#f97316' }}>{fmt(totalPendente)}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--c-tx3)' }}>{byClient.length} cliente{byClient.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: overdueCount > 0 ? 'rgba(239,68,68,0.08)' : 'var(--c-bg1)', border: `1px solid ${overdueCount > 0 ? 'rgba(239,68,68,0.3)' : 'var(--c-bd0)'}` }}>
          <p className="text-xs font-semibold uppercase mb-2" style={{ color: overdueCount > 0 ? '#ef4444' : 'var(--c-tx3)' }}>Vencidos</p>
          <p className="text-2xl font-bold" style={{ color: overdueCount > 0 ? '#ef4444' : 'var(--c-tx2)' }}>{overdueCount}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--c-tx3)' }}>fiados em atraso</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: todayCount > 0 ? 'rgba(234,179,8,0.08)' : 'var(--c-bg1)', border: `1px solid ${todayCount > 0 ? 'rgba(234,179,8,0.3)' : 'var(--c-bd0)'}` }}>
          <p className="text-xs font-semibold uppercase mb-2" style={{ color: todayCount > 0 ? '#eab308' : 'var(--c-tx3)' }}>Vencem Hoje</p>
          <p className="text-2xl font-bold" style={{ color: todayCount > 0 ? '#eab308' : 'var(--c-tx2)' }}>{todayCount}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--c-tx3)' }}>fiados com vencimento hoje</p>
        </div>
      </div>

      {/* Filtros rápidos */}
      <div className="flex items-center gap-2 mb-5">
        {[
          { key: 'todos', label: 'Todos' },
          { key: 'vencidos', label: `Vencidos (${overdueCount})` },
          { key: 'hoje', label: `Vencem hoje (${todayCount})` },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: filter === f.key ? '#f97316' : 'var(--c-bg1)',
              color: filter === f.key ? 'white' : 'var(--c-tx2)',
              border: `1px solid ${filter === f.key ? '#f97316' : 'var(--c-bd0)'}`,
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center h-56">
          <div className="w-10 h-10 border-4 rounded-full animate-spin"
            style={{ borderColor: 'var(--c-bd1)', borderTopColor: '#f97316' }} />
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="rounded-2xl text-center py-20" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
          <HandCoins size={48} className="mx-auto mb-4" style={{ color: 'var(--c-bd0)' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--c-tx2)' }}>
            {filter === 'todos' ? 'Nenhum fiado pendente' : 'Nenhum fiado neste filtro'}
          </p>
          <p className="text-base mt-1" style={{ color: 'var(--c-tx3)' }}>
            {filter === 'todos'
              ? 'Quando um orçamento for pago com "Fiado", aparecerá aqui.'
              : 'Tente trocar o filtro acima.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map(g => (
            <ClientCard key={g.client._id} group={g} onReceive={setReceivePayment} />
          ))}
        </div>
      )}

      {receivePayment && (
        <ReceiveModal
          payment={receivePayment}
          onClose={() => setReceivePayment(null)}
          onReceived={fetchFiados}
        />
      )}
    </div>
  )
}

export default FiadosPage
