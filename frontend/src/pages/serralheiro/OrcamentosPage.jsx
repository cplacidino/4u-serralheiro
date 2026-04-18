import { useEffect, useState, useCallback, useRef } from 'react'
import useAutoRefresh from '../../hooks/useAutoRefresh'
import {
  Plus, Search, FileText, Trash2, Eye, Pencil, X,
  ChevronLeft, ChevronRight, Printer, CreditCard, MessageCircle, Copy, Download, ClipboardList,
  ChevronDown, CheckCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

// ─── Constantes ───────────────────────────────────────────────────────────────
const STATUS = {
  rascunho:  { label: 'Rascunho',  bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
  enviado:   { label: 'Enviado',   bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa' },
  aprovado:  { label: 'Aprovado',  bg: 'rgba(34,197,94,0.15)',   color: '#22c55e' },
  rejeitado: { label: 'Rejeitado', bg: 'rgba(239,68,68,0.15)',   color: '#ef4444' },
  cancelado: { label: 'Cancelado', bg: 'rgba(239,68,68,0.15)',   color: '#ef4444' },
}

const UNITS = ['un', 'm', 'm²', 'm³', 'kg', 'h', 'vb']

const PAYMENT_METHODS = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'cartão_débito', label: 'Cartão Débito' },
  { value: 'cartão_crédito', label: 'Cartão Crédito' },
  { value: 'transferência', label: 'Transferência' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'fiado', label: 'Fiado' },
  { value: 'outro', label: 'Outro' },
]
const PAYMENT_STATUS_MAP = {
  sem_venda: { label: 'Sem pagamento',      color: '#94a3b8', bg: 'rgba(100,116,139,0.15)' },
  parcial:   { label: 'Parcialmente pago',  color: '#eab308', bg: 'rgba(234,179,8,0.15)' },
  pago:      { label: 'Pago',               color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
}

const fmt = (v) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

// ─── Estilos reutilizáveis ─────────────────────────────────────────────────────
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

// ─── Autocomplete ──────────────────────────────────────────────────────────────
const Autocomplete = ({ options, value, onChange, placeholder, getLabel, getKey, error }) => {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  const selected = options.find(o => getKey(o) === value)

  const filtered = query.trim()
    ? options.filter(o => getLabel(o).toLowerCase().includes(query.toLowerCase())).slice(0, 10)
    : options.slice(0, 10)

  // fecha se clicar fora
  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          value={open ? query : (selected ? getLabel(selected) : '')}
          onFocus={() => { setOpen(true); setQuery('') }}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          placeholder={placeholder}
          style={{ ...inputCls(error), paddingRight: 36 }}
          autoComplete="off"
        />
        <ChevronDown size={16} style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--c-tx3)', pointerEvents: 'none',
          transition: 'transform 0.15s', transform: open ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)',
        }} />
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
          background: 'var(--c-bg2)', border: '1px solid var(--c-bd1)', borderRadius: 10,
          maxHeight: 220, overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '12px 14px', color: 'var(--c-tx3)', fontSize: 13 }}>Nenhum resultado</div>
          ) : filtered.map(o => (
            <div key={getKey(o)}
              onMouseDown={e => { e.preventDefault(); onChange(getKey(o)); setOpen(false); setQuery('') }}
              style={{
                padding: '10px 14px', cursor: 'pointer', fontSize: 14, color: 'var(--c-tx0)',
                background: getKey(o) === value ? 'rgba(249,115,22,0.1)' : 'transparent',
                borderBottom: '1px solid var(--c-bd0)',
              }}
              onMouseEnter={e => { if (getKey(o) !== value) e.currentTarget.style.background = 'var(--c-bg0)' }}
              onMouseLeave={e => { if (getKey(o) !== value) e.currentTarget.style.background = 'transparent' }}>
              {getLabel(o)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Badge de status ───────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const s = STATUS[status] ?? STATUS.rascunho
  return (
    <span className="text-sm px-3 py-1 rounded-full font-medium"
      style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

// ─── Formulário de pagamento ───────────────────────────────────────────────────
const PaymentForm = ({ budget, onClose, onSaved }) => {
  const remaining = Math.max(0, budget.total - (budget.totalPaid ?? 0))
  const [method, setMethod] = useState('pix')
  const [amount, setAmount] = useState(remaining.toFixed(2))
  const [note, setNote] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setError('')
    const val = Number(amount)
    if (!val || val <= 0) return setError('Informe um valor válido.')
    if (method === 'fiado' && !dueDate) return setError('Informe a data de vencimento para fiado.')
    setSaving(true)
    try {
      await api.post('/s/payments', {
        budgetId: budget._id, method, amount: val,
        note: note || undefined, dueDate: dueDate || undefined,
      })
      toast.success('Pagamento registrado!')
      onSaved()
      onClose()
    } catch (e) {
      setError(e.response?.data?.message || 'Erro ao registrar pagamento.')
    } finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--c-bg0)', border: '1px solid var(--c-bd1)' }}>
      <p className="text-sm font-semibold" style={{ color: '#f97316' }}>Registrar Pagamento</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--c-tx1)' }}>Forma</label>
          <select value={method} onChange={e => setMethod(e.target.value)} style={inputCls(false)}>
            {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--c-tx1)' }}>Valor (R$)</label>
          <input type="number" step="0.01" value={amount}
            onChange={e => setAmount(e.target.value)} style={inputCls(false)} placeholder="0,00" />
        </div>
        {method === 'fiado' && (
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--c-tx1)' }}>Vencimento</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inputCls(false)} />
          </div>
        )}
        <div className={method === 'fiado' ? '' : 'col-span-2'}>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--c-tx1)' }}>Observação</label>
          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder="Opcional" style={inputCls(false)} />
        </div>
      </div>
      {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm"
          style={{ background: 'var(--c-bg2)', color: 'var(--c-tx1)' }}>Cancelar</button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg,#f97316,#ea6c10)', color: 'white', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Salvando...' : 'Confirmar'}
        </button>
      </div>
    </div>
  )
}

// ─── Modal de visualização / impressão ────────────────────────────────────────
const ViewModal = ({ budget, onClose, onEdit, onDuplicate, onStatusChange, onPaymentAdded }) => {
  const [payments, setPayments] = useState([])
  const [showPayForm, setShowPayForm] = useState(false)

  const loadPayments = useCallback(async () => {
    if (budget?.status !== 'aprovado') return
    try {
      const res = await api.get(`/s/payments/budget/${budget._id}`)
      setPayments(res.data.data.payments ?? [])
    } catch { /* silencia */ }
  }, [budget?._id, budget?.status])

  useEffect(() => { loadPayments() }, [loadPayments])

  if (!budget) return null

  const handlePrint = () => {
    const w = window.open('', '_blank')
    const co = budget.company
    const cl = budget.client

    const fmtAddr = (a) => {
      if (!a) return ''
      const parts = [
        a.street && a.number ? `${a.street}, ${a.number}` : a.street,
        a.complement,
        a.neighborhood,
        a.city && a.state ? `${a.city} — ${a.state}` : a.city || a.state,
        a.zipCode ? `CEP ${a.zipCode}` : '',
      ].filter(Boolean)
      return parts.join(' · ')
    }

    const paidLabel = {
      sem_venda: '', parcial: 'Parcialmente pago', pago: 'Pago integralmente',
    }

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>ORC-${String(budget.number).padStart(3,'0')} — ${co?.name ?? ''}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; background: #fff; padding: 28px 32px }
    .header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom: 18px; border-bottom: 2px solid #1a1a1a; margin-bottom: 20px }
    .company-name { font-size: 22px; font-weight: 800; color: #1a1a1a }
    .company-meta { font-size: 11px; color: #555; margin-top: 4px; line-height: 1.6 }
    .doc-info { text-align: right }
    .doc-number { font-size: 20px; font-weight: 700; color: #e05c00 }
    .doc-date { font-size: 11px; color: #666; margin-top: 4px; line-height: 1.6 }
    .status-badge { display:inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight:700; border: 1px solid #ccc; margin-top: 5px }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px }
    .box { border: 1px solid #ddd; border-radius: 6px; padding: 12px 14px }
    .box-title { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #888; font-weight: 700; margin-bottom: 6px }
    .box-name { font-size: 14px; font-weight: 700; color: #1a1a1a; margin-bottom: 3px }
    .box-line { font-size: 11.5px; color: #444; line-height: 1.6 }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px }
    thead tr { background: #f0f0f0 }
    th { padding: 9px 10px; text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: .05em; color: #555; font-weight: 700 }
    td { padding: 9px 10px; border-bottom: 1px solid #ececec; font-size: 12.5px; color: #1a1a1a }
    tbody tr:last-child td { border-bottom: none }
    .totals-wrap { display:flex; justify-content:flex-end; margin-bottom: 16px }
    .totals { width: 260px }
    .totals td { border: none; padding: 4px 8px; font-size: 12.5px }
    .totals .sep td { border-top: 1px solid #ddd; padding-top: 8px }
    .totals .grand td { font-size: 15px; font-weight: 700; border-top: 2px solid #1a1a1a; padding-top: 8px }
    .pay-section { border: 1px solid #ddd; border-radius: 6px; padding: 12px 14px; margin-bottom: 16px }
    .pay-row { display:flex; justify-content:space-between; font-size: 12px; padding: 4px 0; border-bottom: 1px solid #f0f0f0 }
    .pay-row:last-child { border-bottom: none }
    .pay-total { display:flex; justify-content:space-between; font-size: 13px; font-weight: 700; margin-top: 8px; padding-top: 6px; border-top: 1px solid #ddd }
    .notes { border: 1px solid #ddd; border-radius: 6px; padding: 12px 14px; margin-bottom: 20px }
    .sigs { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px }
    .sig-line { border-top: 1px solid #888; padding-top: 6px; font-size: 11px; color: #555; text-align: center }
    @media print { body { padding: 16px 20px } @page { margin: 10mm } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">${co?.name ?? 'Serralheiro'}</div>
      <div class="company-meta">
        ${co?.cnpj ? `CNPJ: ${co.cnpj}<br/>` : ''}
        ${co?.phone ? `Tel: ${co.phone}` : ''}${co?.email ? ` &nbsp;·&nbsp; ${co.email}` : ''}<br/>
        ${co?.address ? fmtAddr(co.address) : ''}
      </div>
    </div>
    <div class="doc-info">
      <div class="doc-number">ORC-${String(budget.number).padStart(3,'0')}</div>
      <div class="doc-date">
        Emitido em: <strong>${fmtDate(budget.createdAt)}</strong><br/>
        ${budget.validUntil ? `Válido até: <strong>${fmtDate(budget.validUntil)}</strong><br/>` : ''}
        ${budget.createdBy?.name ? `Responsável: ${budget.createdBy.name}` : ''}
      </div>
      <div class="status-badge">${STATUS[budget.status]?.label ?? budget.status}</div>
    </div>
  </div>
  <div class="grid2">
    <div class="box">
      <div class="box-title">Cliente</div>
      <div class="box-name">${cl?.name ?? '—'}</div>
      ${cl?.cpfCnpj ? `<div class="box-line">CPF/CNPJ: ${cl.cpfCnpj}</div>` : ''}
      ${cl?.phone ? `<div class="box-line">Tel: ${cl.phone}${cl?.phone2 ? ` / ${cl.phone2}` : ''}</div>` : ''}
      ${cl?.email ? `<div class="box-line">E-mail: ${cl.email}</div>` : ''}
      ${cl?.address ? `<div class="box-line" style="margin-top:4px">${fmtAddr(cl.address)}</div>` : ''}
    </div>
    <div class="box">
      <div class="box-title">Empresa Emissora</div>
      <div class="box-name">${co?.name ?? '—'}</div>
      ${co?.cnpj ? `<div class="box-line">CNPJ: ${co.cnpj}</div>` : ''}
      ${co?.phone ? `<div class="box-line">Tel: ${co.phone}</div>` : ''}
      ${co?.email ? `<div class="box-line">E-mail: ${co.email}</div>` : ''}
      ${co?.address ? `<div class="box-line" style="margin-top:4px">${fmtAddr(co.address)}</div>` : ''}
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Descrição</th>
        <th style="text-align:center;width:50px">Un</th>
        <th style="text-align:right;width:60px">Qtd</th>
        <th style="text-align:right;width:110px">Preço Unit.</th>
        <th style="text-align:right;width:110px">Total</th>
      </tr>
    </thead>
    <tbody>
      ${budget.items.map((i, idx) => `
      <tr style="${idx % 2 === 1 ? 'background:#fafafa' : ''}">
        <td>${i.description}</td>
        <td style="text-align:center;color:#555">${i.unit}</td>
        <td style="text-align:right;color:#555">${i.quantity}</td>
        <td style="text-align:right;color:#555">${fmt(i.unitPrice)}</td>
        <td style="text-align:right;font-weight:600">${fmt(i.total)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  <div class="totals-wrap">
    <table class="totals">
      <tr><td style="color:#555">Subtotal</td><td style="text-align:right">${fmt(budget.subtotal)}</td></tr>
      ${budget.discount > 0 ? `<tr class="sep"><td style="color:#c00">Desconto</td><td style="text-align:right;color:#c00">– ${fmt(budget.discount)}</td></tr>` : ''}
      <tr class="grand"><td>TOTAL</td><td style="text-align:right;color:#e05c00">${fmt(budget.total)}</td></tr>
      ${(budget.totalPaid ?? 0) > 0 ? `
      <tr><td style="color:#555;font-size:12px;padding-top:6px">Pago</td><td style="text-align:right;color:#15803d;font-size:12px;padding-top:6px">${fmt(budget.totalPaid)}</td></tr>
      <tr><td style="color:#555;font-size:12px">Saldo</td><td style="text-align:right;font-size:12px;${(budget.total - (budget.totalPaid ?? 0)) <= 0 ? 'color:#15803d' : 'color:#c00'}">${fmt(Math.max(0, budget.total - (budget.totalPaid ?? 0)))}</td></tr>
      ` : ''}
    </table>
  </div>
  ${payments.length > 0 ? `
  <div class="pay-section">
    <div class="box-title" style="margin-bottom:8px">Pagamentos Registrados</div>
    ${payments.map(p => {
      const label = PAYMENT_METHODS.find(m => m.value === p.method)?.label ?? p.method
      const status = p.status === 'fiado_pendente' ? `⏳ Fiado — vence ${fmtDate(p.dueDate)}` : '✓ Recebido'
      return `<div class="pay-row"><span>${label} <span style="color:#888;font-size:11px">${status}</span></span><span style="font-weight:600">${fmt(p.amount)}</span></div>`
    }).join('')}
    ${budget.paymentStatus ? `<div class="pay-total"><span>${paidLabel[budget.paymentStatus] || ''}</span><span>${fmt(budget.totalPaid ?? 0)}</span></div>` : ''}
  </div>` : ''}
  ${budget.notes ? `
  <div class="notes">
    <div class="box-title" style="margin-bottom:6px">Observações</div>
    <p style="font-size:12.5px;color:#333;line-height:1.6">${budget.notes}</p>
  </div>` : ''}
  <div class="sigs">
    <div><div class="sig-line">${co?.name ?? 'Empresa'}</div></div>
    <div><div class="sig-line">${cl?.name ?? 'Cliente'}</div></div>
  </div>
</body>
</html>`
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 300)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-3xl rounded-2xl flex flex-col" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)', maxHeight: '90vh' }}>

        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--c-bd0)' }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--c-tx0)' }}>
              ORC-{String(budget.number).padStart(3, '0')}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <StatusBadge status={budget.status} />
              <span className="text-sm" style={{ color: 'var(--c-tx3)' }}>
                {fmtDate(budget.createdAt)}
                {budget.validUntil && ` · Válido até ${fmtDate(budget.validUntil)}`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'var(--c-bg2)', color: 'var(--c-tx1)' }}>
              <Printer size={16} /> PDF
            </button>
            {budget.client?.phone && (
              <button
                onClick={() => {
                  const phone = budget.client.phone.replace(/\D/g, '')
                  const num = phone.startsWith('55') ? phone : `55${phone}`
                  const orcNum = `ORC-${String(budget.number).padStart(3, '0')}`
                  const msg = encodeURIComponent(
                    `Olá ${budget.client.name}! Segue o orçamento *${orcNum}* no valor de *${fmt(budget.total)}*. Qualquer dúvida estamos à disposição!`
                  )
                  window.open(`https://wa.me/${num}?text=${msg}`, '_blank')
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                <MessageCircle size={16} /> WhatsApp
              </button>
            )}
            {budget.status === 'aprovado' && (
              <button
                onClick={() => {
                  onClose()
                  window.location.href = `/dashboard/ordens-servico?budgetId=${budget._id}`
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>
                <ClipboardList size={16} /> Gerar OS
              </button>
            )}
            <button onClick={() => onDuplicate(budget._id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'var(--c-bg2)', color: 'var(--c-tx1)' }}>
              <Copy size={16} /> Duplicar
            </button>
            {budget.status === 'rascunho' && (
              <button onClick={() => { onEdit(budget); onClose() }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>
                <Pencil size={16} /> Editar
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl" style={{ color: 'var(--c-tx3)', background: 'var(--c-bg2)' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="overflow-y-auto p-6 space-y-5">

          {/* Cliente */}
          <div className="rounded-xl p-4" style={{ background: 'var(--c-bg2)' }}>
            <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--c-tx3)' }}>Cliente</p>
            <p className="text-base font-semibold" style={{ color: 'var(--c-tx0)' }}>{budget.client?.name}</p>
            {budget.client?.phone && <p className="text-sm mt-0.5" style={{ color: 'var(--c-tx2)' }}>{budget.client.phone}</p>}
          </div>

          {/* Itens */}
          <div>
            <p className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--c-tx3)' }}>Itens</p>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--c-bd0)' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'var(--c-bg2)' }}>
                    {['Descrição', 'Un', 'Qtd', 'Preço Unit.', 'Total'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase"
                        style={{ color: 'var(--c-tx3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {budget.items.map((item, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--c-bd0)' }}>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--c-tx0)' }}>{item.description}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--c-tx2)' }}>{item.unit}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--c-tx2)' }}>{item.quantity}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--c-tx2)' }}>{fmt(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--c-tx0)' }}>{fmt(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totais */}
          <div className="flex justify-end">
            <div className="space-y-2 min-w-56">
              <div className="flex justify-between text-sm" style={{ color: 'var(--c-tx2)' }}>
                <span>Subtotal</span><span>{fmt(budget.subtotal)}</span>
              </div>
              {budget.discount > 0 && (
                <div className="flex justify-between text-sm" style={{ color: '#ef4444' }}>
                  <span>Desconto</span><span>- {fmt(budget.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2" style={{ color: 'var(--c-tx0)', borderTop: '1px solid var(--c-bd0)' }}>
                <span>Total</span><span style={{ color: '#f97316' }}>{fmt(budget.total)}</span>
              </div>
            </div>
          </div>

          {/* Observações */}
          {budget.notes && (
            <div className="rounded-xl p-4" style={{ background: 'var(--c-bg2)' }}>
              <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--c-tx3)' }}>Observações</p>
              <p className="text-sm" style={{ color: 'var(--c-tx1)' }}>{budget.notes}</p>
            </div>
          )}

          {/* ─── Fluxo de status ─── */}
          {(budget.status === 'rascunho' || budget.status === 'enviado') && (
            <div className="rounded-xl p-4" style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-bd0)' }}>
              <p className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--c-tx3)' }}>
                Progressão do Orçamento
              </p>
              {/* Linha de status */}
              <div className="flex items-center gap-2 mb-4">
                {['rascunho','enviado','aprovado'].map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                          background: budget.status === s ? STATUS[s].bg : (i < ['rascunho','enviado','aprovado'].indexOf(budget.status) ? 'rgba(34,197,94,0.2)' : 'var(--c-bg0)'),
                          color: budget.status === s ? STATUS[s].color : (i < ['rascunho','enviado','aprovado'].indexOf(budget.status) ? '#22c55e' : 'var(--c-tx3)'),
                          border: `1px solid ${budget.status === s ? STATUS[s].color : 'var(--c-bd0)'}`,
                        }}>
                        {i + 1}
                      </div>
                      <span className="text-xs" style={{ color: budget.status === s ? STATUS[s].color : 'var(--c-tx3)' }}>
                        {STATUS[s].label}
                      </span>
                    </div>
                    {i < 2 && <div className="w-6 h-px" style={{ background: 'var(--c-bd0)' }} />}
                  </div>
                ))}
              </div>
              {budget.status === 'rascunho' && (
                <div className="flex gap-3">
                  <button onClick={() => onStatusChange(budget._id, 'enviado')}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>
                    Marcar como Enviado →
                  </button>
                  <button onClick={() => onStatusChange(budget._id, 'aprovado')}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                    Aprovar direto ✓
                  </button>
                </div>
              )}
              {budget.status === 'enviado' && (
                <div className="flex gap-3">
                  <button onClick={() => onStatusChange(budget._id, 'aprovado')}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                    Aprovar ✓
                  </button>
                  <button onClick={() => onStatusChange(budget._id, 'rejeitado')}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                    Rejeitar ✗
                  </button>
                </div>
              )}
              <p className="text-xs mt-3" style={{ color: 'var(--c-tx3)' }}>
                💡 Após aprovar, você poderá registrar pagamentos e gerar Ordem de Serviço.
              </p>
            </div>
          )}

          {/* ─── Pagamentos (somente orçamentos aprovados) ─── */}
          {budget.status === 'aprovado' && (
            <div className="space-y-4 pt-4" style={{ borderTop: '1px solid var(--c-bd0)' }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--c-tx3)' }}>
                  Pagamentos
                </p>
                {budget.paymentStatus && PAYMENT_STATUS_MAP[budget.paymentStatus] && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: PAYMENT_STATUS_MAP[budget.paymentStatus].bg,
                      color: PAYMENT_STATUS_MAP[budget.paymentStatus].color,
                    }}>
                    {PAYMENT_STATUS_MAP[budget.paymentStatus].label}
                  </span>
                )}
              </div>

              {/* Barra de progresso */}
              <div>
                <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--c-tx2)' }}>
                  <span>Pago: {fmt(budget.totalPaid ?? 0)}</span>
                  <span>Total: {fmt(budget.total)}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--c-bg2)' }}>
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${Math.min(100, (((budget.totalPaid ?? 0) / budget.total) * 100))}%`,
                    background: (budget.totalPaid ?? 0) >= budget.total
                      ? '#22c55e'
                      : 'linear-gradient(90deg, #f97316, #ea6c10)',
                  }} />
                </div>
              </div>

              {/* Lista de pagamentos */}
              {payments.length > 0 && (
                <div className="space-y-2">
                  {payments.map(p => {
                    const methodLabel = PAYMENT_METHODS.find(m => m.value === p.method)?.label ?? p.method
                    const isPending = p.status === 'fiado_pendente'
                    return (
                      <div key={p._id} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                        style={{ background: 'var(--c-bg2)' }}>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--c-tx0)' }}>{methodLabel}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--c-tx3)' }}>
                            {isPending ? '⏳ Fiado pendente' : '✓ Recebido'}
                            {p.dueDate && isPending && ` · vence ${fmtDate(p.dueDate)}`}
                          </p>
                        </div>
                        <p className="text-base font-bold"
                          style={{ color: isPending ? '#eab308' : '#22c55e' }}>
                          {fmt(p.amount)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}

              {!showPayForm && (budget.totalPaid ?? 0) < budget.total && (
                <button onClick={() => setShowPayForm(true)}
                  className="flex items-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold justify-center"
                  style={{ background: 'rgba(249,115,22,0.1)', color: '#f97316', border: '1px dashed rgba(249,115,22,0.35)' }}>
                  <CreditCard size={15} /> Registrar Pagamento
                </button>
              )}

              {showPayForm && (
                <PaymentForm
                  budget={budget}
                  onClose={() => setShowPayForm(false)}
                  onSaved={() => { loadPayments(); onPaymentAdded?.() }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Modal de criação / edição ─────────────────────────────────────────────────
const BudgetModal = ({ budget, onClose, onSaved }) => {
  const isEdit = !!budget
  const [clients, setClients] = useState([])
  const [products, setProducts] = useState([])
  const [clientId, setClientId] = useState(budget?.client?._id ?? budget?.client ?? '')
  const [items, setItems] = useState(
    budget?.items?.length
      ? budget.items.map(i => ({
          productId: i.product?._id ?? i.product ?? '',
          description: i.description,
          unit: i.unit,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        }))
      : [{ productId: '', description: '', unit: 'un', quantity: 1, unitPrice: 0 }]
  )
  const [discountType, setDiscountType] = useState('R$')
  const [discountInput, setDiscountInput] = useState(String(budget?.discount ?? 0))
  const [notes, setNotes] = useState(budget?.notes ?? '')
  const [validUntil, setValidUntil] = useState(
    budget?.validUntil ? new Date(budget.validUntil).toISOString().split('T')[0] : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/s/clients?limit=500'),
      api.get('/s/products?limit=500'),
    ]).then(([c, p]) => {
      setClients(c.data.data.clients)
      setProducts(p.data.data.products)
    }).catch(() => {})
  }, [])

  const setItem = (index, field, value) => {
    setItems(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      if (field === 'productId' && value) {
        const prod = products.find(p => p._id === value)
        if (prod) {
          next[index].description = prod.name
          next[index].unit = prod.unit ?? 'un'
          next[index].unitPrice = prod.price ?? 0
        }
      }
      return next
    })
  }

  const addItem = () => setItems(prev => [
    ...prev,
    { productId: '', description: '', unit: 'un', quantity: 1, unitPrice: 0 },
  ])

  const removeItem = (index) => setItems(prev => prev.filter((_, i) => i !== index))

  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.unitPrice)), 0)

  // Calcula desconto em R$ independente do tipo selecionado
  const discountValue = discountType === '%'
    ? Math.min(subtotal, (subtotal * Math.max(0, Number(discountInput) || 0)) / 100)
    : Math.max(0, Number(discountInput) || 0)

  const total = Math.max(0, subtotal - discountValue)

  const handleDiscountTypeChange = (type) => {
    if (type === discountType) return
    if (type === '%') {
      const pct = subtotal > 0 ? ((discountValue / subtotal) * 100).toFixed(2) : '0'
      setDiscountInput(pct)
    } else {
      setDiscountInput(discountValue.toFixed(2))
    }
    setDiscountType(type)
  }

  const handleSave = async () => {
    setError('')
    if (!clientId) return setError('Selecione um cliente.')
    if (items.some(i => !i.description)) return setError('Preencha a descrição de todos os itens.')
    if (items.some(i => Number(i.quantity) <= 0)) return setError('Quantidade deve ser maior que zero.')

    setSaving(true)
    try {
      const payload = { clientId, items, discount: discountValue, notes, validUntil }
      if (isEdit) {
        await api.put(`/s/budgets/${budget._id}`, payload)
        toast.success('Orçamento atualizado!')
      } else {
        await api.post('/s/budgets', payload)
        toast.success('Orçamento criado!')
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e.response?.data?.message || 'Erro ao salvar orçamento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-4xl rounded-2xl flex flex-col" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)', maxHeight: '92vh' }}>

        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--c-bd0)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--c-tx0)' }}>
            {isEdit ? 'Editar Orçamento' : 'Novo Orçamento'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ color: 'var(--c-tx3)', background: 'var(--c-bg2)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">

          {/* Cliente + Validade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Cliente *">
              <Autocomplete
                options={clients}
                value={clientId}
                onChange={setClientId}
                placeholder="Buscar cliente..."
                getKey={o => o._id}
                getLabel={o => o.name + (o.phone ? ` — ${o.phone}` : '')}
                error={!clientId && !!error}
              />
            </Field>
            <Field label="Válido até">
              <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} style={inputCls(false)} />
            </Field>
          </div>

          {/* Itens */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#f97316' }}>Itens do Orçamento</p>
              <button onClick={addItem}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>
                <Plus size={15} /> Adicionar item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="rounded-xl p-4 space-y-3" style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-bd0)' }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Produto do catálogo */}
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--c-tx2)' }}>Produto do catálogo (opcional)</label>
                      <Autocomplete
                        options={products}
                        value={item.productId}
                        onChange={v => setItem(idx, 'productId', v)}
                        placeholder="Buscar no catálogo..."
                        getKey={o => o._id}
                        getLabel={o => o.name + (o.price ? ` — ${fmt(o.price)}` : '')}
                      />
                    </div>
                    {/* Descrição */}
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--c-tx2)' }}>Descrição *</label>
                      <input value={item.description} onChange={e => setItem(idx, 'description', e.target.value)}
                        placeholder="Ex: Portão de ferro 2x2m" style={{ ...inputCls(false), fontSize: 13 }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 items-end">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--c-tx2)' }}>Unidade</label>
                      <select value={item.unit} onChange={e => setItem(idx, 'unit', e.target.value)}
                        style={{ ...inputCls(false), fontSize: 13 }}>
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--c-tx2)' }}>Quantidade</label>
                      <input type="number" min="0.01" step="0.01" value={item.quantity}
                        onChange={e => setItem(idx, 'quantity', e.target.value)}
                        style={{ ...inputCls(false), fontSize: 13 }} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--c-tx2)' }}>Preço Unit. (R$)</label>
                      <input type="number" min="0" step="0.01" value={item.unitPrice}
                        onChange={e => setItem(idx, 'unitPrice', e.target.value)}
                        style={{ ...inputCls(false), fontSize: 13 }} />
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <p className="text-xs mb-1" style={{ color: 'var(--c-tx2)' }}>Total</p>
                        <p className="text-base font-bold" style={{ color: '#f97316' }}>
                          {fmt(Number(item.quantity) * Number(item.unitPrice))}
                        </p>
                      </div>
                      {items.length > 1 && (
                        <button onClick={() => removeItem(idx)} className="p-2 rounded-lg mb-0.5"
                          style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}>
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totais + Desconto + Notas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Field label="Observações">
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder="Prazo de entrega, condições de pagamento..."
                style={{ ...inputCls(false), resize: 'vertical' }} />
            </Field>
            <div className="space-y-3">
              <div className="flex justify-between text-sm" style={{ color: 'var(--c-tx2)' }}>
                <span>Subtotal</span><span className="font-medium" style={{ color: 'var(--c-tx0)' }}>{fmt(subtotal)}</span>
              </div>

              {/* Campo desconto com toggle R$/% */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--c-tx1)' }}>Desconto</label>
                <div className="flex gap-2">
                  {/* Toggle R$  / % */}
                  <div className="flex rounded-xl overflow-hidden flex-shrink-0"
                    style={{ border: '1px solid var(--c-bd1)' }}>
                    {['R$', '%'].map(t => (
                      <button key={t} onClick={() => handleDiscountTypeChange(t)}
                        className="px-3 py-2.5 text-sm font-semibold transition-all"
                        style={{
                          background: discountType === t ? '#f97316' : 'var(--c-bg2)',
                          color: discountType === t ? 'white' : 'var(--c-tx2)',
                        }}>
                        {t}
                      </button>
                    ))}
                  </div>
                  <input type="number" min="0" step="0.01"
                    max={discountType === '%' ? 100 : undefined}
                    value={discountInput}
                    onChange={e => setDiscountInput(e.target.value)}
                    style={{ ...inputCls(false), flex: 1 }}
                    placeholder={discountType === '%' ? '0.00 %' : '0,00'} />
                </div>
                {discountType === '%' && discountValue > 0 && (
                  <p className="text-xs mt-1" style={{ color: 'var(--c-tx3)' }}>
                    = {fmt(discountValue)} de desconto
                  </p>
                )}
              </div>

              <div className="flex justify-between text-xl font-bold pt-2" style={{ borderTop: '1px solid var(--c-bd0)', color: 'var(--c-tx0)' }}>
                <span>Total</span>
                <span style={{ color: '#f97316' }}>{fmt(total)}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
              {error}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex gap-3 p-6" style={{ borderTop: '1px solid var(--c-bd0)' }}>
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium"
            style={{ background: 'var(--c-bg2)', color: 'var(--c-tx1)' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-xl text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg,#f97316,#ea6c10)', color: 'white', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Orçamento'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────
const OrcamentosPage = () => {
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [editBudget, setEditBudget] = useState(null)
  const [viewBudget, setViewBudget] = useState(null)

  const fetchBudgets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 10 })
      if (search) params.append('search', search)
      if (statusFilter) params.append('status', statusFilter)
      if (dateFrom) params.append('dateFrom', dateFrom)
      if (dateTo) params.append('dateTo', dateTo)
      const res = await api.get(`/s/budgets?${params}`)
      setBudgets(res.data.data.budgets)
      setTotalPages(res.data.data.pages)
    } catch {
      toast.error('Erro ao carregar orçamentos')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, dateFrom, dateTo, page])

  useEffect(() => { fetchBudgets() }, [fetchBudgets])
  useAutoRefresh(fetchBudgets)

  const handleStatusChange = async (id, status) => {
    try {
      await api.put(`/s/budgets/${id}`, { status })
      toast.success('Status atualizado!')
      setViewBudget(null)
      fetchBudgets()
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este orçamento?')) return
    try {
      await api.delete(`/s/budgets/${id}`)
      toast.success('Orçamento excluído')
      fetchBudgets()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erro ao excluir')
    }
  }

  const handleView = async (id) => {
    try {
      const res = await api.get(`/s/budgets/${id}`)
      setViewBudget(res.data.data.budget)
    } catch {
      toast.error('Erro ao carregar orçamento')
    }
  }

  const handleDuplicate = async (id) => {
    try {
      await api.post(`/s/budgets/${id}/duplicate`)
      toast.success('Orçamento duplicado! Aberto como rascunho.')
      setViewBudget(null)
      fetchBudgets()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erro ao duplicar orçamento')
    }
  }

  const exportCSV = async () => {
    try {
      const params = new URLSearchParams({ limit: 1000 })
      if (statusFilter) params.append('status', statusFilter)
      if (search) params.append('search', search)
      const res = await api.get(`/s/budgets?${params}`)
      const rows = res.data.data.budgets
      if (!rows.length) return toast.error('Nenhum orçamento para exportar')
      const header = ['Número', 'Cliente', 'Data', 'Validade', 'Status', 'Subtotal', 'Desconto', 'Total']
      const lines = rows.map(b => [
        `ORC-${String(b.number).padStart(3, '0')}`,
        `"${(b.client?.name || '').replace(/"/g, '""')}"`,
        new Date(b.createdAt).toLocaleDateString('pt-BR'),
        b.validUntil ? new Date(b.validUntil).toLocaleDateString('pt-BR') : '',
        b.status,
        (b.subtotal ?? 0).toFixed(2).replace('.', ','),
        (b.discount ?? 0).toFixed(2).replace('.', ','),
        (b.total ?? 0).toFixed(2).replace('.', ','),
      ].join(';'))
      const csv = '\uFEFF' + [header.join(';'), ...lines].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `orcamentos-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Erro ao exportar')
    }
  }

  const reloadView = useCallback(async () => {
    if (!viewBudget?._id) return
    try {
      const [budgetRes] = await Promise.all([api.get(`/s/budgets/${viewBudget._id}`), fetchBudgets()])
      setViewBudget(budgetRes.data.data.budget)
    } catch { /* silencia */ }
  }, [viewBudget?._id])

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--c-tx0)' }}>Orçamentos</h1>
          <p className="text-base mt-1" style={{ color: 'var(--c-tx2)' }}>Crie e gerencie seus orçamentos</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium"
            style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)', color: 'var(--c-tx2)' }}>
            <Download size={16} /> CSV
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-base font-semibold"
            style={{ background: 'linear-gradient(135deg,#f97316,#ea6c10)', color: 'white' }}>
            <Plus size={18} /> Novo Orçamento
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl flex-1"
            style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
            <Search size={16} style={{ color: 'var(--c-tx3)', flexShrink: 0 }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar por cliente ou número..."
              className="flex-1 bg-transparent outline-none text-base"
              style={{ color: 'var(--c-tx0)' }} />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="py-3 px-4 rounded-2xl text-base outline-none"
            style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)', color: 'var(--c-tx0)', minWidth: 160 }}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        {/* Filtro por período */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-medium" style={{ color: 'var(--c-tx3)' }}>Período:</span>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }}
            className="py-2 px-3 rounded-xl text-sm outline-none"
            style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)', color: dateFrom ? 'var(--c-tx0)' : 'var(--c-tx3)' }} />
          <span className="text-xs" style={{ color: 'var(--c-tx3)' }}>até</span>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }}
            className="py-2 px-3 rounded-xl text-sm outline-none"
            style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)', color: dateTo ? 'var(--c-tx0)' : 'var(--c-tx3)' }} />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); setPage(1) }}
              className="text-xs px-3 py-1.5 rounded-xl"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center h-56">
          <div className="w-10 h-10 border-4 rounded-full animate-spin"
            style={{ borderColor: 'var(--c-bd1)', borderTopColor: '#f97316' }} />
        </div>
      ) : budgets.length === 0 ? (
        <div className="rounded-2xl text-center py-20" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
          <FileText size={48} className="mx-auto mb-4" style={{ color: 'var(--c-bd0)' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--c-tx2)' }}>Nenhum orçamento encontrado</p>
          <p className="text-base mt-1" style={{ color: 'var(--c-tx3)' }}>Clique em "Novo Orçamento" para começar</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block rounded-2xl overflow-hidden" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--c-bd0)' }}>
                  {['Número', 'Cliente', 'Data', 'Validade', 'Total', 'Status', 'Ações'].map(h => (
                    <th key={h} className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--c-tx3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {budgets.map(b => {
                  const isVencido = b.validUntil && b.status === 'enviado' && new Date(b.validUntil) < new Date()
                  return (
                    <tr key={b._id} style={{ borderBottom: '1px solid var(--c-bd0)', cursor: 'pointer' }}
                      onClick={() => handleView(b._id)}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--c-bg2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold" style={{ color: '#f97316' }}>
                          ORC-{String(b.number).padStart(3, '0')}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm font-medium" style={{ color: 'var(--c-tx0)' }}>
                        {b.client?.name ?? '—'}
                      </td>
                      <td className="px-5 py-4 text-sm" style={{ color: 'var(--c-tx2)' }}>
                        {fmtDate(b.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm" style={{ color: isVencido ? '#ef4444' : 'var(--c-tx2)' }}>
                            {fmtDate(b.validUntil)}
                          </span>
                          {isVencido && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                              VENCIDO
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-base font-bold" style={{ color: 'var(--c-tx0)' }}>
                        {fmt(b.total)}
                      </td>
                      <td className="px-5 py-4"><StatusBadge status={b.status} /></td>
                      <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {/* Aprovar rápido para rascunho/enviado */}
                          {(b.status === 'rascunho' || b.status === 'enviado') && (
                            <button
                              onClick={() => handleStatusChange(b._id, 'aprovado')}
                              className="p-2 rounded-lg"
                              style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}
                              title="Aprovar orçamento">
                              <CheckCircle size={15} />
                            </button>
                          )}
                          {b.status === 'aprovado' && (
                            <button
                              onClick={() => { window.location.href = `/dashboard/ordens-servico?budgetId=${b._id}` }}
                              className="p-2 rounded-lg"
                              style={{ background: 'rgba(249,115,22,0.1)', color: '#f97316' }}
                              title="Gerar OS">
                              <ClipboardList size={15} />
                            </button>
                          )}
                          <button onClick={() => handleDuplicate(b._id)} className="p-2 rounded-lg"
                            style={{ background: 'var(--c-bg2)', color: 'var(--c-tx2)' }} title="Duplicar">
                            <Copy size={15} />
                          </button>
                          {b.client?.phone && (
                            <button
                              onClick={() => {
                                const phone = b.client.phone.replace(/\D/g, '')
                                const num = phone.startsWith('55') ? phone : `55${phone}`
                                const orcNum = `ORC-${String(b.number).padStart(3, '0')}`
                                const msg = encodeURIComponent(`Olá ${b.client.name}! Segue o orçamento *${orcNum}* no valor de *${fmt(b.total)}*. Qualquer dúvida estamos à disposição!`)
                                window.open(`https://wa.me/${num}?text=${msg}`, '_blank')
                              }}
                              className="p-2 rounded-lg"
                              style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }} title="WhatsApp">
                              <MessageCircle size={15} />
                            </button>
                          )}
                          {b.status === 'rascunho' && (
                            <>
                              <button onClick={() => setEditBudget(b)} className="p-2 rounded-lg"
                                style={{ background: 'var(--c-bg2)', color: 'var(--c-tx2)' }} title="Editar">
                                <Pencil size={15} />
                              </button>
                              <button onClick={() => handleDelete(b._id)} className="p-2 rounded-lg"
                                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }} title="Excluir">
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile — cartões */}
          <div className="md:hidden space-y-4">
            {budgets.map(b => {
              const isVencidoMobile = b.validUntil && b.status === 'enviado' && new Date(b.validUntil) < new Date()
              return (
                <div key={b._id} className="rounded-2xl p-5" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)', cursor: 'pointer' }}
                  onClick={() => handleView(b._id)}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="text-base font-bold" style={{ color: '#f97316' }}>
                        ORC-{String(b.number).padStart(3, '0')}
                      </p>
                      <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--c-tx0)' }}>{b.client?.name}</p>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--c-tx3)' }}>{fmtDate(b.createdAt)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={b.status} />
                      {isVencidoMobile && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                          VENCIDO
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3" onClick={e => e.stopPropagation()}>
                    <p className="text-xl font-bold" style={{ color: 'var(--c-tx0)' }}>{fmt(b.total)}</p>
                    <div className="flex gap-2">
                      {(b.status === 'rascunho' || b.status === 'enviado') && (
                        <button
                          onClick={() => handleStatusChange(b._id, 'aprovado')}
                          className="p-2.5 rounded-xl"
                          style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}
                          title="Aprovar">
                          <CheckCircle size={16} />
                        </button>
                      )}
                      {b.client?.phone && (
                        <button
                          onClick={() => {
                            const phone = b.client.phone.replace(/\D/g, '')
                            const num = phone.startsWith('55') ? phone : `55${phone}`
                            const orcNum = `ORC-${String(b.number).padStart(3, '0')}`
                            const msg = encodeURIComponent(`Olá ${b.client.name}! Segue o orçamento *${orcNum}* no valor de *${fmt(b.total)}*. Qualquer dúvida estamos à disposição!`)
                            window.open(`https://wa.me/${num}?text=${msg}`, '_blank')
                          }}
                          className="p-2.5 rounded-xl"
                          style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                          <MessageCircle size={16} />
                        </button>
                      )}
                      {b.status === 'rascunho' && (
                        <button onClick={() => handleDelete(b._id)} className="p-2.5 rounded-xl"
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2.5 rounded-xl" style={{ background: 'var(--c-bg1)', color: page === 1 ? 'var(--c-bd1)' : 'var(--c-tx0)' }}>
                <ChevronLeft size={18} />
              </button>
              <span className="text-base" style={{ color: 'var(--c-tx2)' }}>Página {page} de {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-2.5 rounded-xl" style={{ background: 'var(--c-bg1)', color: page === totalPages ? 'var(--c-bd1)' : 'var(--c-tx0)' }}>
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Modais */}
      {showCreate && (
        <BudgetModal onClose={() => setShowCreate(false)} onSaved={fetchBudgets} />
      )}
      {editBudget && (
        <BudgetModal budget={editBudget} onClose={() => setEditBudget(null)} onSaved={fetchBudgets} />
      )}
      {viewBudget && (
        <ViewModal
          budget={viewBudget}
          onClose={() => setViewBudget(null)}
          onEdit={(b) => setEditBudget(b)}
          onDuplicate={handleDuplicate}
          onStatusChange={handleStatusChange}
          onPaymentAdded={reloadView}
        />
      )}
    </div>
  )
}

export default OrcamentosPage
