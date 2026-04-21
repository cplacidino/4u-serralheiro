import { useEffect, useState, useCallback } from 'react'
import {
  Plus, X, ChevronLeft, ChevronRight, Calendar, Clock,
  Truck, ClipboardList, MapPin, Edit2, Trash2, CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pad  = (n) => String(n).padStart(2, '0')
const fmtDate = (d) => new Date(d).toLocaleDateString('pt-BR')
const fmtTime = (d) => { const dt = new Date(d); return `${pad(dt.getHours())}:${pad(dt.getMinutes())}` }
const toInput = (d) => {
  const dt = new Date(d)
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
}
const isSameDay = (a, b) => {
  const da = new Date(a), db = new Date(b)
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
}
const startOfWeek = (d) => {
  const dt = new Date(d)
  const day = dt.getDay() === 0 ? 6 : dt.getDay() - 1
  dt.setDate(dt.getDate() - day)
  dt.setHours(0, 0, 0, 0)
  return dt
}
const addDays = (d, n) => { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt }
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1)
const endOfMonth   = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0)

const TIPOS = {
  visita:     { label: 'Visita',       color: '#f97316', bg: 'rgba(249,115,22,0.15)',  icon: MapPin },
  reuniao:    { label: 'Reunião',      color: '#60a5fa', bg: 'rgba(96,165,250,0.15)',  icon: Calendar },
  entrega:    { label: 'Entrega',      color: '#22c55e', bg: 'rgba(34,197,94,0.15)',   icon: Truck },
  instalacao: { label: 'Instalação',   color: '#a855f7', bg: 'rgba(168,85,247,0.15)', icon: ClipboardList },
  outro:      { label: 'Outro',        color: '#94a3b8', bg: 'rgba(148,163,184,0.15)',icon: Calendar },
  entrega_os:           { label: 'Entrega OS',        color: '#60a5fa', bg: 'rgba(96,165,250,0.15)',  icon: ClipboardList },
  entrega_os_concluida: { label: 'OS Concluída',      color: '#22c55e', bg: 'rgba(34,197,94,0.1)',    icon: ClipboardList },
  cheque_vencimento:    { label: 'Cheque Vencendo',   color: '#a855f7', bg: 'rgba(168,85,247,0.15)', icon: Calendar },
}

const STATUS_LABELS = {
  pendente:   { label: 'Pendente',   color: '#eab308' },
  confirmado: { label: 'Confirmado', color: '#22c55e' },
  concluido:  { label: 'Concluído',  color: '#94a3b8' },
  cancelado:  { label: 'Cancelado',  color: '#ef4444' },
}

const DIAS_SEMANA = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

// ─── Chip de evento ───────────────────────────────────────────────────────────
const EventChip = ({ ev, onClick }) => {
  const tipo = TIPOS[ev.type] ?? TIPOS.outro
  return (
    <div
      onClick={() => onClick(ev)}
      style={{
        background: tipo.bg, color: tipo.color,
        borderLeft: `3px solid ${tipo.color}`,
        borderRadius: 6, padding: '2px 6px', fontSize: 11,
        cursor: 'pointer', marginBottom: 2, overflow: 'hidden',
        whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        fontWeight: 500,
      }}>
      {ev.isVirtual ? '🔗 ' : ''}{ev.title}
    </div>
  )
}

// ─── Modal criar/editar ────────────────────────────────────────────────────────
const AgModal = ({ ag, defaultDate, onClose, onSaved }) => {
  const isEdit = !!ag
  const initDate = ag?.date
    ? toInput(ag.date)
    : defaultDate
      ? `${defaultDate}T08:00`
      : toInput(new Date())

  const [title, setTitle]         = useState(ag?.title ?? '')
  const [description, setDesc]    = useState(ag?.description ?? '')
  const [date, setDate]           = useState(initDate)
  const [type, setType]           = useState(ag?.type ?? 'visita')
  const [status, setStatus]       = useState(ag?.status ?? 'pendente')
  const [notes, setNotes]         = useState(ag?.notes ?? '')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  const inp = (err) => ({
    background: 'var(--c-bg2)', border: `1px solid ${err ? '#ef4444' : 'var(--c-bd1)'}`,
    color: 'var(--c-tx0)', borderRadius: 10, padding: '9px 12px', fontSize: 13,
    width: '100%', outline: 'none',
  })

  const handleSave = async () => {
    setError('')
    if (!title.trim()) return setError('Título é obrigatório')
    if (!date)         return setError('Data é obrigatória')
    setSaving(true)
    try {
      if (isEdit) {
        await api.put(`/s/agendamentos/${ag._id}`, { title, description, date, type, status, notes })
        toast.success('Agendamento atualizado!')
      } else {
        await api.post('/s/agendamentos', { title, description, date, type, status, notes })
        toast.success('Agendamento criado!')
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e.response?.data?.message || 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-md rounded-2xl my-6" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--c-bd0)' }}>
          <h2 className="text-base font-bold" style={{ color: 'var(--c-tx0)' }}>
            {isEdit ? 'Editar Agendamento' : 'Novo Agendamento'}
          </h2>
          <button onClick={onClose} style={{ color: 'var(--c-tx3)', background: 'var(--c-bg2)', borderRadius: 8, padding: 6, border: 'none', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label style={{ fontSize: 12, color: 'var(--c-tx2)', display: 'block', marginBottom: 6 }}>Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} style={inp(!title && !!error)}
              placeholder="Ex: Visita ao cliente João" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ fontSize: 12, color: 'var(--c-tx2)', display: 'block', marginBottom: 6 }}>Tipo</label>
              <select value={type} onChange={e => setType(e.target.value)} style={inp()}>
                {Object.entries(TIPOS).filter(([k]) => k !== 'entrega_os').map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--c-tx2)', display: 'block', marginBottom: 6 }}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} style={inp()}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--c-tx2)', display: 'block', marginBottom: 6 }}>Data e hora *</label>
            <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} style={inp(!date && !!error)} />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--c-tx2)', display: 'block', marginBottom: 6 }}>Descrição</label>
            <textarea value={description} onChange={e => setDesc(e.target.value)} rows={2}
              style={{ ...inp(), resize: 'none' }} placeholder="Detalhes do agendamento..." />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--c-tx2)', display: 'block', marginBottom: 6 }}>Observações internas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              style={{ ...inp(), resize: 'none' }} placeholder="Notas internas..." />
          </div>

          {error && (
            <p style={{ fontSize: 12, background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 8, padding: '8px 12px' }}>
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: 'var(--c-bg2)', color: 'var(--c-tx2)', border: '1px solid var(--c-bd1)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex: 2, padding: '10px 0', borderRadius: 10, background: saving ? '#888' : 'linear-gradient(135deg,#f97316,#ea6c10)', color: 'white', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
              {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Popover detalhe do evento ─────────────────────────────────────────────────
const EventDetail = ({ ev, onClose, onEdit, onDelete }) => {
  const tipo   = TIPOS[ev.type] ?? TIPOS.outro
  const status = STATUS_LABELS[ev.status]
  const Icon   = tipo.icon
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 p-5" style={{ borderBottom: '1px solid var(--c-bd0)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: tipo.bg }}>
            <Icon size={18} style={{ color: tipo.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: 'var(--c-tx0)' }}>{ev.title}</p>
            <p className="text-xs mt-0.5" style={{ color: tipo.color }}>{tipo.label}</p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--c-tx3)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Clock size={13} style={{ color: 'var(--c-tx3)' }} />
            <span style={{ fontSize: 13, color: 'var(--c-tx1)' }}>
              {fmtDate(ev.date)} às {fmtTime(ev.date)}
            </span>
          </div>
          {status && (
            <div className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: `${status.color}22`, color: status.color }}>
              {status.label}
            </div>
          )}
          {ev.description && (
            <p style={{ fontSize: 13, color: 'var(--c-tx2)' }}>{ev.description}</p>
          )}
          {ev.relatedOS && (
            <p style={{ fontSize: 12, color: 'var(--c-tx3)' }}>
              🔗 OS-{String(ev.relatedOS.number).padStart(3,'0')}: {ev.relatedOS.title}
            </p>
          )}
          {ev.type === 'cheque_vencimento' && (
            <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'var(--c-bg2)', fontSize: 12 }}>
              {ev.client?.name && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--c-tx3)' }}>Cliente</span>
                  <span style={{ color: 'var(--c-tx1)', fontWeight: 600 }}>{ev.client.name}</span>
                </div>
              )}
              {ev.chequeBanco && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--c-tx3)' }}>Banco</span>
                  <span style={{ color: 'var(--c-tx1)' }}>{ev.chequeBanco}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span style={{ color: 'var(--c-tx3)' }}>Destino</span>
                <span style={{ color: ev.chequeDestino === 'fornecedor' ? '#60a5fa' : '#eab308' }}>
                  {ev.chequeDestino === 'fornecedor' ? '🤝 Fornecedor' : '🏦 A Depositar'}
                </span>
              </div>
              <div className="flex justify-between pt-1" style={{ borderTop: '1px solid var(--c-bd0)' }}>
                <span style={{ color: 'var(--c-tx3)' }}>Valor</span>
                <span style={{ color: '#a855f7', fontWeight: 700, fontSize: 14 }}>
                  {(ev.amount ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          )}
          {ev.notes && (
            <p style={{ fontSize: 12, color: 'var(--c-tx3)', fontStyle: 'italic' }}>{ev.notes}</p>
          )}
          {!ev.isVirtual && (
            <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid var(--c-bd0)' }}>
              <button onClick={() => { onClose(); onEdit(ev) }}
                style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: 'var(--c-bg2)', color: 'var(--c-tx1)', border: '1px solid var(--c-bd1)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Edit2 size={12} /> Editar
              </button>
              <button onClick={() => { onClose(); onDelete(ev._id) }}
                style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Trash2 size={12} /> Excluir
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── View Mês ─────────────────────────────────────────────────────────────────
const MonthView = ({ current, events, onDayClick, onEventClick }) => {
  const first  = startOfMonth(current)
  const last   = endOfMonth(current)
  const offset = first.getDay() === 0 ? 6 : first.getDay() - 1
  const cells  = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(current.getFullYear(), current.getMonth(), d))

  const todayStr = new Date().toDateString()

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {DIAS_SEMANA.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--c-tx3)', padding: '4px 0', fontWeight: 600 }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const dayEvents = events.filter(ev => isSameDay(ev.date, day))
          const isToday = day.toDateString() === todayStr
          return (
            <div key={day.toISOString()}
              onClick={() => onDayClick(day)}
              style={{
                minHeight: 80, borderRadius: 10, padding: '6px 4px', cursor: 'pointer',
                background: isToday ? 'rgba(249,115,22,0.08)' : 'var(--c-bg1)',
                border: `1px solid ${isToday ? '#f97316' : 'var(--c-bd0)'}`,
              }}
              onMouseEnter={e => { if (!isToday) e.currentTarget.style.background = 'var(--c-bg2)' }}
              onMouseLeave={e => { if (!isToday) e.currentTarget.style.background = 'var(--c-bg1)' }}
            >
              <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? '#f97316' : 'var(--c-tx2)', marginBottom: 3 }}>
                {day.getDate()}
              </div>
              {dayEvents.slice(0, 3).map(ev => (
                <EventChip key={ev._id} ev={ev} onClick={e => { e.stopPropagation(); onEventClick(ev) }} />
              ))}
              {dayEvents.length > 3 && (
                <div style={{ fontSize: 10, color: 'var(--c-tx3)' }}>+{dayEvents.length - 3} mais</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── View Semana ──────────────────────────────────────────────────────────────
const WeekView = ({ current, events, onDayClick, onEventClick }) => {
  const mon  = startOfWeek(current)
  const days = Array.from({ length: 7 }, (_, i) => addDays(mon, i))
  const todayStr = new Date().toDateString()

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map(day => {
        const dayEvents = events.filter(ev => isSameDay(ev.date, day))
        const isToday   = day.toDateString() === todayStr
        return (
          <div key={day.toISOString()}>
            <div style={{ textAlign: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--c-tx3)', fontWeight: 600 }}>
                {DIAS_SEMANA[day.getDay() === 0 ? 6 : day.getDay() - 1]}
              </div>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', margin: '4px auto',
                background: isToday ? '#f97316' : 'transparent',
                color: isToday ? 'white' : 'var(--c-tx1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: isToday ? 700 : 400,
                cursor: 'pointer',
              }}
              onClick={() => onDayClick(day)}>
                {day.getDate()}
              </div>
            </div>
            <div style={{ minHeight: 120, padding: 2 }}>
              {dayEvents.map(ev => (
                <EventChip key={ev._id} ev={ev} onClick={onEventClick} />
              ))}
              {dayEvents.length === 0 && (
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <Plus size={16} style={{ color: 'var(--c-bd0)', cursor: 'pointer' }}
                    onClick={() => onDayClick(day)} />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── View Dia ─────────────────────────────────────────────────────────────────
const DayView = ({ current, events, onEventClick }) => {
  const dayEvents = events
    .filter(ev => isSameDay(ev.date, current))
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-tx0)', marginBottom: 16 }}>
        {current.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </h3>
      {dayEvents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--c-tx3)' }}>
          <CheckCircle2 size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: 14 }}>Nenhum agendamento neste dia</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dayEvents.map(ev => {
            const tipo = TIPOS[ev.type] ?? TIPOS.outro
            const Icon = tipo.icon
            return (
              <div key={ev._id}
                onClick={() => onEventClick(ev)}
                style={{
                  display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 16px',
                  borderRadius: 12, cursor: 'pointer',
                  background: 'var(--c-bg1)', border: `1px solid var(--c-bd0)`,
                  borderLeft: `4px solid ${tipo.color}`,
                }}>
                <div style={{ background: tipo.bg, borderRadius: 10, padding: 10, flexShrink: 0 }}>
                  <Icon size={16} style={{ color: tipo.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-tx0)' }}>{ev.title}</p>
                    {ev.isVirtual && (
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: tipo.bg, color: tipo.color }}>sincronizado</span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--c-tx3)' }}>
                    {fmtTime(ev.date)} · {tipo.label}
                    {ev.status && ` · ${STATUS_LABELS[ev.status]?.label ?? ev.status}`}
                  </p>
                  {ev.description && <p style={{ fontSize: 12, color: 'var(--c-tx2)', marginTop: 4 }}>{ev.description}</p>}
                  {ev.relatedOS && (
                    <p style={{ fontSize: 11, color: 'var(--c-tx3)', marginTop: 4 }}>
                      🔗 OS-{String(ev.relatedOS.number).padStart(3,'0')}: {ev.relatedOS.title}
                    </p>
                  )}
                  {ev.type === 'cheque_vencimento' && (
                    <p style={{ fontSize: 11, color: '#a855f7', marginTop: 4 }}>
                      {(ev.amount ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      {ev.chequeBanco ? ` · ${ev.chequeBanco}` : ''}
                      {ev.chequeDestino === 'fornecedor' ? ' · 🤝 Fornecedor' : ' · 🏦 A Depositar'}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────
const AgendamentosPage = () => {
  const [view, setView]       = useState('mes')
  const [current, setCurrent] = useState(new Date())
  const [events, setEvents]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal]     = useState(false)
  const [defaultDate, setDefaultDate] = useState('')
  const [editAg, setEditAg]           = useState(null)
  const [detailEv, setDetailEv]       = useState(null)

  const getRange = useCallback(() => {
    if (view === 'dia') {
      const d = new Date(current); d.setHours(0,0,0,0)
      const e = new Date(current); e.setHours(23,59,59,999)
      return { from: d, to: e }
    }
    if (view === 'semana') {
      const mon = startOfWeek(current)
      return { from: mon, to: addDays(mon, 6) }
    }
    // mês
    return { from: startOfMonth(current), to: endOfMonth(current) }
  }, [view, current])

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const { from, to } = getRange()
      const fmt = (d) => d.toISOString().split('T')[0]
      const res = await api.get(`/s/agendamentos?from=${fmt(from)}&to=${fmt(to)}`)
      const { agendamentos = [], osEvents = [], chequeEvents = [] } = res.data.data
      // OS concluídas recebem tipo visual diferente
      const osTagged = osEvents.map(e =>
        e.relatedOS?.status === 'concluido'
          ? { ...e, type: 'entrega_os_concluida' }
          : e
      )
      setEvents([...agendamentos, ...osTagged, ...chequeEvents])
    } catch {
      toast.error('Erro ao carregar agendamentos')
    } finally { setLoading(false) }
  }, [getRange])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const navigate = (dir) => {
    setCurrent(prev => {
      const d = new Date(prev)
      if (view === 'dia')    d.setDate(d.getDate() + dir)
      if (view === 'semana') d.setDate(d.getDate() + dir * 7)
      if (view === 'mes')    d.setMonth(d.getMonth() + dir)
      return d
    })
  }

  const headerLabel = () => {
    if (view === 'dia') {
      return current.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
    }
    if (view === 'semana') {
      const mon = startOfWeek(current)
      const sun = addDays(mon, 6)
      return `${mon.getDate()}/${mon.getMonth()+1} – ${sun.getDate()}/${sun.getMonth()+1}/${sun.getFullYear()}`
    }
    return `${MESES[current.getMonth()]} ${current.getFullYear()}`
  }

  const handleDayClick = (day) => {
    if (view !== 'dia') {
      setCurrent(new Date(day))
      setView('dia')
    } else {
      const y = day.getFullYear(), m = pad(day.getMonth()+1), d = pad(day.getDate())
      setDefaultDate(`${y}-${m}-${d}`)
      setShowModal(true)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este agendamento?')) return
    try {
      await api.delete(`/s/agendamentos/${id}`)
      toast.success('Agendamento excluído')
      fetchEvents()
    } catch { toast.error('Erro ao excluir') }
  }

  const openCreate = () => {
    setDefaultDate('')
    setEditAg(null)
    setShowModal(true)
  }

  // Separar eventos do dia de hoje para o painel lateral
  const hoje = new Date()
  const todayEvents = events
    .filter(ev => isSameDay(ev.date, hoje))
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--c-tx0)' }}>Agendamentos</h1>
          <p className="text-base mt-1" style={{ color: 'var(--c-tx2)' }}>Visitas, entregas e lembretes sincronizados</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl text-base font-semibold"
          style={{ background: 'linear-gradient(135deg,#f97316,#ea6c10)', color: 'white' }}>
          <Plus size={18} /> Novo Agendamento
        </button>
      </div>

      <div className="flex gap-6">
        {/* Calendário principal */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button onClick={() => navigate(-1)}
                style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)', color: 'var(--c-tx2)', cursor: 'pointer' }}>
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-tx0)', minWidth: 200, textAlign: 'center', textTransform: 'capitalize' }}>
                {headerLabel()}
              </span>
              <button onClick={() => navigate(1)}
                style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)', color: 'var(--c-tx2)', cursor: 'pointer' }}>
                <ChevronRight size={16} />
              </button>
              <button onClick={() => { setCurrent(new Date()); setView('dia') }}
                style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)', color: 'var(--c-tx2)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                Hoje
              </button>
            </div>
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--c-bd0)' }}>
              {['dia','semana','mes'].map(v => (
                <button key={v} onClick={() => setView(v)}
                  style={{
                    padding: '7px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
                    background: view === v ? '#f97316' : 'var(--c-bg1)',
                    color: view === v ? 'white' : 'var(--c-tx2)',
                    textTransform: 'capitalize',
                  }}>
                  {v === 'dia' ? 'Dia' : v === 'semana' ? 'Semana' : 'Mês'}
                </button>
              ))}
            </div>
          </div>

          {/* Grade do calendário */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--c-bg0)', border: '1px solid var(--c-bd0)' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--c-tx3)' }}>Carregando...</div>
            ) : view === 'mes' ? (
              <MonthView current={current} events={events} onDayClick={handleDayClick} onEventClick={setDetailEv} />
            ) : view === 'semana' ? (
              <WeekView current={current} events={events} onDayClick={handleDayClick} onEventClick={setDetailEv} />
            ) : (
              <DayView current={current} events={events} onEventClick={setDetailEv} />
            )}
          </div>
        </div>

        {/* Painel lateral — Hoje */}
        <div style={{ width: 240, flexShrink: 0 }}>
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
            <div className="px-4 py-4" style={{ borderBottom: '1px solid var(--c-bd0)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-tx0)' }}>Hoje</p>
              <p style={{ fontSize: 11, color: 'var(--c-tx3)', marginTop: 2 }}>
                {hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
              </p>
            </div>
            {todayEvents.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                <CheckCircle2 size={28} style={{ color: 'var(--c-bd0)', margin: '0 auto 8px' }} />
                <p style={{ fontSize: 12, color: 'var(--c-tx3)' }}>Sem agendamentos hoje</p>
              </div>
            ) : (
              todayEvents.map(ev => {
                const tipo = TIPOS[ev.type] ?? TIPOS.outro
                return (
                  <div key={ev._id}
                    onClick={() => setDetailEv(ev)}
                    style={{
                      padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--c-bd0)',
                      borderLeft: `3px solid ${tipo.color}`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--c-bg2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-tx0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.title}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--c-tx3)', marginTop: 2 }}>{fmtTime(ev.date)} · {tipo.label}</p>
                  </div>
                )
              })
            )}
          </div>

          {/* Legenda */}
          <div className="rounded-2xl mt-4 p-4" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-tx2)', marginBottom: 10 }}>Legenda</p>
            {Object.entries(TIPOS).map(([k, v]) => {
              const Icon = v.icon
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: v.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--c-tx2)' }}>{v.label}</span>
                </div>
              )
            })}
            <div style={{ borderTop: '1px solid var(--c-bd0)', marginTop: 10, paddingTop: 10, fontSize: 11, color: 'var(--c-tx3)' }}>
              🔗 = sincronizado com OS
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <AgModal
          ag={editAg}
          defaultDate={defaultDate}
          onClose={() => { setShowModal(false); setEditAg(null) }}
          onSaved={fetchEvents}
        />
      )}

      {detailEv && (
        <EventDetail
          ev={detailEv}
          onClose={() => setDetailEv(null)}
          onEdit={(ev) => { setEditAg(ev); setShowModal(true) }}
          onDelete={(id) => { setDetailEv(null); handleDelete(id) }}
        />
      )}
    </div>
  )
}

export default AgendamentosPage
