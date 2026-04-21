import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import useAutoRefresh from '../../hooks/useAutoRefresh'
import {
  Plus, Search, ClipboardList, X, Pencil, Trash2, Printer,
  Clock, Wrench, CheckCircle2, XCircle, ChevronRight, User,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import SearchableSelect from '../../components/SearchableSelect'

// ─── Constantes ───────────────────────────────────────────────────────────────
const STATUS = {
  pendente:    { label: 'Pendente',     bg: 'rgba(234,179,8,0.15)',   color: '#eab308', icon: Clock },
  em_execucao: { label: 'Em Execução',  bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa', icon: Wrench },
  concluido:   { label: 'Concluído',    bg: 'rgba(34,197,94,0.15)',   color: '#22c55e', icon: CheckCircle2 },
  cancelado:   { label: 'Cancelado',    bg: 'rgba(239,68,68,0.15)',   color: '#ef4444', icon: XCircle },
}

const fmt = (v) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

const inp = (err) => ({
  background: 'var(--c-bg2)',
  border: `1px solid ${err ? '#ef4444' : 'var(--c-bd1)'}`,
  color: 'var(--c-tx0)', borderRadius: 10, padding: '9px 12px', fontSize: 13, width: '100%', outline: 'none',
})

const Field = ({ label, error, children }) => (
  <div>
    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--c-tx1)' }}>{label}</label>
    {children}
    {error && <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>{error}</p>}
  </div>
)

const StatusBadge = ({ status }) => {
  const s = STATUS[status] ?? STATUS.pendente
  const Icon = s.icon
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
      style={{ background: s.bg, color: s.color }}>
      <Icon size={11} /> {s.label}
    </span>
  )
}

// ─── Modal Criar/Editar OS ────────────────────────────────────────────────────
const OSModal = ({ os, onClose, onSaved, initialBudgetId = '' }) => {
  const isEdit = !!os
  const { user: currentUser } = useAuth()
  const [budgets, setBudgets]         = useState([])
  const [responsaveis, setResponsaveis] = useState([])
  const [budgetId, setBudgetId]       = useState(os?.budget?._id ?? os?.budget ?? initialBudgetId)
  const [title, setTitle]             = useState(os?.title ?? '')
  const [description, setDescription] = useState(os?.description ?? '')
  const [assignedToId, setAssignedToId] = useState(os?.assignedTo?._id ?? os?.assignedTo ?? '')
  const [dueDate, setDueDate]         = useState(os?.dueDate ? os.dueDate.split('T')[0] : '')
  const [notes, setNotes]             = useState(os?.notes ?? '')
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/s/budgets?status=aprovado&limit=100'),
      api.get('/s/employees'),
      api.get('/s/profile'),
    ]).then(([bRes, eRes, profileRes]) => {
      setBudgets(bRes.data.data.budgets ?? [])
      const ativos = (eRes.data.data.employees ?? []).filter(e => e.isActive)
      const perfil = profileRes.data.data
      // Dono aparece no topo da lista como opção
      const lista = [
        { _id: `user-${perfil._id}`, name: perfil.name, cargo: 'Proprietário', isOwner: true },
        ...ativos,
      ]
      setResponsaveis(lista)
    }).catch(() => {})
  }, [])

  const handleSave = async () => {
    setError('')
    if (!isEdit && !budgetId) return setError('Selecione um orçamento aprovado.')
    if (!title.trim()) return setError('Informe o título da OS.')
    setSaving(true)
    // Detecta se o responsável é o dono (ID virtual) ou um funcionário
    const isOwnerSelected = assignedToId?.startsWith('user-')
    const empId      = isOwnerSelected ? null : (assignedToId || null)
    const ownerName  = isOwnerSelected
      ? (responsaveis.find(r => r._id === assignedToId)?.name ?? '')
      : ''
    try {
      if (isEdit) {
        await api.put(`/s/os/${os._id}`, { title, description, assignedToId: empId, assignedUserName: ownerName, dueDate: dueDate || null, notes })
        toast.success('OS atualizada!')
      } else {
        await api.post('/s/os', { budgetId, title, description, assignedToId: empId, assignedUserName: ownerName, dueDate: dueDate || null, notes })
        toast.success('Ordem de Serviço criada!')
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e.response?.data?.message || 'Erro ao salvar OS.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-lg rounded-2xl my-4" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--c-bd0)' }}>
          <h2 className="text-base font-bold" style={{ color: 'var(--c-tx0)' }}>
            {isEdit ? 'Editar OS' : 'Nova Ordem de Serviço'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--c-tx3)', background: 'var(--c-bg2)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!isEdit && (
            <Field label="Orçamento Aprovado *">
              <SearchableSelect
                value={budgetId}
                onChange={setBudgetId}
                error={!budgetId && !!error}
                placeholder="Selecione o orçamento aprovado..."
                options={budgets.map(b => ({
                  value: b._id,
                  label: `ORC-${String(b.number).padStart(3,'0')} — ${b.client?.name}`,
                  sub: fmt(b.total),
                }))}
              />
            </Field>
          )}

          <Field label="Título *">
            <input value={title} onChange={e => setTitle(e.target.value)} style={inp(!title && error)}
              placeholder="Ex: Fabricação de portão — João Silva" />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Responsável (opcional)">
              <SearchableSelect
                value={assignedToId}
                onChange={setAssignedToId}
                placeholder="Sem responsável"
                clearable
                options={responsaveis.map(e => ({
                  value: e._id,
                  label: e.name,
                  sub: e.cargo,
                }))}
              />
            </Field>
            <Field label="Prazo (opcional)">
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inp()} />
            </Field>
          </div>

          <Field label="Descrição">
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              style={{ ...inp(), resize: 'none' }} placeholder="Detalhes do serviço a ser executado..." />
          </Field>

          <Field label="Observações">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              style={{ ...inp(), resize: 'none' }} placeholder="Informações internas..." />
          </Field>

          {error && (
            <p className="text-xs px-3 py-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm"
              style={{ background: 'var(--c-bd0)', color: 'var(--c-tx1)' }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg,#f97316,#ea6c10)', color: 'white', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar OS'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Painel lateral de detalhe da OS ─────────────────────────────────────────
const OSPanel = ({ osId, onClose, onUpdated, isOwner }) => {
  const [os, setOs]         = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/s/os/${osId}`)
      setOs(res.data.data.os)
    } catch { toast.error('Erro ao carregar OS') }
    finally { setLoading(false) }
  }, [osId])

  useEffect(() => { load() }, [load])

  const handleStatus = async (status) => {
    try {
      await api.put(`/s/os/${osId}`, { status })
      toast.success('Status atualizado!')
      load()
      onUpdated()
    } catch (e) { toast.error(e.response?.data?.message || 'Erro') }
  }

  const handleDelete = async () => {
    if (!window.confirm('Excluir esta OS?')) return
    try {
      await api.delete(`/s/os/${osId}`)
      toast.success('OS excluída')
      onClose()
      onUpdated()
    } catch (e) { toast.error(e.response?.data?.message || 'Erro ao excluir OS') }
  }

  const handlePrint = () => {
    if (!os) return
    const co = os.company
    const cl = os.client
    const b  = os.budget
    const emp = os.assignedTo
    const osNum = `OS-${String(os.number).padStart(3, '0')}`

    const fmtAddr = (a) => {
      if (!a) return ''
      return [
        a.street && a.number ? `${a.street}, ${a.number}` : a.street,
        a.neighborhood, a.city && a.state ? `${a.city} — ${a.state}` : a.city,
      ].filter(Boolean).join(' · ')
    }

    const statusLabels = { pendente: 'Pendente', em_execucao: 'Em Execução', concluido: 'Concluído', cancelado: 'Cancelado' }

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>${osNum}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;background:#fff;padding:28px 32px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:2px solid #1a1a1a;margin-bottom:20px}
    .company-name{font-size:22px;font-weight:800}
    .company-meta{font-size:11px;color:#555;margin-top:4px;line-height:1.6}
    .doc-number{font-size:20px;font-weight:700;color:#e05c00;text-align:right}
    .doc-date{font-size:11px;color:#666;margin-top:4px;line-height:1.6;text-align:right}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
    .box{border:1px solid #ddd;border-radius:6px;padding:12px 14px}
    .box-title{font-size:10px;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:.5px;margin-bottom:8px}
    .box-value{font-size:13px;font-weight:600;color:#1a1a1a;line-height:1.5}
    .box-sub{font-size:11px;color:#666;margin-top:2px}
    .section-title{font-size:11px;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:.5px;margin:20px 0 10px}
    .desc-box{border:1px solid #ddd;border-radius:6px;padding:14px;min-height:80px;font-size:13px;line-height:1.7;white-space:pre-wrap}
    .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:48px}
    .sig-line{border-top:1px solid #1a1a1a;padding-top:8px;font-size:11px;color:#444;text-align:center}
    .status-badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid #ccc;margin-top:5px}
    @media print{body{padding:16px 20px}}
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">${co?.name ?? 'Empresa'}</div>
      <div class="company-meta">
        ${co?.cnpj ? `CNPJ: ${co.cnpj}` : ''}${co?.cnpj && co?.phone ? ' &nbsp;|&nbsp; ' : ''}${co?.phone ? `Tel: ${co.phone}` : ''}
        ${fmtAddr(co?.address) ? `<br>${fmtAddr(co.address)}` : ''}
      </div>
    </div>
    <div>
      <div class="doc-number">${osNum}</div>
      <div class="doc-date">
        Emitida em: ${fmtDate(os.createdAt)}<br>
        ${os.dueDate ? `Prazo: ${fmtDate(os.dueDate)}<br>` : ''}
        <span class="status-badge">${statusLabels[os.status] ?? os.status}</span>
      </div>
    </div>
  </div>

  <div class="grid2">
    <div class="box">
      <div class="box-title">Cliente</div>
      <div class="box-value">${cl?.name ?? '—'}</div>
      ${cl?.phone ? `<div class="box-sub">Tel: ${cl.phone}</div>` : ''}
      ${fmtAddr(cl?.address) ? `<div class="box-sub">${fmtAddr(cl.address)}</div>` : ''}
    </div>
    <div class="box">
      <div class="box-title">Referência do Orçamento</div>
      <div class="box-value">ORC-${String(b?.number ?? 0).padStart(3,'0')}</div>
      ${b?.total ? `<div class="box-sub">Valor total: ${fmt(b.total)}</div>` : ''}
      ${emp ? `<div class="box-sub" style="margin-top:8px"><b>Responsável:</b> ${emp.name}${emp.cargo ? ` — ${emp.cargo}` : ''}</div>` : ''}
    </div>
  </div>

  <div class="section-title">Título da OS</div>
  <div class="desc-box" style="min-height:40px;font-weight:600">${os.title}</div>

  ${os.description ? `
  <div class="section-title">Descrição do Serviço</div>
  <div class="desc-box">${os.description.replace(/\n/g,'<br>')}</div>` : ''}

  ${os.notes ? `
  <div class="section-title">Observações</div>
  <div class="desc-box" style="font-size:12px;color:#555">${os.notes.replace(/\n/g,'<br>')}</div>` : ''}

  <div class="sig-grid">
    <div class="sig-line">Responsável pelo Serviço<br><small>${emp?.name ?? '_________________________'}</small></div>
    <div class="sig-line">Aprovado por / Cliente<br><small>${cl?.name ?? '_________________________'}</small></div>
  </div>
</body>
</html>`

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    setTimeout(() => w.print(), 300)
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="h-full w-full max-w-md flex flex-col overflow-hidden"
        style={{ background: 'var(--c-bg1)', borderLeft: '1px solid var(--c-bd0)' }}>

        {/* Header do painel */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--c-bd0)' }}>
          <h2 className="text-base font-bold" style={{ color: 'var(--c-tx0)' }}>
            {os ? `OS-${String(os.number).padStart(3, '0')}` : 'Carregando...'}
          </h2>
          <div className="flex items-center gap-2">
            {os && (
              <>
                <button onClick={handlePrint} className="p-2 rounded-xl" title="Imprimir"
                  style={{ background: 'var(--c-bg2)', color: 'var(--c-tx2)' }}>
                  <Printer size={16} />
                </button>
                <button onClick={() => setShowEdit(true)} className="p-2 rounded-xl" title="Editar"
                  style={{ background: 'var(--c-bg2)', color: 'var(--c-tx2)' }}>
                  <Pencil size={16} />
                </button>
                {isOwner && os.status === 'pendente' && (
                  <button onClick={handleDelete} className="p-2 rounded-xl" title="Excluir"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                    <Trash2 size={16} />
                  </button>
                )}
              </>
            )}
            <button onClick={onClose} className="p-2 rounded-xl"
              style={{ background: 'var(--c-bg2)', color: 'var(--c-tx3)' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 rounded-full animate-spin"
              style={{ borderColor: 'var(--c-bd1)', borderTopColor: '#f97316' }} />
          </div>
        ) : !os ? null : (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* Status + botões de progressão */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--c-tx3)' }}>Status</p>
              <StatusBadge status={os.status} />
              {os.status !== 'concluido' && os.status !== 'cancelado' && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {os.status === 'pendente' && (
                    <button onClick={() => handleStatus('em_execucao')}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                      style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>
                      Iniciar Execução
                    </button>
                  )}
                  {os.status === 'em_execucao' && (
                    <button onClick={() => handleStatus('concluido')}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                      style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                      Marcar como Concluído
                    </button>
                  )}
                  {isOwner && (
                    <button onClick={() => handleStatus('cancelado')}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                      Cancelar OS
                    </button>
                  )}
                </div>
              )}
              {os.completedAt && (
                <p className="text-xs mt-2" style={{ color: 'var(--c-tx3)' }}>
                  Concluído em {fmtDate(os.completedAt)}
                </p>
              )}
            </div>

            {/* Informações principais */}
            <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--c-bg0)', border: '1px solid var(--c-bd0)' }}>
              <div>
                <p className="text-xs" style={{ color: 'var(--c-tx3)' }}>Título</p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--c-tx0)' }}>{os.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs" style={{ color: 'var(--c-tx3)' }}>Cliente</p>
                  <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--c-tx0)' }}>{os.client?.name}</p>
                  {os.client?.phone && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--c-tx2)' }}>{os.client.phone}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--c-tx3)' }}>Orçamento</p>
                  <p className="text-sm font-medium mt-0.5" style={{ color: '#f97316' }}>
                    ORC-{String(os.budget?.number ?? 0).padStart(3, '0')}
                  </p>
                  {os.budget?.total && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--c-tx2)' }}>{fmt(os.budget.total)}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--c-tx3)' }}>Responsável</p>
                  <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--c-tx0)' }}>
                    {(os.assignedTo?.name ?? os.assignedUserName) || <span style={{ color: 'var(--c-tx3)' }}>Não definido</span>}
                  </p>
                  {os.assignedTo?.cargo && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--c-tx2)' }}>{os.assignedTo.cargo}</p>
                  )}
                  {!os.assignedTo && os.assignedUserName && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--c-tx2)' }}>Proprietário</p>
                  )}
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--c-tx3)' }}>Prazo</p>
                  <p className="text-sm font-medium mt-0.5"
                    style={{ color: os.dueDate && new Date(os.dueDate) < new Date() && os.status !== 'concluido' ? '#ef4444' : 'var(--c-tx0)' }}>
                    {fmtDate(os.dueDate)}
                  </p>
                </div>
              </div>
            </div>

            {os.description && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--c-tx3)' }}>Descrição</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--c-tx1)' }}>
                  {os.description}
                </p>
              </div>
            )}

            {os.notes && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--c-tx3)' }}>Observações</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--c-tx2)' }}>
                  {os.notes}
                </p>
              </div>
            )}

            <div>
              <p className="text-xs" style={{ color: 'var(--c-tx3)' }}>
                Criado em {fmtDate(os.createdAt)} por {os.createdBy?.name ?? '—'}
              </p>
            </div>
          </div>
        )}
      </div>

      {showEdit && os && (
        <OSModal
          os={os}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); load(); onUpdated() }}
        />
      )}
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────
const OrdensServicoPage = () => {
  const { user } = useAuth()
  const isOwner = user?.role === 'owner'
  const [searchParams] = useSearchParams()

  const [osList, setOsList]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage]             = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [stats, setStats]           = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [createBudgetId, setCreateBudgetId] = useState(() => searchParams.get('budgetId') ?? '')

  // Auto-abre modal de criação com orçamento pré-selecionado quando vindo de Orçamentos
  useEffect(() => {
    if (createBudgetId) setShowCreate(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 15 })
      if (search) params.append('search', search)
      if (statusFilter) params.append('status', statusFilter)
      const [listRes, statsRes] = await Promise.all([
        api.get(`/s/os?${params}`),
        api.get('/s/os/stats'),
      ])
      setOsList(listRes.data.data.os)
      setTotalPages(listRes.data.data.pages)
      setStats(statsRes.data.data)
    } catch { toast.error('Erro ao carregar ordens de serviço') }
    finally { setLoading(false) }
  }, [search, statusFilter, page])

  useEffect(() => { fetchList() }, [fetchList])
  useAutoRefresh(fetchList)

  const kpis = [
    { label: 'Total de OS',    value: stats?.total ?? 0,       color: '#f97316', icon: ClipboardList },
    { label: 'Pendentes',      value: stats?.pendente ?? 0,    color: '#eab308', icon: Clock },
    { label: 'Em Execução',    value: stats?.em_execucao ?? 0, color: '#60a5fa', icon: Wrench },
    { label: 'Concluídas',     value: stats?.concluido ?? 0,   color: '#22c55e', icon: CheckCircle2 },
  ]

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--c-tx0)' }}>Ordens de Serviço</h1>
          <p className="text-base mt-1" style={{ color: 'var(--c-tx2)' }}>Acompanhe a execução dos serviços</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl text-base font-semibold"
          style={{ background: 'linear-gradient(135deg,#f97316,#ea6c10)', color: 'white' }}>
          <Plus size={18} /> Nova OS
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {kpis.map(k => {
          const Icon = k.icon
          return (
            <div key={k.label} className="rounded-2xl p-4" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium" style={{ color: 'var(--c-tx2)' }}>{k.label}</p>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${k.color}22` }}>
                  <Icon size={16} style={{ color: k.color }} />
                </div>
              </div>
              <p className="text-3xl font-bold" style={{ color: 'var(--c-tx0)' }}>{k.value}</p>
            </div>
          )
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl flex-1"
          style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
          <Search size={16} style={{ color: 'var(--c-tx3)', flexShrink: 0 }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por título, cliente ou número..."
            className="flex-1 bg-transparent outline-none text-base"
            style={{ color: 'var(--c-tx0)' }} />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="py-3 px-4 rounded-2xl text-sm outline-none"
          style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)', color: 'var(--c-tx0)', minWidth: 160 }}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center h-56">
          <div className="w-10 h-10 border-4 rounded-full animate-spin"
            style={{ borderColor: 'var(--c-bd1)', borderTopColor: '#f97316' }} />
        </div>
      ) : osList.length === 0 ? (
        <div className="rounded-2xl text-center py-16" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
          <ClipboardList size={40} className="mx-auto mb-3" style={{ color: 'var(--c-bd0)' }} />
          <p className="text-base font-medium" style={{ color: 'var(--c-tx2)' }}>Nenhuma OS encontrada</p>
          <p className="text-sm mt-1" style={{ color: 'var(--c-tx3)' }}>Crie uma OS a partir de um orçamento aprovado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {osList.map(os => {
            const st = STATUS[os.status] ?? STATUS.pendente
            const vencida = os.dueDate && new Date(os.dueDate) < new Date() && os.status !== 'concluido' && os.status !== 'cancelado'
            return (
              <button key={os._id} onClick={() => setSelectedId(os._id)}
                className="w-full rounded-xl p-4 flex items-center gap-4 text-left transition-colors"
                style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--c-bd1)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--c-bd0)'}>

                {/* Número */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{ background: `${st.color}22`, color: st.color }}>
                  {String(os.number).padStart(3, '0')}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--c-tx0)' }}>{os.title}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs" style={{ color: 'var(--c-tx2)' }}>{os.client?.name}</span>
                    <span className="text-xs" style={{ color: 'var(--c-tx3)' }}>
                      ORC-{String(os.budget?.number ?? 0).padStart(3, '0')}
                    </span>
                    {(os.assignedTo || os.assignedUserName) && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--c-tx3)' }}>
                        <User size={10} /> {os.assignedTo?.name ?? os.assignedUserName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status + prazo */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <StatusBadge status={os.status} />
                  {os.dueDate && (
                    <span className="text-xs" style={{ color: vencida ? '#ef4444' : 'var(--c-tx3)' }}>
                      {vencida ? 'Vencida · ' : 'Prazo · '}{fmtDate(os.dueDate)}
                    </span>
                  )}
                </div>

                <ChevronRight size={16} style={{ color: 'var(--c-bd1)', flexShrink: 0 }} />
              </button>
            )
          })}
        </div>
      )}

      {/* Paginação */}
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

      {showCreate && (
        <OSModal
          onClose={() => { setShowCreate(false); setCreateBudgetId('') }}
          onSaved={fetchList}
          initialBudgetId={createBudgetId}
        />
      )}

      {selectedId && (
        <OSPanel
          osId={selectedId}
          isOwner={isOwner}
          onClose={() => setSelectedId(null)}
          onUpdated={fetchList}
        />
      )}
    </div>
  )
}

export default OrdensServicoPage
