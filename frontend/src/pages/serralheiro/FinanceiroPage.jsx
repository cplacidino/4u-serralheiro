import { useEffect, useState, useCallback } from 'react'
import useAutoRefresh from '../../hooks/useAutoRefresh'
import {
  Plus, X, Pencil, Trash2, TrendingUp, TrendingDown, Wallet,
  ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle,
  Clock, Percent, CheckCircle2, Download,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (d) => new Date(d).toLocaleDateString('pt-BR')
const toInputDate = (d) => new Date(d).toISOString().split('T')[0]
const today = () => { const d = new Date(); d.setHours(0,0,0,0); return d }

const monthLabel = (y, m) => {
  const d = new Date(y, m - 1, 1)
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const inputCls = (err) => ({
  background: 'var(--c-bg2)',
  border: `1px solid ${err ? '#ef4444' : 'var(--c-bd1)'}`,
  color: 'var(--c-tx0)',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 14,
  width: '100%',
  outline: 'none',
})

const Field = ({ label, error, children }) => (
  <div>
    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--c-tx1)' }}>{label}</label>
    {children}
    {error && <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>{error}</p>}
  </div>
)

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <div className="rounded-2xl p-5" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--c-tx2)' }}>{title}</p>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}22` }}>
        <Icon size={20} style={{ color }} />
      </div>
    </div>
    <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    {subtitle && <p className="text-xs mt-1" style={{ color: 'var(--c-tx3)' }}>{subtitle}</p>}
  </div>
)

// ─── Modal de lançamento ───────────────────────────────────────────────────────
const TransactionModal = ({ tx, categories, categoryGroups, onClose, onSaved }) => {
  const isEdit = !!tx
  const [type, setType] = useState(tx?.type ?? 'receita')
  const [group, setGroup] = useState(() => {
    if (tx?.category) {
      const found = Object.entries(categoryGroups ?? {}).find(([, cats]) => cats.includes(tx.category))
      return found ? found[0] : ''
    }
    return ''
  })
  const [category, setCategory] = useState(tx?.category ?? '')
  const [description, setDescription] = useState(tx?.description ?? '')
  const [amount, setAmount] = useState(tx?.amount ?? '')
  const [date, setDate] = useState(tx?.date ? toInputDate(tx.date) : toInputDate(new Date()))
  const [agendarPagar, setAgendarPagar] = useState(tx ? !tx.isPaid : false)
  const [dueDate, setDueDate] = useState(tx?.dueDate ? toInputDate(tx.dueDate) : '')
  const [supplier, setSupplier] = useState(tx?.supplier ?? '')
  const [paymentMethod, setPaymentMethod] = useState(tx?.paymentMethod ?? '')
  const [recorrente, setRecorrente] = useState(false)
  const [diaVencimento, setDiaVencimento] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleTypeChange = (t) => { setType(t); setCategory(''); setGroup(''); setAgendarPagar(false); setPaymentMethod('') }

  const PAYMENT_OPTS = [
    { value: '', label: 'Não informado' },
    { value: 'dinheiro', label: 'Dinheiro' },
    { value: 'pix', label: 'PIX' },
    { value: 'cartão_débito', label: 'Cartão Débito' },
    { value: 'cartão_crédito', label: 'Cartão Crédito' },
    { value: 'transferência', label: 'Transferência' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'outro', label: 'Outro' },
  ]

  const groupOptions = Object.keys(categoryGroups ?? {})
  const catOptions = type === 'receita'
    ? (categories?.receita ?? [])
    : (group ? (categoryGroups?.[group] ?? []) : [])

  const handleSave = async () => {
    setError('')
    if (!category) return setError('Selecione uma categoria.')
    if (!description.trim()) return setError('Descrição é obrigatória.')
    if (!amount || Number(amount) <= 0) return setError('Valor deve ser maior que zero.')
    if (recorrente && (!diaVencimento || Number(diaVencimento) < 1 || Number(diaVencimento) > 31))
      return setError('Informe o dia de vencimento (1–31).')
    if (!recorrente && agendarPagar && !dueDate) return setError('Data de vencimento é obrigatória.')
    if (!recorrente && !agendarPagar && !date) return setError('Data é obrigatória.')

    setSaving(true)
    try {
      const payload = { type, category, description, amount: Number(amount) }
      if (recorrente && type === 'despesa') {
        payload.recorrente = true
        payload.diaVencimento = Number(diaVencimento)
        payload.isPaid = false
        payload.dueDate = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(diaVencimento).padStart(2,'0')}`
      } else if (agendarPagar) {
        payload.isPaid = false
        payload.dueDate = dueDate
      } else {
        payload.isPaid = true
        payload.date = date
      }
      if (supplier) payload.supplier = supplier
      if (paymentMethod) payload.paymentMethod = paymentMethod
      if (isEdit) {
        await api.put(`/s/finance/${tx._id}`, payload)
        toast.success('Lançamento atualizado!')
      } else {
        await api.post('/s/finance', payload)
        toast.success('Lançamento registrado!')
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e.response?.data?.message || 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-md rounded-2xl flex flex-col" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)', maxHeight: '90vh' }}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--c-bd0)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--c-tx0)' }}>
            {isEdit ? 'Editar Lançamento' : 'Novo Lançamento'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ color: 'var(--c-tx3)', background: 'var(--c-bg2)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4">
          {/* Tipo */}
          <div className="grid grid-cols-2 gap-3">
            {['receita', 'despesa'].map(t => (
              <button key={t} onClick={() => handleTypeChange(t)}
                className="py-3 rounded-xl text-base font-semibold capitalize transition-all"
                style={{
                  background: type === t
                    ? (t === 'receita' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)')
                    : 'var(--c-bg2)',
                  color: type === t
                    ? (t === 'receita' ? '#22c55e' : '#ef4444')
                    : 'var(--c-tx3)',
                  border: `2px solid ${type === t ? (t === 'receita' ? '#22c55e' : '#ef4444') : 'transparent'}`,
                }}>
                {t === 'receita' ? '↑ Receita' : '↓ Despesa'}
              </button>
            ))}
          </div>

          {/* Grupo (somente despesa) */}
          {type === 'despesa' && (
            <Field label="Grupo *">
              <select value={group} onChange={e => { setGroup(e.target.value); setCategory('') }} style={inputCls(!group && error)}>
                <option value="">Selecione o grupo...</option>
                {groupOptions.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
          )}

          {/* Categoria */}
          <Field label="Categoria *">
            <select value={category} onChange={e => setCategory(e.target.value)}
              style={inputCls(!category && error)}
              disabled={type === 'despesa' && !group}>
              <option value="">{type === 'despesa' && !group ? 'Selecione um grupo primeiro...' : 'Selecione...'}</option>
              {catOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Descrição *">
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Compra de vergalhões" style={inputCls(!description && error)} />
          </Field>

          <Field label="Valor (R$) *">
            <input type="number" min="0.01" step="0.01" value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0,00" style={inputCls(!amount && error)} />
          </Field>

          {/* Forma de pagamento (somente receita) */}
          {type === 'receita' && (
            <Field label="Forma de Pagamento">
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={inputCls(false)}>
                {PAYMENT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          )}

          {/* Fornecedor / Funcionário */}
          <Field label={type === 'receita' ? 'Cliente / Observação' : 'Fornecedor / Funcionário'}>
            <input value={supplier} onChange={e => setSupplier(e.target.value)}
              placeholder={type === 'receita' ? 'Ex: João Silva, serviço avulso...' : 'Ex: João Silva, Posto Shell...'} style={inputCls(false)} />
          </Field>

          {/* Toggle recorrente (somente despesa nova) */}
          {type === 'despesa' && !isEdit && (
            <div className="flex items-center gap-3 py-2">
              <button onClick={() => setRecorrente(v => !v)}
                className="w-11 h-6 rounded-full transition-all flex-shrink-0 relative"
                style={{ background: recorrente ? '#f97316' : 'var(--c-bd1)' }}>
                <span className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                  style={{ left: recorrente ? '24px' : '4px' }} />
              </button>
              <span className="text-sm" style={{ color: 'var(--c-tx1)' }}>Repetir todo mês automaticamente</span>
            </div>
          )}

          {/* Dia de vencimento (somente se recorrente) */}
          {recorrente && type === 'despesa' ? (
            <Field label="Dia do vencimento (1–31) *">
              <input type="number" min="1" max="31" value={diaVencimento}
                onChange={e => setDiaVencimento(e.target.value)}
                placeholder="Ex: 10" style={inputCls(!diaVencimento && error)} />
            </Field>
          ) : (
            <>
              {/* Toggle agendar para despesas não recorrentes */}
              {type === 'despesa' && !isEdit && (
                <div className="flex items-center gap-3 py-2">
                  <button
                    onClick={() => setAgendarPagar(v => !v)}
                    className="w-11 h-6 rounded-full transition-all flex-shrink-0 relative"
                    style={{ background: agendarPagar ? '#f97316' : 'var(--c-bd1)' }}
                  >
                    <span className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                      style={{ left: agendarPagar ? '24px' : '4px' }} />
                  </button>
                  <span className="text-sm" style={{ color: 'var(--c-tx1)' }}>Agendar para pagar depois</span>
                </div>
              )}

              {agendarPagar ? (
                <Field label="Data de vencimento *">
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                    style={inputCls(!dueDate && error)} />
                </Field>
              ) : (
                <Field label="Data *">
                  <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    style={inputCls(!date && error)} />
                </Field>
              )}
            </>
          )}

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6" style={{ borderTop: '1px solid var(--c-bd0)' }}>
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium"
            style={{ background: 'var(--c-bg2)', color: 'var(--c-tx1)' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-xl text-sm font-semibold"
            style={{
              background: type === 'receita'
                ? 'linear-gradient(135deg,#22c55e,#16a34a)'
                : 'linear-gradient(135deg,#ef4444,#dc2626)',
              color: 'white', opacity: saving ? 0.7 : 1,
            }}>
            {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Painel A Receber (Fiados) ─────────────────────────────────────────────────
const PainelAReceber = ({ fiados, totalPendente, onReceive }) => {
  const todayDate = today()
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--c-bd0)' }}>
        <h3 className="text-base font-bold" style={{ color: 'var(--c-tx0)' }}>A Receber</h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--c-tx3)' }}>Fiados e pagamentos em aberto</p>
      </div>
      {fiados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <CheckCircle2 size={36} style={{ color: 'var(--c-bd0)' }} />
          <p className="text-sm" style={{ color: 'var(--c-tx2)' }}>Nenhum valor a receber</p>
        </div>
      ) : (
        <div>
          {fiados.map(f => {
            const vencido = f.dueDate && new Date(f.dueDate) < todayDate
            return (
              <div key={f._id} className="px-5 py-4 flex items-center gap-3"
                style={{ borderBottom: '1px solid #1f1f24' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--c-tx0)' }}>
                    {f.clientName || f.client?.name || 'Cliente'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--c-tx3)' }}>
                    {f.budgetNumber ? `ORC-${String(f.budgetNumber).padStart(3,'0')}` : ''}
                    {f.dueDate ? ` · Venc. ${fmtDate(f.dueDate)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {vencido && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                      Vencido
                    </span>
                  )}
                  <span className="text-sm font-bold" style={{ color: '#eab308' }}>{fmt(f.amount)}</span>
                  <button
                    onClick={() => onReceive(f._id)}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                    style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                    Receber
                  </button>
                </div>
              </div>
            )
          })}
          <div className="px-5 py-3 flex items-center justify-between"
            style={{ borderTop: '1px solid var(--c-bd0)', background: 'var(--c-bg2)' }}>
            <span className="text-xs font-medium" style={{ color: 'var(--c-tx2)' }}>Total pendente</span>
            <span className="text-sm font-bold" style={{ color: '#eab308' }}>{fmt(totalPendente)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Painel A Pagar (Despesas Agendadas) ──────────────────────────────────────
const PainelAPagar = ({ expenses, totalDue, onPay }) => {
  const todayDate = today()
  const todayStr = todayDate.toDateString()
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--c-bd0)' }}>
        <h3 className="text-base font-bold" style={{ color: 'var(--c-tx0)' }}>A Pagar</h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--c-tx3)' }}>Despesas agendadas e vencidas</p>
      </div>
      {expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <CheckCircle2 size={36} style={{ color: 'var(--c-bd0)' }} />
          <p className="text-sm" style={{ color: 'var(--c-tx2)' }}>Nenhuma despesa pendente</p>
        </div>
      ) : (
        <div>
          {expenses.map(e => {
            const due = e.dueDate ? new Date(e.dueDate) : null
            const isVencida = due && due < todayDate
            const isHoje = due && due.toDateString() === todayStr
            return (
              <div key={e._id} className="px-5 py-4 flex items-center gap-3"
                style={{ borderBottom: '1px solid #1f1f24' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--c-tx0)' }}>
                    {e.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--c-bg2)', color: 'var(--c-tx2)' }}>
                      {e.category}
                    </span>
                    {due && (
                      <span className="text-xs" style={{ color: 'var(--c-tx3)' }}>
                        Venc. {fmtDate(due)}
                      </span>
                    )}
                    {isVencida && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                        VENCIDA
                      </span>
                    )}
                    {isHoje && !isVencida && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308' }}>
                        Hoje
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-bold" style={{ color: '#ef4444' }}>{fmt(e.amount)}</span>
                  <button
                    onClick={() => onPay(e._id)}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                    style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                    ✓ Paga
                  </button>
                </div>
              </div>
            )
          })}
          <div className="px-5 py-3 flex items-center justify-between"
            style={{ borderTop: '1px solid var(--c-bd0)', background: 'var(--c-bg2)' }}>
            <span className="text-xs font-medium" style={{ color: 'var(--c-tx2)' }}>Total a pagar</span>
            <span className="text-sm font-bold" style={{ color: '#ef4444' }}>{fmt(totalDue)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────
const FinanceiroPage = () => {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [summary, setSummary] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState({})
  const [typeFilter, setTypeFilter] = useState('')
  const [pendingFilter, setPendingFilter] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTx, setEditTx] = useState(null)
  const [categoryGroups, setCategoryGroups] = useState({})
  const [fiados, setFiados] = useState([])
  const [totalFiadoPainel, setTotalFiadoPainel] = useState(0)
  const [dueExpenses, setDueExpenses] = useState([])
  const [totalDue, setTotalDue] = useState(0)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [quickPeriod, setQuickPeriod] = useState('mes')

  const monthStr = `${year}-${String(month).padStart(2, '0')}`

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 15 })
      if (dateFrom || dateTo) {
        if (dateFrom) params.append('dateFrom', dateFrom)
        if (dateTo) params.append('dateTo', dateTo)
      } else {
        params.append('month', monthStr)
      }
      if (typeFilter) params.append('type', typeFilter)
      if (pendingFilter) params.append('pending', 'true')

      const summaryParams = new URLSearchParams()
      if (dateFrom || dateTo) {
        if (dateFrom) summaryParams.append('dateFrom', dateFrom)
        if (dateTo) summaryParams.append('dateTo', dateTo)
      } else {
        summaryParams.append('month', monthStr)
      }

      const [sumRes, txRes, fiadosRes, dueRes] = await Promise.all([
        api.get(`/s/finance/summary?${summaryParams}`),
        api.get(`/s/finance?${params}`),
        api.get('/s/payments/fiados').catch(() => ({ data: { data: { fiados: [], totalPendente: 0 } } })),
        api.get('/s/finance/due').catch(() => ({ data: { data: { expenses: [], totalDue: 0 } } })),
        api.post('/s/finance/generate-recurring').catch(() => {}),
      ])

      setSummary(sumRes.data.data)
      setTransactions(txRes.data.data.transactions)
      setTotalPages(txRes.data.data.pages)
      setCategories(txRes.data.data.categories)
      setCategoryGroups(txRes.data.data.categoryGroups ?? {})

      const fiadosData = fiadosRes.data.data
      setFiados(fiadosData.fiados ?? [])
      setTotalFiadoPainel(fiadosData.totalPendente ?? 0)

      const dueData = dueRes.data.data
      setDueExpenses(dueData.expenses ?? [])
      setTotalDue(dueData.totalDue ?? 0)
    } catch {
      toast.error('Erro ao carregar dados financeiros')
    } finally {
      setLoading(false)
    }
  }, [monthStr, typeFilter, pendingFilter, page, dateFrom, dateTo])

  useEffect(() => { fetchAll() }, [fetchAll])
  useAutoRefresh(fetchAll)

  const exportCSV = async () => {
    try {
      let csvParams = `limit=1000`
      if (dateFrom || dateTo) {
        if (dateFrom) csvParams += `&dateFrom=${dateFrom}`
        if (dateTo) csvParams += `&dateTo=${dateTo}`
      } else {
        csvParams += `&month=${monthStr}`
      }
      const res = await api.get(`/s/finance?${csvParams}`)
      const rows = res.data.data.transactions
      if (!rows.length) return toast.error('Nenhum lançamento para exportar')
      const header = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Fornecedor', 'Valor', 'Status']
      const lines = rows.map(r => [
        fmtDate(r.date),
        r.type === 'receita' ? 'Receita' : 'Despesa',
        r.category,
        `"${(r.description || '').replace(/"/g, '""')}"`,
        `"${(r.supplier || '').replace(/"/g, '""')}"`,
        (r.amount ?? 0).toFixed(2).replace('.', ','),
        r.isPaid ? 'Pago' : 'Pendente',
      ].join(';'))
      const csv = '\uFEFF' + [header.join(';'), ...lines].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `financeiro-${monthStr}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Erro ao exportar')
    }
  }

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1)
    setPage(1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1)
    setPage(1)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este lançamento?')) return
    try {
      await api.delete(`/s/finance/${id}`)
      toast.success('Lançamento excluído')
      fetchAll()
    } catch {
      toast.error('Erro ao excluir')
    }
  }

  const handleReceive = async (id) => {
    try {
      await api.post(`/s/payments/${id}/receive`)
      toast.success('Pagamento recebido!')
      fetchAll()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erro ao receber pagamento')
    }
  }

  const handlePay = async (id) => {
    try {
      await api.post(`/s/finance/${id}/pay`)
      toast.success('Despesa marcada como paga!')
      fetchAll()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erro ao marcar como paga')
    }
  }

  const applyQuickPeriod = (p) => {
    setQuickPeriod(p)
    setPage(1)
    if (p === 'mes') { setDateFrom(''); setDateTo('') }
    else if (p === 'hoje') {
      const t = new Date().toISOString().split('T')[0]
      setDateFrom(t); setDateTo(t)
    } else if (p === 'semana') {
      const now = new Date()
      const diff = now.getDay() === 0 ? 6 : now.getDay() - 1
      const mon = new Date(now); mon.setDate(now.getDate() - diff)
      setDateFrom(mon.toISOString().split('T')[0])
      setDateTo(now.toISOString().split('T')[0])
    } else if (p === 'ano') {
      const y = new Date().getFullYear()
      setDateFrom(`${y}-01-01`); setDateTo(`${y}-12-31`)
    }
  }

  const saldo = summary?.saldo ?? 0
  const aReceber = (summary?.totalFiadoPendente ?? 0) + totalFiadoPainel

  // Processa monthly para gráfico de evolução (últimos 6 meses)
  const monthlyChart = (() => {
    if (!summary?.monthly?.length) return []
    const map = new Map()
    summary.monthly.forEach(item => {
      const key = `${item._id.year}-${item._id.month}`
      if (!map.has(key)) map.set(key, { year: item._id.year, month: item._id.month, receita: 0, despesa: 0 })
      const entry = map.get(key)
      if (item._id.type === 'receita') entry.receita += item.total
      if (item._id.type === 'despesa') entry.despesa += item.total
    })
    return Array.from(map.values()).sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
  })()

  return (
    <div>
      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--c-tx0)' }}>Financeiro</h1>
          <p className="text-base mt-1" style={{ color: 'var(--c-tx2)' }}>Receitas e despesas do negócio</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
            style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
            <button onClick={prevMonth} className="p-1 rounded-lg" style={{ color: 'var(--c-tx2)' }}>
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold capitalize min-w-36 text-center" style={{ color: 'var(--c-tx0)' }}>
              {monthLabel(year, month)}
            </span>
            <button onClick={nextMonth} className="p-1 rounded-lg" style={{ color: 'var(--c-tx2)' }}>
              <ChevronRight size={18} />
            </button>
          </div>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium"
            style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)', color: 'var(--c-tx2)' }}
            title="Exportar CSV do mês">
            <Download size={16} /> CSV
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-base font-semibold"
            style={{ background: 'linear-gradient(135deg,#f97316,#ea6c10)', color: 'white' }}>
            <Plus size={18} /> Lançamento
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <KpiCard
          title="Faturamento"
          value={fmt(summary?.totalFaturado)}
          icon={TrendingUp}
          color="#22c55e"
          subtitle="Receitas de orçamentos"
        />
        <KpiCard
          title="Outras Receitas"
          value={fmt((summary?.totalReceitas ?? 0) - (summary?.totalFaturado ?? 0))}
          icon={ArrowUpCircle}
          color="#60a5fa"
          subtitle="Serviços e vendas avulsas"
        />
        <KpiCard
          title="Total Gasto"
          value={fmt(summary?.totalDespesas)}
          icon={TrendingDown}
          color="#ef4444"
          subtitle="Despesas pagas no mês"
        />
        <KpiCard
          title="Saldo do Mês"
          value={fmt(saldo)}
          icon={Wallet}
          color={saldo >= 0 ? '#f97316' : '#ef4444'}
          subtitle="Receitas − Despesas"
        />
        <KpiCard
          title="Margem de Lucro"
          value={`${(summary?.margemLucro ?? 0).toFixed(1)}%`}
          icon={Percent}
          color="#eab308"
          subtitle="Lucro líquido sobre receita"
        />
        <KpiCard
          title="A Receber"
          value={fmt(aReceber)}
          icon={Clock}
          color="#f97316"
          subtitle="Fiados + em aberto"
        />
      </div>

      {/* ── Evolução Mensal ── */}
      {monthlyChart.length > 0 && (
        <div className="rounded-2xl p-6 mb-8" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
          <h3 className="text-base font-bold mb-5" style={{ color: 'var(--c-tx0)' }}>Evolução Mensal</h3>

          {/* Tabela desktop */}
          <table className="hidden md:table w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--c-bd0)' }}>
                <th className="text-left pb-3 font-medium" style={{ color: 'var(--c-tx3)' }}>Mês</th>
                <th className="text-right pb-3 font-medium" style={{ color: 'var(--c-tx3)' }}>Receita</th>
                <th className="text-right pb-3 font-medium" style={{ color: 'var(--c-tx3)' }}>Despesa</th>
                <th className="text-right pb-3 font-medium" style={{ color: 'var(--c-tx3)' }}>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {monthlyChart.map(row => {
                const s = row.receita - row.despesa
                return (
                  <tr key={`${row.year}-${row.month}`} style={{ borderBottom: '1px solid #1f1f24' }}>
                    <td className="py-3 capitalize" style={{ color: 'var(--c-tx1)' }}>
                      {MONTH_NAMES[row.month - 1]}/{row.year}
                    </td>
                    <td className="py-3 text-right font-semibold" style={{ color: '#22c55e' }}>{fmt(row.receita)}</td>
                    <td className="py-3 text-right font-semibold" style={{ color: '#ef4444' }}>{fmt(row.despesa)}</td>
                    <td className="py-3 text-right font-bold" style={{ color: s >= 0 ? '#f97316' : '#ef4444' }}>{fmt(s)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Cards mobile */}
          <div className="md:hidden space-y-3">
            {monthlyChart.map(row => {
              const s = row.receita - row.despesa
              return (
                <div key={`${row.year}-${row.month}`} className="rounded-xl p-4"
                  style={{ background: 'var(--c-bg2)' }}>
                  <p className="text-sm font-semibold mb-2" style={{ color: 'var(--c-tx0)' }}>
                    {MONTH_NAMES[row.month - 1]}/{row.year}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p style={{ color: 'var(--c-tx3)' }}>Receita</p>
                      <p className="font-semibold" style={{ color: '#22c55e' }}>{fmt(row.receita)}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--c-tx3)' }}>Despesa</p>
                      <p className="font-semibold" style={{ color: '#ef4444' }}>{fmt(row.despesa)}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--c-tx3)' }}>Saldo</p>
                      <p className="font-bold" style={{ color: s >= 0 ? '#f97316' : '#ef4444' }}>{fmt(s)}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Painéis A Receber / A Pagar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        <PainelAReceber fiados={fiados} totalPendente={totalFiadoPainel} onReceive={handleReceive} />
        <PainelAPagar expenses={dueExpenses} totalDue={totalDue} onPay={handlePay} />
      </div>

      {/* ── Barras por categoria ── */}
      {summary && (summary.byCategory.receita.length > 0 || summary.byCategory.despesa.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
          {summary.byCategory.receita.length > 0 && (
            <div className="rounded-2xl p-6" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
              <h3 className="text-base font-bold mb-4" style={{ color: 'var(--c-tx0)' }}>Receitas por Categoria</h3>
              <div className="space-y-3">
                {summary.byCategory.receita.map(({ category, total }) => (
                  <div key={category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span style={{ color: 'var(--c-tx1)' }}>{category}</span>
                      <span className="font-semibold" style={{ color: '#22c55e' }}>{fmt(total)}</span>
                    </div>
                    <div className="h-2 rounded-full" style={{ background: 'var(--c-bg2)' }}>
                      <div className="h-2 rounded-full" style={{
                        width: `${Math.min(100, (total / summary.totalReceitas) * 100)}%`,
                        background: '#22c55e',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {summary.byCategory.despesa.length > 0 && (
            <div className="rounded-2xl p-6" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
              <h3 className="text-base font-bold mb-4" style={{ color: 'var(--c-tx0)' }}>Despesas por Categoria</h3>
              <div className="space-y-3">
                {summary.byCategory.despesa.map(({ category, total }) => (
                  <div key={category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span style={{ color: 'var(--c-tx1)' }}>{category}</span>
                      <span className="font-semibold" style={{ color: '#ef4444' }}>{fmt(total)}</span>
                    </div>
                    <div className="h-2 rounded-full" style={{ background: 'var(--c-bg2)' }}>
                      <div className="h-2 rounded-full" style={{
                        width: `${Math.min(100, (total / summary.totalDespesas) * 100)}%`,
                        background: '#ef4444',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Lista de lançamentos ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
        {/* Filtros */}
        <div className="flex items-center gap-3 p-5 flex-wrap" style={{ borderBottom: '1px solid var(--c-bd0)' }}>
          <h3 className="text-base font-bold flex-1" style={{ color: 'var(--c-tx0)' }}>Lançamentos</h3>
          {[
            { key: '', label: 'Todos' },
            { key: 'receita', label: 'Receitas' },
            { key: 'despesa', label: 'Despesas' },
          ].map(({ key, label }) => (
            <button key={key}
              onClick={() => { setTypeFilter(key); setPendingFilter(false); setPage(1) }}
              className="px-4 py-2 rounded-xl text-sm font-medium"
              style={{
                background: typeFilter === key && !pendingFilter ? 'rgba(249,115,22,0.15)' : 'var(--c-bg2)',
                color: typeFilter === key && !pendingFilter ? '#f97316' : 'var(--c-tx2)',
              }}>
              {label}
            </button>
          ))}
          <button
            onClick={() => { setPendingFilter(v => !v); setTypeFilter(''); setPage(1) }}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{
              background: pendingFilter ? 'rgba(234,179,8,0.15)' : 'var(--c-bg2)',
              color: pendingFilter ? '#eab308' : 'var(--c-tx2)',
            }}>
            Pendentes
          </button>
          {/* Filtro por período */}
          <div className="flex items-center gap-2 flex-wrap w-full pt-1" style={{ borderTop: '1px solid var(--c-bd0)' }}>
            <span className="text-xs font-medium" style={{ color: 'var(--c-tx3)' }}>Período:</span>
            {[
              { key: 'hoje', label: 'Hoje' },
              { key: 'semana', label: 'Semana' },
              { key: 'mes', label: 'Mês' },
              { key: 'ano', label: 'Ano' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => applyQuickPeriod(key)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium"
                style={{
                  background: quickPeriod === key ? 'rgba(249,115,22,0.15)' : 'var(--c-bg2)',
                  color: quickPeriod === key ? '#f97316' : 'var(--c-tx2)',
                }}>
                {label}
              </button>
            ))}
            <span className="text-xs" style={{ color: 'var(--c-tx3)' }}>ou</span>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setQuickPeriod(''); setPage(1) }}
              className="py-1.5 px-3 rounded-xl text-xs outline-none"
              style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-bd1)', color: dateFrom ? 'var(--c-tx0)' : 'var(--c-tx3)' }} />
            <span className="text-xs" style={{ color: 'var(--c-tx3)' }}>até</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setQuickPeriod(''); setPage(1) }}
              className="py-1.5 px-3 rounded-xl text-xs outline-none"
              style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-bd1)', color: dateTo ? 'var(--c-tx0)' : 'var(--c-tx3)' }} />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); setQuickPeriod('mes'); setPage(1) }}
                className="text-xs px-3 py-1.5 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                Limpar
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 rounded-full animate-spin"
              style={{ borderColor: 'var(--c-bd1)', borderTopColor: '#f97316' }} />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16">
            <Wallet size={40} className="mx-auto mb-3" style={{ color: 'var(--c-bd0)' }} />
            <p className="text-base" style={{ color: 'var(--c-tx2)' }}>Nenhum lançamento encontrado</p>
          </div>
        ) : (
          <div>
            {transactions.map(tx => (
              <div key={tx._id} className="flex items-center gap-4 px-5 py-4"
                style={{ borderBottom: '1px solid var(--c-bd0)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--c-bg2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: tx.type === 'receita' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                  }}>
                  {tx.type === 'receita'
                    ? <ArrowUpCircle size={20} style={{ color: '#22c55e' }} />
                    : <ArrowDownCircle size={20} style={{ color: '#ef4444' }} />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold truncate" style={{ color: 'var(--c-tx0)' }}>
                    {tx.description}
                  </p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--c-tx3)' }}>
                    {tx.category} · {fmtDate(tx.date)}
                    {tx.budget && <span style={{ color: '#f97316' }}> · ORC-{String(tx.budget.number).padStart(3, '0')}</span>}
                    {tx.supplier && <span style={{ color: 'var(--c-tx3)' }}> · {tx.supplier}</span>}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {tx.recorrente && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>
                        ● Recorrente
                      </span>
                    )}
                    {tx.recorrenciaId && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--c-bg2)', color: 'var(--c-tx2)' }}>
                        ↺ Automático
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {!tx.isPaid && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308' }}>
                      Pendente
                    </span>
                  )}
                  <p className="text-lg font-bold"
                    style={{ color: tx.type === 'receita' ? '#22c55e' : '#ef4444' }}>
                    {tx.type === 'receita' ? '+' : '-'} {fmt(tx.amount)}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {!tx.isPaid && tx.type === 'despesa' && (
                    <button onClick={() => handlePay(tx._id)} className="p-2 rounded-lg"
                      style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}
                      title="Marcar como pago">
                      <CheckCircle2 size={15} />
                    </button>
                  )}
                  <button onClick={() => setEditTx(tx)} className="p-2 rounded-lg"
                    style={{ background: 'var(--c-bg2)', color: 'var(--c-tx2)' }}>
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => handleDelete(tx._id)} className="p-2 rounded-lg"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 p-4">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-2 rounded-xl"
                  style={{ background: 'var(--c-bg2)', color: page === 1 ? 'var(--c-bd1)' : 'var(--c-tx0)' }}>
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm" style={{ color: 'var(--c-tx2)' }}>
                  Página {page} de {totalPages}
                </span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-2 rounded-xl"
                  style={{ background: 'var(--c-bg2)', color: page === totalPages ? 'var(--c-bd1)' : 'var(--c-tx0)' }}>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <TransactionModal categories={categories} categoryGroups={categoryGroups} onClose={() => setShowModal(false)} onSaved={fetchAll} />
      )}
      {editTx && (
        <TransactionModal tx={editTx} categories={categories} categoryGroups={categoryGroups} onClose={() => setEditTx(null)} onSaved={fetchAll} />
      )}
    </div>
  )
}

export default FinanceiroPage
