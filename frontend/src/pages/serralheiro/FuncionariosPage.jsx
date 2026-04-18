import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Plus, Search, Users, Pencil, Trash2, X, Wallet, Receipt,
  ChevronLeft, ChevronRight, CheckCircle2, Printer, AlertCircle, Download,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'
const monthLabel = (str) => {
  const [y, m] = str.split('-')
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}
const todayStr = () => new Date().toISOString().split('T')[0]
const currentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const inp = (err) => ({
  background: 'var(--c-bg2)', border: `1px solid ${err ? '#ef4444' : 'var(--c-bd1)'}`,
  color: 'var(--c-tx0)', borderRadius: 10, padding: '10px 14px', fontSize: 14,
  width: '100%', outline: 'none',
})
const Field = ({ label, error, children }) => (
  <div>
    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--c-tx1)' }}>{label}</label>
    {children}
    {error && <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>{error}</p>}
  </div>
)

// ─── Impressão do vale ─────────────────────────────────────────────────────────
const printVale = (vale, employee, company) => {
  const w = window.open('', '_blank', 'width=700,height=520')
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Vale — ${employee.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; background: #fff; padding: 0; }
  .page { width: 680px; margin: 0 auto; padding: 28px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14px; border-bottom: 2px solid #222; margin-bottom: 18px; }
  .company-name { font-size: 18px; font-weight: 700; }
  .company-info { font-size: 11px; color: #555; margin-top: 3px; line-height: 1.5; }
  .title { text-align: center; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 18px; }
  .badge { text-align:center; display:inline-block; margin: 0 auto 18px; background:#f97316; color:#fff; padding: 4px 18px; border-radius: 20px; font-size: 13px; font-weight:600; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px; }
  .info-box { background: #f5f5f5; border-radius: 6px; padding: 10px 14px; }
  .info-label { font-size: 10px; text-transform: uppercase; color: #888; margin-bottom: 3px; letter-spacing: 0.5px; }
  .info-value { font-size: 14px; font-weight: 600; }
  .amount-box { grid-column: span 2; background: #fff8f0; border: 2px solid #f97316; border-radius: 8px; padding: 12px 16px; text-align: center; }
  .amount-value { font-size: 28px; font-weight: 700; color: #f97316; }
  .reason-box { background: #f5f5f5; border-radius: 6px; padding: 10px 14px; margin-bottom: 20px; }
  .sig-row { display: flex; gap: 24px; margin-top: 28px; }
  .sig-block { flex: 1; text-align: center; }
  .sig-line { border-top: 1px solid #333; padding-top: 6px; font-size: 11px; color: #555; margin-top: 36px; }
  .footer { text-align: center; font-size: 10px; color: #aaa; margin-top: 24px; border-top: 1px solid #eee; padding-top: 10px; }
  @media print { @page { margin: 0; } body { padding: 10px; } }
</style></head><body>
<div class="page">
  <div class="header">
    <div>
      <div class="company-name">${company?.name ?? 'Empresa'}</div>
      <div class="company-info">
        ${company?.cnpj ? `CNPJ: ${company.cnpj}` : ''}
        ${company?.phone ? ` &nbsp;|&nbsp; Tel: ${company.phone}` : ''}
        ${company?.address?.city ? ` &nbsp;|&nbsp; ${company.address.city}${company.address.state ? '/' + company.address.state : ''}` : ''}
      </div>
    </div>
    <div style="text-align:right;font-size:11px;color:#888">
      Emitido em: ${fmtDate(new Date())}
    </div>
  </div>

  <div class="title">Comprovante de Vale</div>

  <div class="info-grid">
    <div class="info-box">
      <div class="info-label">Funcionário</div>
      <div class="info-value">${employee.name}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Cargo</div>
      <div class="info-value">${employee.cargo || '—'}</div>
    </div>
    <div class="amount-box">
      <div class="info-label" style="color:#c05000">Valor do Vale</div>
      <div class="amount-value">${fmt(vale.amount)}</div>
    </div>
  </div>

  <div class="reason-box">
    <div class="info-label">Motivo</div>
    <div style="font-size:13px;margin-top:3px">${vale.reason || 'Não informado'}</div>
  </div>

  ${vale.notes ? `<div class="reason-box" style="margin-bottom:20px"><div class="info-label">Observações</div><div style="font-size:13px;margin-top:3px">${vale.notes}</div></div>` : ''}

  <div style="font-size:11px;color:#555;margin-bottom:4px">
    Data do Vale: <strong>${fmtDate(vale.date)}</strong>
    &nbsp;&nbsp;|&nbsp;&nbsp;
    Este vale será descontado no próximo pagamento.
  </div>

  <div class="sig-row">
    <div class="sig-block">
      <div class="sig-line">${company?.name ?? 'Empresa'}<br><span style="font-size:10px">Responsável</span></div>
    </div>
    <div class="sig-block">
      <div class="sig-line">${employee.name}<br><span style="font-size:10px">Funcionário — Assinatura</span></div>
    </div>
  </div>

  <div class="footer">4u Serralheiro · Este documento comprova o recebimento do vale acima descrito.</div>
</div>
</body></html>`
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => { w.print(); w.close() }, 300)
}

// ─── Impressão do resumo de pagamento ────────────────────────────────────────
const printPayroll = (payroll) => {
  const { employee, company, monthStr, vales, salary, totalVales, extraDeductions: extras = [], payDate: pd } = payroll
  const totalExtras = extras.reduce((s, d) => s + (Number(d.amount) || 0), 0)
  const netPay = Math.max(0, salary - totalVales - totalExtras)
  const w = window.open('', '_blank', 'width=700,height=640')
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Pagamento — ${employee.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; background: #fff; }
  .page { width: 680px; margin: 0 auto; padding: 28px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14px; border-bottom: 2px solid #222; margin-bottom: 18px; }
  .company-name { font-size: 18px; font-weight: 700; }
  .company-info { font-size: 11px; color: #555; margin-top: 3px; line-height: 1.5; }
  .title { text-align: center; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .subtitle { text-align: center; font-size: 12px; color: #888; margin-bottom: 20px; text-transform: capitalize; }
  .emp-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 18px; }
  .info-box { background: #f5f5f5; border-radius: 6px; padding: 10px 14px; }
  .info-label { font-size: 10px; text-transform: uppercase; color: #888; margin-bottom: 3px; }
  .info-value { font-size: 13px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  thead th { background: #f0f0f0; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: #666; }
  tbody td { padding: 7px 10px; font-size: 12px; border-bottom: 1px solid #eee; }
  .totals { background: #f9f9f9; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; }
  .tot-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
  .tot-row.net { font-size: 16px; font-weight: 700; border-top: 2px solid #ccc; padding-top: 10px; margin-top: 6px; color: #1a7a2a; }
  .tot-row.deduct { color: #c00; }
  .sig-row { display: flex; gap: 24px; margin-top: 32px; }
  .sig-block { flex: 1; text-align: center; }
  .sig-line { border-top: 1px solid #333; padding-top: 6px; font-size: 11px; color: #555; margin-top: 40px; }
  .footer { text-align: center; font-size: 10px; color: #aaa; margin-top: 24px; border-top: 1px solid #eee; padding-top: 10px; }
  @media print { @page { margin: 0; } body { padding: 10px; } }
</style></head><body>
<div class="page">
  <div class="header">
    <div>
      <div class="company-name">${company?.name ?? 'Empresa'}</div>
      <div class="company-info">
        ${company?.cnpj ? `CNPJ: ${company.cnpj}` : ''}
        ${company?.phone ? ` &nbsp;|&nbsp; Tel: ${company.phone}` : ''}
        ${company?.address?.city ? ` &nbsp;|&nbsp; ${company.address.city}${company.address.state ? '/' + company.address.state : ''}` : ''}
      </div>
    </div>
    <div style="text-align:right;font-size:11px;color:#888">
      Emitido em: ${fmtDate(new Date())}
    </div>
  </div>

  <div class="title">Resumo de Pagamento</div>
  <div class="subtitle">Competência: ${monthLabel(monthStr)}</div>

  <div class="emp-row">
    <div class="info-box">
      <div class="info-label">Funcionário</div>
      <div class="info-value">${employee.name}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Cargo</div>
      <div class="info-value">${employee.cargo || '—'}</div>
    </div>
    <div class="info-box">
      <div class="info-label">CPF</div>
      <div class="info-value">${employee.cpf || '—'}</div>
    </div>
  </div>

  ${vales.length > 0 ? `
  <p style="font-size:11px;font-weight:700;text-transform:uppercase;color:#666;margin-bottom:8px">Vales Descontados</p>
  <table>
    <thead><tr><th>Data</th><th>Motivo</th><th style="text-align:right">Valor</th></tr></thead>
    <tbody>
      ${vales.map(v => `<tr>
        <td>${fmtDate(v.date)}</td>
        <td>${v.reason || '—'}</td>
        <td style="text-align:right;color:#c00">${fmt(v.amount)}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : `<p style="font-size:12px;color:#888;margin-bottom:16px">Nenhum vale neste mês.</p>`}

  <div class="totals">
    <div class="tot-row"><span>Salário Base</span><span>${fmt(salary)}</span></div>
    <div class="tot-row deduct"><span>Total de Vales (${vales.length})</span><span>− ${fmt(totalVales)}</span></div>
    ${extras.length > 0 ? extras.map(d => `<div class="tot-row deduct"><span>${d.label || 'Desconto'}</span><span>− ${fmt(Number(d.amount) || 0)}</span></div>`).join('') : ''}
    ${pd ? `<div class="tot-row" style="font-size:11px;color:#888;border-top:1px dashed #ddd;padding-top:6px;margin-top:4px"><span>Data do Pagamento</span><span>${fmtDate(new Date(pd + 'T12:00:00'))}</span></div>` : ''}
    <div class="tot-row net"><span>Valor Líquido a Pagar</span><span>${fmt(netPay)}</span></div>
  </div>

  <div class="sig-row">
    <div class="sig-block">
      <div class="sig-line">${company?.name ?? 'Empresa'}<br><span style="font-size:10px">Responsável</span></div>
    </div>
    <div class="sig-block">
      <div class="sig-line">${employee.name}<br><span style="font-size:10px">Funcionário — Ciente do pagamento</span></div>
    </div>
  </div>

  <div class="footer">4u Serralheiro · Documento de controle interno de pagamento.</div>
</div>
</body></html>`
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => { w.print(); w.close() }, 300)
}

// ─── Modal: Cadastro / Edição de Funcionário ──────────────────────────────────
const EmployeeModal = ({ employee, onClose, onSaved }) => {
  const isEdit = !!employee
  const [form, setForm] = useState({
    name: employee?.name ?? '',
    cpf: employee?.cpf ?? '',
    phone: employee?.phone ?? '',
    cargo: employee?.cargo ?? '',
    salary: employee?.salary ?? '',
    admissionDate: employee?.admissionDate ? new Date(employee.admissionDate).toISOString().split('T')[0] : '',
    notes: employee?.notes ?? '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const handleSave = async () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Nome obrigatório'
    if (Object.keys(errs).length) return setErrors(errs)
    setErrors({})
    setSaving(true)
    try {
      if (isEdit) {
        await api.put(`/s/employees/${employee._id}`, form)
        toast.success('Funcionário atualizado!')
      } else {
        await api.post('/s/employees', form)
        toast.success('Funcionário cadastrado!')
      }
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-lg rounded-2xl my-4" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--c-bd0)' }}>
          <h2 className="text-base font-bold" style={{ color: 'var(--c-tx0)' }}>
            {isEdit ? 'Editar Funcionário' : 'Novo Funcionário'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ color: 'var(--c-tx3)', background: 'var(--c-bg2)' }}>
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Nome *" error={errors.name}>
                <input value={form.name} onChange={e => set('name', e.target.value)} style={inp(errors.name)} placeholder="Nome completo" />
              </Field>
            </div>
            <Field label="CPF">
              <input value={form.cpf} onChange={e => set('cpf', e.target.value)} style={inp()} placeholder="000.000.000-00" />
            </Field>
            <Field label="Telefone">
              <input value={form.phone} onChange={e => set('phone', e.target.value)} style={inp()} placeholder="(11) 99999-9999" />
            </Field>
            <Field label="Cargo / Função">
              <input value={form.cargo} onChange={e => set('cargo', e.target.value)} style={inp()} placeholder="Ex: Serralheiro, Auxiliar..." />
            </Field>
            <Field label="Salário Base (R$)">
              <input value={form.salary} onChange={e => set('salary', e.target.value)} type="number" step="0.01" min="0" style={inp()} placeholder="0,00" />
            </Field>
            <Field label="Data de Admissão">
              <input value={form.admissionDate} onChange={e => set('admissionDate', e.target.value)} type="date" style={inp()} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Observações">
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                  style={{ ...inp(), resize: 'none' }} placeholder="Informações adicionais..." />
              </Field>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm"
              style={{ background: 'var(--c-bd0)', color: 'var(--c-tx1)' }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg,#f97316,#ea6c10)', color: 'white', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Modal: Emitir Vale ────────────────────────────────────────────────────────
const ValeModal = ({ employee, company, onClose, onSaved }) => {
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [date, setDate] = useState(todayStr())
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const errs = {}
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) errs.amount = 'Valor inválido'
    if (!reason.trim()) errs.reason = 'Motivo obrigatório'
    if (Object.keys(errs).length) return setErrors(errs)
    setErrors({})
    setSaving(true)
    try {
      const res = await api.post(`/s/employees/${employee._id}/vales`, { amount, reason, date, notes })
      const vale = res.data.data.vale
      try {
        await api.post('/s/finance', {
          type: 'despesa',
          category: 'Salários',
          description: `Vale — ${employee.name}: ${reason}`,
          amount: Number(amount),
          isPaid: true,
          date,
          supplier: employee.name,
        })
      } catch {
        toast('Vale emitido, mas não foi possível registrar no financeiro. Verifique manualmente.', { icon: '⚠️', duration: 5000 })
      }
      toast.success('Vale emitido!')
      onSaved()
      // Imprime imediatamente
      printVale({ ...vale, date: new Date(vale.date) }, employee, company)
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erro ao emitir vale')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div className="w-full max-w-md rounded-2xl" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--c-bd0)' }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--c-tx0)' }}>Emitir Vale</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--c-tx3)' }}>{employee.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ color: 'var(--c-tx3)', background: 'var(--c-bg2)' }}>
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Valor (R$) *" error={errors.amount}>
              <input value={amount} onChange={e => { setAmount(e.target.value); setErrors(p => ({ ...p, amount: '' })) }}
                type="number" step="0.01" min="0.01" style={inp(errors.amount)} placeholder="0,00" />
            </Field>
            <Field label="Data">
              <input value={date} onChange={e => setDate(e.target.value)} type="date" style={inp()} />
            </Field>
          </div>
          <Field label="Motivo *" error={errors.reason}>
            <input value={reason} onChange={e => { setReason(e.target.value); setErrors(p => ({ ...p, reason: '' })) }}
              style={inp(errors.reason)} placeholder="Ex: Adiantamento, Emergência, Material..." />
          </Field>
          <Field label="Observações">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              style={{ ...inp(), resize: 'none' }} placeholder="Informações adicionais (opcional)..." />
          </Field>
          <div className="rounded-xl p-3 text-xs" style={{ background: 'var(--c-bg2)', color: 'var(--c-tx2)' }}>
            Ao confirmar, o comprovante será aberto para impressão e assinatura do funcionário.
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm"
              style={{ background: 'var(--c-bd0)', color: 'var(--c-tx1)' }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg,#f97316,#ea6c10)', color: 'white', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Emitindo...' : 'Emitir e Imprimir'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Painel do funcionário (detalhe) ──────────────────────────────────────────
const EmployeePanel = ({ employee: initialEmployee, company, onClose, onUpdate }) => {
  const { user } = useAuth()
  const isOwner = user?.role === 'owner'
  const [tab, setTab] = useState('vales')
  const [employee, setEmployee] = useState(initialEmployee)
  const [month, setMonth] = useState(currentMonth())
  const [vales, setVales] = useState([])
  const [totalVales, setTotalVales] = useState(0)
  const [payroll, setPayroll] = useState(null)
  const [loadingVales, setLoadingVales] = useState(false)
  const [loadingPayroll, setLoadingPayroll] = useState(false)
  const [showValeModal, setShowValeModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [payDate, setPayDate] = useState(todayStr())
  const [extraDeductions, setExtraDeductions] = useState([])
  const [confirmingPayment, setConfirmingPayment] = useState(false)
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)

  const prevMonth = () => {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const nextMonth = () => {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const totalExtraDeductions = extraDeductions.reduce((s, d) => s + (Number(d.amount) || 0), 0)

  const addDeduction = () => setExtraDeductions(prev => [...prev, { id: Date.now(), label: '', amount: '' }])
  const removeDeduction = (id) => setExtraDeductions(prev => prev.filter(d => d.id !== id))
  const updateDeduction = (id, field, value) => setExtraDeductions(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d))

  // Persiste descontos no localStorage por funcionário/mês (ref evita race condition)
  const dedKeyRef = useRef(`ded-${employee._id}-${month}`)
  useEffect(() => {
    dedKeyRef.current = `ded-${employee._id}-${month}`
    try { const s = localStorage.getItem(dedKeyRef.current); setExtraDeductions(s ? JSON.parse(s) : []) } catch { setExtraDeductions([]) }
  }, [employee._id, month])
  useEffect(() => {
    try { localStorage.setItem(dedKeyRef.current, JSON.stringify(extraDeductions)) } catch {}
  }, [extraDeductions])

  // Reseta confirmação ao trocar de mês
  useEffect(() => { setPaymentConfirmed(false) }, [month])

  const handleConfirmPayment = async () => {
    if (!payroll) return
    const finalNet = Math.max(0, payroll.salary - payroll.totalVales - totalExtraDeductions)
    if (finalNet <= 0) {
      toast.error('Valor líquido a pagar é zero. Verifique os descontos.')
      return
    }
    setConfirmingPayment(true)
    try {
      await api.post('/s/finance', {
        type: 'despesa',
        category: 'Salários',
        description: `Pagamento ${employee.name} — ${monthLabel(month)}`,
        amount: finalNet,
        isPaid: true,
        date: payDate,
        supplier: employee.name,
      })
      toast.success('Pagamento registrado no financeiro!')
      setPaymentConfirmed(true)
      fetchPayroll()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erro ao registrar pagamento')
    } finally {
      setConfirmingPayment(false)
    }
  }

  const fetchVales = useCallback(async () => {
    setLoadingVales(true)
    try {
      const res = await api.get(`/s/employees/${employee._id}/vales?month=${month}`)
      setVales(res.data.data.vales)
      setTotalVales(res.data.data.totalVales)
    } catch { toast.error('Erro ao carregar vales') }
    finally { setLoadingVales(false) }
  }, [employee._id, month])

  const fetchPayroll = useCallback(async () => {
    setLoadingPayroll(true)
    try {
      const res = await api.get(`/s/employees/${employee._id}/payroll?month=${month}`)
      setPayroll(res.data.data)
    } catch { toast.error('Erro ao carregar resumo de pagamento') }
    finally { setLoadingPayroll(false) }
  }, [employee._id, month])

  useEffect(() => {
    fetchVales()
    if (tab === 'pagamento') fetchPayroll()
  }, [tab, fetchVales, fetchPayroll])

  const handleDeleteVale = async (id) => {
    if (!confirm('Excluir este vale?')) return
    try {
      await api.delete(`/s/vales/${id}`)
      toast.success('Vale excluído')
      fetchVales()
      if (tab === 'pagamento') fetchPayroll()
    } catch { toast.error('Erro ao excluir vale') }
  }

  const handleSignVale = async (id) => {
    try {
      await api.put(`/s/vales/${id}/sign`)
      toast.success('Vale marcado como assinado!')
      fetchVales()
    } catch { toast.error('Erro ao assinar vale') }
  }

  const handleValeAdded = () => {
    fetchVales()
    if (tab === 'pagamento') fetchPayroll()
    onUpdate()
  }

  const handleEmployeeUpdated = async () => {
    const pr = await api.get(`/s/employees/${employee._id}/payroll?month=${month}`)
    setEmployee(pr.data.data.employee)
    onUpdate()
  }

  const exportValesCSV = () => {
    if (!vales.length) return toast.error('Nenhum vale para exportar')
    const header = ['Data', 'Valor', 'Motivo', 'Observações', 'Assinado']
    const lines = vales.map(v => [
      fmtDate(v.date),
      (v.amount ?? 0).toFixed(2).replace('.', ','),
      `"${(v.reason || '').replace(/"/g, '""')}"`,
      `"${(v.notes || '').replace(/"/g, '""')}"`,
      v.signed ? 'Sim' : 'Não',
    ].join(';'))
    const csv = '\uFEFF' + [header.join(';'), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vales-${employee.name.replace(/\s+/g, '-')}-${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-start justify-end"
        style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />

      <div className="fixed top-0 right-0 h-full z-50 flex flex-col"
        style={{ width: 'min(520px, 100vw)', background: 'var(--c-bg1)', borderLeft: '1px solid var(--c-bd0)', overflowY: 'auto' }}>

        {/* Cabeçalho */}
        <div className="p-5 flex-shrink-0" style={{ borderBottom: '1px solid var(--c-bd0)' }}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0"
                style={{ background: 'rgba(249,115,22,0.2)', color: '#f97316' }}>
                {employee.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-base font-bold" style={{ color: 'var(--c-tx0)' }}>{employee.name}</p>
                <p className="text-sm" style={{ color: 'var(--c-tx2)' }}>{employee.cargo || 'Sem cargo definido'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOwner && (
                <button onClick={() => setShowEditModal(true)}
                  className="p-2 rounded-xl" style={{ background: 'var(--c-bg2)', color: 'var(--c-tx2)' }} title="Editar">
                  <Pencil size={15} />
                </button>
              )}
              <button onClick={onClose} className="p-2 rounded-xl" style={{ background: 'var(--c-bg2)', color: 'var(--c-tx3)' }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Info resumida */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl p-3 text-center" style={{ background: 'var(--c-bg2)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--c-tx3)' }}>Salário Base</p>
              <p className="text-sm font-bold" style={{ color: '#22c55e' }}>{fmt(employee.salary)}</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'var(--c-bg2)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--c-tx3)' }}>Vales (mês)</p>
              <p className="text-sm font-bold" style={{ color: '#f97316' }}>{fmt(totalVales)}</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'var(--c-bg2)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--c-tx3)' }}>Admissão</p>
              <p className="text-sm font-bold" style={{ color: 'var(--c-tx0)' }}>{fmtDate(employee.admissionDate)}</p>
            </div>
          </div>

          {/* Telefone / CPF */}
          {(employee.phone || employee.cpf) && (
            <div className="flex gap-3 mt-3 text-xs" style={{ color: 'var(--c-tx3)' }}>
              {employee.phone && <span>Tel: {employee.phone}</span>}
              {employee.cpf && <span>CPF: {employee.cpf}</span>}
            </div>
          )}
        </div>

        {/* Navegador de mês */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--c-bd0)', background: 'var(--c-bg0)' }}>
          <button onClick={prevMonth} className="p-1.5 rounded-lg" style={{ color: 'var(--c-tx2)', background: 'var(--c-bg1)' }}>
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold capitalize" style={{ color: 'var(--c-tx0)' }}>
            {monthLabel(month)}
          </span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg" style={{ color: 'var(--c-tx2)', background: 'var(--c-bg1)' }}>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Abas */}
        <div className="flex flex-shrink-0" style={{ borderBottom: '1px solid var(--c-bd0)' }}>
          {[{ id: 'vales', label: 'Vales', icon: Receipt }, { id: 'pagamento', label: 'Pagamento', icon: Wallet }].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all"
              style={{
                color: tab === id ? '#f97316' : 'var(--c-tx3)',
                borderBottom: `2px solid ${tab === id ? '#f97316' : 'transparent'}`,
              }}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* Conteúdo das abas */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── ABA: VALES ── */}
          {tab === 'vales' && (
            <div className="space-y-4">
              {isOwner && (
                <button onClick={() => setShowValeModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: 'linear-gradient(135deg,#f97316,#ea6c10)', color: 'white' }}>
                  <Plus size={15} /> Emitir Vale
                </button>
              )}

              {loadingVales ? (
                <div className="flex justify-center py-10">
                  <div className="w-7 h-7 border-4 rounded-full animate-spin"
                    style={{ borderColor: 'var(--c-bd1)', borderTopColor: '#f97316' }} />
                </div>
              ) : vales.length === 0 ? (
                <div className="text-center py-10">
                  <Receipt size={36} className="mx-auto mb-3" style={{ color: 'var(--c-bd0)' }} />
                  <p className="text-sm" style={{ color: 'var(--c-tx3)' }}>Nenhum vale neste mês</p>
                </div>
              ) : (
                <>
                  <div className="rounded-xl px-4 py-3 flex items-center justify-between"
                    style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
                    <span className="text-sm font-medium" style={{ color: '#f97316' }}>Total de vales</span>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold" style={{ color: '#f97316' }}>{fmt(totalVales)}</span>
                      <button onClick={exportValesCSV}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                        style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd1)', color: 'var(--c-tx2)' }}
                        title="Exportar CSV">
                        <Download size={12} /> CSV
                      </button>
                    </div>
                  </div>

                  {vales.map(v => (
                    <div key={v._id} className="rounded-xl p-4" style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-bd0)' }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-base font-bold" style={{ color: '#f97316' }}>{fmt(v.amount)}</p>
                            {v.signed
                              ? <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                  style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                                  ✓ Assinado
                                </span>
                              : <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                  style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308' }}>
                                  Pendente
                                </span>
                            }
                          </div>
                          <p className="text-sm mt-1" style={{ color: 'var(--c-tx1)' }}>{v.reason || '—'}</p>
                          <p className="text-xs mt-1" style={{ color: 'var(--c-tx3)' }}>{fmtDate(v.date)}</p>
                          {v.notes && <p className="text-xs mt-1 italic" style={{ color: 'var(--c-tx3)' }}>{v.notes}</p>}
                        </div>
                        {isOwner && (
                          <div className="flex gap-1.5 flex-shrink-0">
                            <button onClick={() => printVale(v, employee, company)}
                              className="p-2 rounded-lg" style={{ background: 'var(--c-bg1)', color: 'var(--c-tx2)' }} title="Reimprimir">
                              <Printer size={13} />
                            </button>
                            {!v.signed && (
                              <button onClick={() => handleSignVale(v._id)}
                                className="p-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }} title="Marcar como assinado">
                                <CheckCircle2 size={13} />
                              </button>
                            )}
                            <button onClick={() => handleDeleteVale(v._id)}
                              className="p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }} title="Excluir">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* ── ABA: PAGAMENTO ── */}
          {tab === 'pagamento' && (
            <div className="space-y-4">
              {loadingPayroll ? (
                <div className="flex justify-center py-10">
                  <div className="w-7 h-7 border-4 rounded-full animate-spin"
                    style={{ borderColor: 'var(--c-bd1)', borderTopColor: '#f97316' }} />
                </div>
              ) : payroll ? (
                <>
                  {/* KPIs */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl p-3 text-center" style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-bd0)' }}>
                      <p className="text-xs mb-1" style={{ color: 'var(--c-tx3)' }}>Salário Base</p>
                      <p className="text-sm font-bold" style={{ color: '#22c55e' }}>{fmt(payroll.salary)}</p>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-bd0)' }}>
                      <p className="text-xs mb-1" style={{ color: 'var(--c-tx3)' }}>Total Vales</p>
                      <p className="text-sm font-bold" style={{ color: '#ef4444' }}>− {fmt(payroll.totalVales)}</p>
                    </div>
                    <div className="rounded-xl p-3 text-center"
                      style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)' }}>
                      <p className="text-xs mb-1" style={{ color: 'var(--c-tx3)' }}>Líquido Base</p>
                      <p className="text-sm font-bold" style={{ color: '#22c55e' }}>{fmt(payroll.netPay)}</p>
                    </div>
                  </div>

                  {/* Alerta se vales >= salário */}
                  {payroll.totalVales >= payroll.salary && payroll.salary > 0 && (
                    <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
                      style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', color: '#eab308' }}>
                      <AlertCircle size={15} />
                      Os vales igualam ou superam o salário deste mês.
                    </div>
                  )}

                  {/* Descontos adicionais */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--c-tx3)' }}>
                        Descontos Adicionais
                      </p>
                      <button onClick={addDeduction}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium"
                        style={{ background: 'rgba(249,115,22,0.1)', color: '#f97316' }}>
                        <Plus size={11} /> Adicionar
                      </button>
                    </div>
                    {extraDeductions.length === 0 ? (
                      <p className="text-xs py-2" style={{ color: 'var(--c-tx3)' }}>
                        Nenhum desconto adicional (FGTS, INSS, IR, outros).
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {extraDeductions.map(d => (
                          <div key={d.id} className="flex items-center gap-2">
                            <input
                              value={d.label}
                              onChange={e => updateDeduction(d.id, 'label', e.target.value)}
                              placeholder="Ex: FGTS, INSS, IR..."
                              className="flex-1 text-xs outline-none py-2 px-3 rounded-lg"
                              style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-bd1)', color: 'var(--c-tx0)' }} />
                            <input
                              type="number" min="0" step="0.01"
                              value={d.amount}
                              onChange={e => updateDeduction(d.id, 'amount', e.target.value)}
                              placeholder="R$ 0,00"
                              className="w-24 text-xs outline-none py-2 px-3 rounded-lg"
                              style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-bd1)', color: 'var(--c-tx0)' }} />
                            <button onClick={() => removeDeduction(d.id)}
                              className="p-1.5 rounded-lg flex-shrink-0"
                              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-xs" style={{ color: 'var(--c-tx3)' }}>Total descontos adicionais</span>
                          <span className="text-sm font-bold" style={{ color: '#ef4444' }}>− {fmt(totalExtraDeductions)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Resumo final */}
                  <div className="rounded-xl p-4" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.25)' }}>
                    <div className="space-y-1.5 text-sm mb-3">
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--c-tx2)' }}>Salário base</span>
                        <span style={{ color: '#22c55e' }}>{fmt(payroll.salary)}</span>
                      </div>
                      {payroll.totalVales > 0 && (
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--c-tx2)' }}>− Vales</span>
                          <span style={{ color: '#ef4444' }}>− {fmt(payroll.totalVales)}</span>
                        </div>
                      )}
                      {totalExtraDeductions > 0 && (
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--c-tx2)' }}>− Descontos</span>
                          <span style={{ color: '#ef4444' }}>− {fmt(totalExtraDeductions)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid rgba(34,197,94,0.2)' }}>
                      <span className="text-base font-bold" style={{ color: 'var(--c-tx0)' }}>Valor a pagar</span>
                      <span className="text-xl font-bold" style={{ color: '#22c55e' }}>
                        {fmt(Math.max(0, payroll.salary - payroll.totalVales - totalExtraDeductions))}
                      </span>
                    </div>
                  </div>

                  {/* Data do pagamento + confirmar */}
                  {isOwner && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--c-tx2)' }}>
                          Data do Pagamento
                        </label>
                        <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
                          className="w-full py-2.5 px-3 rounded-xl text-sm outline-none"
                          style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-bd1)', color: 'var(--c-tx0)' }} />
                      </div>
                      {paymentConfirmed ? (
                        <div className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
                          style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.4)', color: '#22c55e' }}>
                          <CheckCircle2 size={16} /> Pagamento já confirmado neste mês
                        </div>
                      ) : (
                        <button onClick={handleConfirmPayment} disabled={confirmingPayment}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
                          style={{
                            background: 'linear-gradient(135deg,#22c55e,#16a34a)',
                            color: 'white', opacity: confirmingPayment ? 0.7 : 1,
                          }}>
                          <CheckCircle2 size={16} />
                          {confirmingPayment ? 'Registrando...' : 'Confirmar Pagamento'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Lista de vales */}
                  {payroll.vales.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--c-tx3)' }}>
                        Vales do mês ({payroll.vales.length})
                      </p>
                      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--c-bd0)' }}>
                        {payroll.vales.map((v, i) => (
                          <div key={v._id}
                            className="flex items-center justify-between px-4 py-3"
                            style={{ borderTop: i > 0 ? '1px solid var(--c-bd0)' : 'none', background: 'var(--c-bg2)' }}>
                            <div>
                              <p className="text-sm font-medium" style={{ color: 'var(--c-tx0)' }}>{v.reason || '—'}</p>
                              <p className="text-xs mt-0.5" style={{ color: 'var(--c-tx3)' }}>{fmtDate(v.date)}</p>
                            </div>
                            <p className="text-sm font-bold" style={{ color: '#ef4444' }}>− {fmt(v.amount)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Botão imprimir */}
                  <button onClick={() => printPayroll({ ...payroll, extraDeductions, payDate })}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-bd1)', color: 'var(--c-tx1)' }}>
                    <Printer size={15} /> Imprimir Resumo de Pagamento
                  </button>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {showValeModal && (
        <ValeModal employee={employee} company={company} onClose={() => setShowValeModal(false)} onSaved={handleValeAdded} />
      )}
      {showEditModal && (
        <EmployeeModal employee={employee} onClose={() => setShowEditModal(false)} onSaved={handleEmployeeUpdated} />
      )}
    </>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────
const FuncionariosPage = () => {
  const { user } = useAuth()
  const isOwner = user?.role === 'owner'
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [company, setCompany] = useState(null)

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/s/employees?search=${search}`)
      setEmployees(res.data.data.employees)
    } catch { toast.error('Erro ao carregar funcionários') }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  useEffect(() => {
    api.get('/s/company').then(r => setCompany(r.data.data.company)).catch(() => {})
  }, [])

  const handleDelete = async (e) => {
    if (!confirm(`Desativar "${e.name}"?`)) return
    try {
      await api.delete(`/s/employees/${e._id}`)
      toast.success('Funcionário desativado')
      fetchEmployees()
    } catch { toast.error('Erro ao desativar') }
  }

  const totalSalaries = employees.reduce((s, e) => s + (e.salary ?? 0), 0)
  const totalValesMonth = employees.reduce((s, e) => s + (e.currentMonthVales ?? 0), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--c-tx0)' }}>Funcionários</h1>
          <p className="text-base mt-1" style={{ color: 'var(--c-tx2)' }}>Gerencie sua equipe e controle vales</p>
        </div>
        {isOwner && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-base font-semibold"
            style={{ background: 'linear-gradient(135deg,#f97316,#ea6c10)', color: 'white' }}>
            <Plus size={18} /> Novo Funcionário
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="rounded-2xl p-5" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
          <p className="text-sm mb-2" style={{ color: 'var(--c-tx3)' }}>Total</p>
          <p className="text-3xl font-bold" style={{ color: 'var(--c-tx0)' }}>{employees.length}</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
          <p className="text-sm mb-2" style={{ color: 'var(--c-tx3)' }}>Folha Mensal (base)</p>
          <p className="text-3xl font-bold" style={{ color: '#22c55e' }}>{fmt(totalSalaries)}</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
          <p className="text-sm mb-2" style={{ color: 'var(--c-tx3)' }}>Vales Emitidos (mês)</p>
          <p className="text-3xl font-bold" style={{ color: '#f97316' }}>{fmt(totalValesMonth)}</p>
        </div>
      </div>

      {/* Busca */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-6"
        style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
        <Search size={16} style={{ color: 'var(--c-tx3)', flexShrink: 0 }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar funcionário por nome ou cargo..."
          className="flex-1 bg-transparent outline-none text-base" style={{ color: 'var(--c-tx0)' }} />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-9 h-9 border-4 rounded-full animate-spin"
            style={{ borderColor: 'var(--c-bd1)', borderTopColor: '#f97316' }} />
        </div>
      ) : employees.length === 0 ? (
        <div className="rounded-2xl text-center py-20" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
          <Users size={48} className="mx-auto mb-4" style={{ color: 'var(--c-bd0)' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--c-tx2)' }}>
            {search ? 'Nenhum funcionário encontrado' : 'Nenhum funcionário cadastrado'}
          </p>
          {!search && isOwner && (
            <p className="text-base mt-1" style={{ color: 'var(--c-tx3)' }}>Clique em "Novo Funcionário" para começar</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {employees.map(e => {
            const netPay = Math.max(0, (e.salary ?? 0) - (e.currentMonthVales ?? 0))
            const hasVales = (e.currentMonthVales ?? 0) > 0
            return (
              <div key={e._id}
                className="rounded-2xl p-5 flex flex-col gap-4 cursor-pointer transition-all"
                style={{ background: 'var(--c-bg1)', border: `1px solid ${hasVales ? 'rgba(249,115,22,0.25)' : 'var(--c-bd0)'}` }}
                onClick={() => setSelected(e)}>

                {/* Nome e cargo */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-bold flex-shrink-0"
                    style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>
                    {e.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-semibold truncate" style={{ color: 'var(--c-tx0)' }}>{e.name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--c-tx2)' }}>{e.cargo || 'Sem cargo'}</p>
                  </div>
                </div>

                {/* Valores */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="text-xs mb-0.5" style={{ color: 'var(--c-tx3)' }}>Salário</p>
                    <p className="text-sm font-semibold" style={{ color: '#22c55e' }}>{fmt(e.salary)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs mb-0.5" style={{ color: 'var(--c-tx3)' }}>Vales</p>
                    <p className="text-sm font-semibold" style={{ color: hasVales ? '#f97316' : 'var(--c-tx3)' }}>
                      {hasVales ? `− ${fmt(e.currentMonthVales)}` : '—'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs mb-0.5" style={{ color: 'var(--c-tx3)' }}>A Pagar</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--c-tx0)' }}>{e.salary > 0 ? fmt(netPay) : '—'}</p>
                  </div>
                </div>

                {/* Ações */}
                {isOwner && (
                  <div className="flex gap-2 pt-1" style={{ borderTop: '1px solid var(--c-bd0)' }}>
                    <button
                      onClick={ev => { ev.stopPropagation(); setSelected(e) }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs"
                      style={{ background: 'rgba(249,115,22,0.1)', color: '#f97316' }}>
                      <Receipt size={12} /> Vales
                    </button>
                    <button
                      onClick={ev => { ev.stopPropagation(); handleDelete(e) }}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                      style={{ background: 'var(--c-bg2)', color: 'var(--c-tx2)' }}
                      onMouseEnter={ev => ev.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={ev => ev.currentTarget.style.color = 'var(--c-tx2)'}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <EmployeeModal onClose={() => setShowCreate(false)} onSaved={fetchEmployees} />
      )}

      {selected && (
        <EmployeePanel
          employee={selected}
          company={company}
          onClose={() => setSelected(null)}
          onUpdate={fetchEmployees}
        />
      )}
    </div>
  )
}

export default FuncionariosPage
