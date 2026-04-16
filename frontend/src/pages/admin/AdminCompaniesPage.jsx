import { useEffect, useState, useCallback } from 'react'
import {
  Plus, Search, Building2, CheckCircle, XCircle, ChevronLeft, ChevronRight,
  X, Users, KeyRound, Pencil, ChevronRight as Arrow,
  Download, UserPlus, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import api from '../../services/api'

// ─── Helpers de estilo ───
const inputSt = (err) => ({
  background: '#242429',
  border: `1px solid ${err ? '#ef4444' : '#3d3d47'}`,
  color: '#e0e0ec',
  borderRadius: 12,
  padding: '10px 14px',
  fontSize: 14,
  width: '100%',
  outline: 'none',
})

const Field = ({ label, error, children }) => (
  <div>
    <label className="block text-sm font-medium mb-1.5" style={{ color: '#b8b8c8' }}>{label}</label>
    {children}
    {error && <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>{error}</p>}
  </div>
)

// ─── Schema de criação de empresa ───
const createSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.email('E-mail inválido'),
  phone: z.string().optional(),
  cnpj: z.string().optional(),
  planId: z.string().min(1, 'Selecione um plano'),
  durationMonths: z.coerce.number().min(1).max(36),
  ownerName: z.string().min(2, 'Nome do responsável obrigatório'),
  ownerEmail: z.email('E-mail do responsável inválido'),
  ownerPassword: z.string().min(8, 'Senha mínima de 8 caracteres'),
})

// ─── Modal: criar empresa ───
const CreateCompanyModal = ({ onClose, plans, onSuccess }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(createSchema),
    defaultValues: { durationMonths: 1 },
  })

  const onSubmit = async (data) => {
    try {
      await api.post('/admin/companies', data)
      toast.success('Empresa criada com sucesso!')
      onSuccess()
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao criar empresa')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-y-auto max-h-[90vh]" style={{ background: '#1a1a1f', border: '1px solid #2e2e35' }}>
        <div className="p-6" style={{ borderBottom: '1px solid #2e2e35' }}>
          <h2 className="text-lg font-bold" style={{ color: '#e0e0ec' }}>Nova Empresa</h2>
          <p className="text-sm mt-1" style={{ color: '#8a8a9a' }}>Preencha os dados da serralheria e do responsável</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#f97316' }}>Dados da Empresa</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome da empresa *" error={errors.name?.message}>
              <input {...register('name')} style={inputSt(errors.name)} placeholder="Serralheria Silva" />
            </Field>
            <Field label="E-mail *" error={errors.email?.message}>
              <input {...register('email')} type="email" style={inputSt(errors.email)} placeholder="empresa@email.com" />
            </Field>
            <Field label="Telefone" error={errors.phone?.message}>
              <input {...register('phone')} style={inputSt(errors.phone)} placeholder="(11) 99999-9999" />
            </Field>
            <Field label="CNPJ" error={errors.cnpj?.message}>
              <input {...register('cnpj')} style={inputSt(errors.cnpj)} placeholder="00.000.000/0001-00" />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Plano *" error={errors.planId?.message}>
              <select {...register('planId')} style={inputSt(errors.planId)}>
                <option value="">Selecione...</option>
                {plans.map(p => <option key={p._id} value={p._id}>{p.name} — R$ {p.price.toFixed(2).replace('.', ',')}/mês</option>)}
              </select>
            </Field>
            <Field label="Duração (meses) *" error={errors.durationMonths?.message}>
              <input {...register('durationMonths')} type="number" min="1" max="36" style={inputSt(errors.durationMonths)} />
            </Field>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider pt-2" style={{ color: '#f97316' }}>Responsável / Dono</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome *" error={errors.ownerName?.message}>
              <input {...register('ownerName')} style={inputSt(errors.ownerName)} placeholder="João da Silva" />
            </Field>
            <Field label="E-mail *" error={errors.ownerEmail?.message}>
              <input {...register('ownerEmail')} type="email" style={inputSt(errors.ownerEmail)} placeholder="joao@email.com" />
            </Field>
            <Field label="Senha *" error={errors.ownerPassword?.message}>
              <input {...register('ownerPassword')} type="password" style={inputSt(errors.ownerPassword)} placeholder="Mín. 8 caracteres" />
            </Field>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium"
              style={{ background: '#2e2e35', color: '#b8b8c8' }}>Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-3 rounded-xl text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea6c10)', color: 'white', opacity: isSubmitting ? 0.7 : 1 }}>
              {isSubmitting ? 'Salvando...' : 'Criar Empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal: redefinir senha ───
const ResetPasswordModal = ({ user, companyId, onClose }) => {
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 8) return toast.error('Senha mínima de 8 caracteres')
    setSaving(true)
    try {
      await api.put(`/admin/companies/${companyId}/users/${user._id}/reset-password`, { newPassword: password })
      toast.success(`Senha de ${user.name} redefinida`)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao redefinir senha')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: '#1a1a1f', border: '1px solid #2e2e35' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold" style={{ color: '#e0e0ec' }}>Redefinir Senha</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: '#5c5c6b' }}><X size={16} /></button>
        </div>
        <p className="text-sm mb-4" style={{ color: '#8a8a9a' }}>
          Nova senha para <strong style={{ color: '#e0e0ec' }}>{user.name}</strong>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Nova senha (mín. 8 caracteres)" style={inputSt(false)} />
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm"
              style={{ background: '#2e2e35', color: '#b8b8c8' }}>Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea6c10)', color: 'white', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Salvando...' : 'Redefinir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal: criar usuário na empresa ───
const CreateUserModal = ({ company, onClose, onSuccess }) => {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee' })
  const [saving, setSaving] = useState(false)
  const set = f => e => setForm(d => ({ ...d, [f]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Nome obrigatório')
    if (!form.email.trim()) return toast.error('E-mail obrigatório')
    if (form.password.length < 8) return toast.error('Senha mínima de 8 caracteres')
    setSaving(true)
    try {
      await api.post(`/admin/companies/${company._id}/users`, form)
      toast.success('Usuário criado com sucesso!')
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao criar usuário')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: '#1a1a1f', border: '1px solid #2e2e35' }}>
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #2e2e35' }}>
          <div>
            <h3 className="text-base font-bold" style={{ color: '#e0e0ec' }}>Novo Usuário</h3>
            <p className="text-xs mt-0.5" style={{ color: '#5c5c6b' }}>{company.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: '#5c5c6b' }}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#b8b8c8' }}>Nome *</label>
            <input value={form.name} onChange={set('name')} placeholder="Nome completo" style={inputSt(false)} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#b8b8c8' }}>E-mail *</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="usuario@email.com" style={inputSt(false)} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#b8b8c8' }}>Senha * (mín. 8 caracteres)</label>
            <input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" style={inputSt(false)} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#b8b8c8' }}>Perfil</label>
            <select value={form.role} onChange={set('role')} style={inputSt(false)}>
              <option value="employee">Funcionário</option>
              <option value="owner">Proprietário</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm"
              style={{ background: '#2e2e35', color: '#b8b8c8' }}>Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea6c10)', color: 'white', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Criando...' : 'Criar Usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Painel lateral de detalhes da empresa ───
const CompanyPanel = ({ company, plans, onClose, onRefresh }) => {
  const [tab, setTab] = useState('detalhes')
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [resetUser, setResetUser] = useState(null)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [addMonths, setAddMonths] = useState('')
  const [savingMonths, setSavingMonths] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({
    name: company.name, email: company.email,
    phone: company.phone || '', cnpj: company.cnpj || '',
    planId: company.plan?._id || '',
  })
  const [savingEdit, setSavingEdit] = useState(false)

  const fmtDate = d => new Date(d).toLocaleDateString('pt-BR')
  const isExpired = d => new Date(d) < new Date()

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const res = await api.get(`/admin/companies/${company._id}/users`)
      setUsers(res.data.data.users)
    } catch { toast.error('Erro ao carregar usuários') }
    finally { setLoadingUsers(false) }
  }, [company._id])

  useEffect(() => { if (tab === 'usuarios') loadUsers() }, [tab, loadUsers])

  const handleExtendPlan = async () => {
    if (!addMonths || Number(addMonths) < 1) return toast.error('Informe quantos meses')
    setSavingMonths(true)
    try {
      await api.put(`/admin/companies/${company._id}`, { addMonths: Number(addMonths) })
      toast.success(`Plano estendido por ${addMonths} mês(es)`)
      setAddMonths('')
      onRefresh()
    } catch { toast.error('Erro ao estender plano') }
    finally { setSavingMonths(false) }
  }

  const handleSaveEdit = async () => {
    setSavingEdit(true)
    try {
      await api.put(`/admin/companies/${company._id}`, {
        name: editData.name, email: editData.email,
        phone: editData.phone, cnpj: editData.cnpj, planId: editData.planId,
      })
      toast.success('Empresa atualizada')
      setEditMode(false)
      onRefresh()
    } catch (err) { toast.error(err.response?.data?.message || 'Erro ao salvar') }
    finally { setSavingEdit(false) }
  }

  const handleToggleStatus = async () => {
    try {
      await api.put(`/admin/companies/${company._id}`, { isActive: !company.isActive })
      toast.success(`Empresa ${company.isActive ? 'desativada' : 'ativada'}`)
      onRefresh()
    } catch { toast.error('Erro ao alterar status') }
  }

  const handleToggleUser = async (u) => {
    try {
      const res = await api.put(`/admin/companies/${company._id}/users/${u._id}/status`)
      const updated = res.data.data.isActive
      toast.success(`Usuário ${updated ? 'ativado' : 'desativado'}`)
      setUsers(prev => prev.map(x => x._id === u._id ? { ...x, isActive: updated } : x))
    } catch { toast.error('Erro ao alterar status do usuário') }
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden"
        style={{ width: '100%', maxWidth: 480, background: '#1a1a1f', borderLeft: '1px solid #2e2e35' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #2e2e35' }}>
          <div className="min-w-0">
            <h2 className="text-base font-bold truncate" style={{ color: '#e0e0ec' }}>{company.name}</h2>
            <p className="text-xs mt-0.5 truncate" style={{ color: '#5c5c6b' }}>{company.email}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl flex-shrink-0 ml-3"
            style={{ background: '#2e2e35', color: '#8a8a9a' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-4 gap-2">
          {[['detalhes', 'Detalhes'], ['usuarios', 'Usuários']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className="px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: tab === key ? 'rgba(249,115,22,0.18)' : '#242429', color: tab === key ? '#f97316' : '#8a8a9a' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* ── ABA DETALHES ── */}
          {tab === 'detalhes' && (
            <>
              {/* Badges de status */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
                  style={{ background: company.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: company.isActive ? '#22c55e' : '#ef4444' }}>
                  {company.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                  {company.isActive ? 'Ativa' : 'Inativa'}
                </span>
                <span className="text-xs px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316' }}>
                  {company.plan?.name ?? '—'}
                </span>
                {isExpired(company.planExpiresAt) && (
                  <span className="text-xs px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                    Plano vencido
                  </span>
                )}
              </div>

              {/* Formulário de edição */}
              {editMode ? (
                <div className="rounded-2xl p-4 space-y-3" style={{ background: '#242429', border: '1px solid #3d3d47' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#f97316' }}>Editar Empresa</p>
                  {[['Nome', 'name', 'text'], ['E-mail', 'email', 'email'], ['Telefone', 'phone', 'text'], ['CNPJ', 'cnpj', 'text']].map(([lbl, f, t]) => (
                    <div key={f}>
                      <label className="block text-xs mb-1" style={{ color: '#8a8a9a' }}>{lbl}</label>
                      <input type={t} value={editData[f]} onChange={e => setEditData(d => ({ ...d, [f]: e.target.value }))}
                        style={{ ...inputSt(false), padding: '8px 12px', fontSize: 13 }} />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs mb-1" style={{ color: '#8a8a9a' }}>Plano</label>
                    <select value={editData.planId} onChange={e => setEditData(d => ({ ...d, planId: e.target.value }))}
                      style={{ ...inputSt(false), padding: '8px 12px', fontSize: 13 }}>
                      <option value="">Selecione...</option>
                      {plans.map(p => <option key={p._id} value={p._id}>{p.name} — R$ {p.price.toFixed(2).replace('.', ',')}/mês</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setEditMode(false)} className="flex-1 py-2 rounded-xl text-sm"
                      style={{ background: '#3d3d47', color: '#b8b8c8' }}>Cancelar</button>
                    <button onClick={handleSaveEdit} disabled={savingEdit} className="flex-1 py-2 rounded-xl text-sm font-semibold"
                      style={{ background: 'linear-gradient(135deg, #f97316, #ea6c10)', color: 'white', opacity: savingEdit ? 0.7 : 1 }}>
                      {savingEdit ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl p-4 space-y-2.5" style={{ background: '#242429', border: '1px solid #3d3d47' }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#5c5c6b' }}>Informações</p>
                    <button onClick={() => setEditMode(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: '#3d3d47', color: '#b8b8c8' }}>
                      <Pencil size={12} /> Editar
                    </button>
                  </div>
                  {[
                    ['Telefone', company.phone || '—'],
                    ['CNPJ', company.cnpj || '—'],
                    ['Usuários', `${company.userCount} / ${company.plan?.maxUsers === -1 ? '∞' : (company.plan?.maxUsers ?? '—')}`],
                    ['Plano vence em', fmtDate(company.planExpiresAt)],
                    ['Cadastrado em', fmtDate(company.createdAt)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: '#8a8a9a' }}>{label}</span>
                      <span className="text-xs font-medium" style={{ color: '#e0e0ec' }}>{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Estender plano */}
              <div className="rounded-2xl p-4" style={{ background: '#242429', border: '1px solid #3d3d47' }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#5c5c6b' }}>
                  Estender Plano
                </p>
                <div className="flex gap-2">
                  <input type="number" min="1" max="36" value={addMonths} onChange={e => setAddMonths(e.target.value)}
                    placeholder="Qtd. de meses"
                    style={{ ...inputSt(false), padding: '8px 12px', fontSize: 13, flex: 1 }} />
                  <button onClick={handleExtendPlan} disabled={savingMonths}
                    className="px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #f97316, #ea6c10)', color: 'white', opacity: savingMonths ? 0.7 : 1 }}>
                    {savingMonths ? '...' : 'Adicionar'}
                  </button>
                </div>
                <p className="text-xs mt-2" style={{ color: '#5c5c6b' }}>
                  Vence em: <span style={{ color: isExpired(company.planExpiresAt) ? '#ef4444' : '#8a8a9a' }}>{fmtDate(company.planExpiresAt)}</span>
                </p>
              </div>

              {/* Ativar / Desativar empresa */}
              <button onClick={handleToggleStatus} className="w-full py-3 rounded-xl text-sm font-semibold"
                style={{
                  background: company.isActive ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                  color: company.isActive ? '#ef4444' : '#22c55e',
                  border: `1px solid ${company.isActive ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`,
                }}>
                {company.isActive ? 'Desativar Empresa' : 'Ativar Empresa'}
              </button>
            </>
          )}

          {/* ── ABA USUÁRIOS ── */}
          {tab === 'usuarios' && (
            <>
              <button onClick={() => setShowCreateUser(true)}
                className="flex items-center gap-2 w-full py-3 rounded-xl text-sm font-semibold justify-center"
                style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)' }}>
                <UserPlus size={16} /> Adicionar Usuário
              </button>

              {loadingUsers ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-7 h-7 border-4 rounded-full animate-spin"
                    style={{ borderColor: '#3d3d47', borderTopColor: '#f97316' }} />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-12">
                  <Users size={32} className="mx-auto mb-3" style={{ color: '#3d3d47' }} />
                  <p className="text-sm" style={{ color: '#8a8a9a' }}>Nenhum usuário encontrado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {users.map(u => (
                    <div key={u._id} className="rounded-2xl p-4" style={{ background: '#242429', border: '1px solid #3d3d47' }}>
                      {/* Linha principal */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{ background: 'rgba(249,115,22,0.2)', color: '#f97316' }}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium" style={{ color: '#e0e0ec' }}>{u.name}</p>
                            {!u.isActive && (
                              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                                Inativo
                              </span>
                            )}
                          </div>
                          <p className="text-xs truncate" style={{ color: '#5c5c6b' }}>{u.email}</p>
                          <p className="text-xs" style={{ color: u.role === 'owner' ? '#f97316' : '#8a8a9a' }}>
                            {u.role === 'owner' ? 'Proprietário' : 'Funcionário'}
                          </p>
                        </div>
                      </div>
                      {/* Ações */}
                      <div className="flex gap-2">
                        <button onClick={() => setResetUser(u)}
                          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl flex-1 justify-center"
                          style={{ background: 'rgba(249,115,22,0.1)', color: '#f97316', border: '1px solid rgba(249,115,22,0.15)' }}>
                          <KeyRound size={13} /> Redefinir Senha
                        </button>
                        <button onClick={() => handleToggleUser(u)}
                          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl flex-1 justify-center"
                          style={{
                            background: u.isActive ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                            color: u.isActive ? '#ef4444' : '#22c55e',
                            border: `1px solid ${u.isActive ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'}`,
                          }}>
                          {u.isActive ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                          {u.isActive ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {resetUser && (
        <ResetPasswordModal user={resetUser} companyId={company._id} onClose={() => setResetUser(null)} />
      )}
      {showCreateUser && (
        <CreateUserModal company={company} onClose={() => setShowCreateUser(false)} onSuccess={loadUsers} />
      )}
    </>
  )
}

// ─── Página principal ───
const AdminCompaniesPage = () => {
  const [companies, setCompanies] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('') // '' | 'active' | 'inactive'
  const [planFilter, setPlanFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 10 })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      if (planFilter) params.set('plan', planFilter)

      const [companiesRes, plansRes] = await Promise.all([
        api.get(`/admin/companies?${params}`),
        api.get('/admin/plans'),
      ])
      setCompanies(companiesRes.data.data.companies)
      setTotalPages(companiesRes.data.data.pages)
      setTotalCount(companiesRes.data.data.total)
      setPlans(plansRes.data.data.plans)
    } catch {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, planFilter, page])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRefresh = useCallback(async () => {
    await fetchData()
    // Atualiza empresa aberta se existir
    if (selectedCompany) {
      try {
        const res = await api.get(`/admin/companies?search=&page=1&limit=200`)
        const updated = res.data.data.companies.find(c => c._id === selectedCompany._id)
        if (updated) setSelectedCompany(updated)
      } catch { /* silencia */ }
    }
  }, [fetchData, selectedCompany])

  // ─── Exportar CSV ───
  const handleExportCSV = async () => {
    try {
      toast.loading('Gerando CSV...')
      const res = await api.get('/admin/companies?page=1&limit=9999')
      const all = res.data.data.companies
      const header = ['Nome', 'E-mail', 'Telefone', 'CNPJ', 'Plano', 'Usuários', 'Status', 'Vencimento', 'Cadastro']
      const rows = all.map(c => [
        c.name,
        c.email,
        c.phone || '',
        c.cnpj || '',
        c.plan?.name || '',
        c.userCount,
        c.isActive ? 'Ativa' : 'Inativa',
        new Date(c.planExpiresAt).toLocaleDateString('pt-BR'),
        new Date(c.createdAt).toLocaleDateString('pt-BR'),
      ])
      const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `empresas_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.dismiss()
      toast.success('CSV gerado com sucesso!')
    } catch {
      toast.dismiss()
      toast.error('Erro ao gerar CSV')
    }
  }

  const fmtDate = d => new Date(d).toLocaleDateString('pt-BR')
  const isExpired = d => new Date(d) < new Date()

  const statusBtns = [
    { value: '', label: 'Todas' },
    { value: 'active', label: 'Ativas' },
    { value: 'inactive', label: 'Inativas' },
  ]

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold" style={{ color: '#e0e0ec' }}>Empresas</h2>
          <p className="text-sm mt-0.5" style={{ color: '#8a8a9a' }}>
            {totalCount} empresa{totalCount !== 1 ? 's' : ''} cadastrada{totalCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: '#1a1a1f', border: '1px solid #2e2e35', color: '#b8b8c8' }}>
            <Download size={15} /> Exportar CSV
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, #f97316, #ea6c10)', color: 'white' }}>
            <Plus size={15} /> Nova Empresa
          </button>
        </div>
      </div>

      {/* Busca */}
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#5c5c6b' }} />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Buscar por nome ou e-mail..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: '#1a1a1f', border: '1px solid #2e2e35', color: '#e0e0ec' }} />
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        {/* Status */}
        <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid #2e2e35' }}>
          {statusBtns.map(b => (
            <button key={b.value} onClick={() => { setStatusFilter(b.value); setPage(1) }}
              className="px-3 py-2 text-xs font-medium transition-all"
              style={{
                background: statusFilter === b.value ? 'rgba(249,115,22,0.18)' : '#1a1a1f',
                color: statusFilter === b.value ? '#f97316' : '#8a8a9a',
              }}>
              {b.label}
            </button>
          ))}
        </div>

        {/* Plano */}
        <select value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 rounded-xl text-xs outline-none"
          style={{ background: '#1a1a1f', border: '1px solid #2e2e35', color: planFilter ? '#f97316' : '#8a8a9a' }}>
          <option value="">Todos os planos</option>
          {plans.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>

        {/* Limpar filtros */}
        {(statusFilter || planFilter || search) && (
          <button onClick={() => { setStatusFilter(''); setPlanFilter(''); setSearch(''); setPage(1) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
            <X size={12} /> Limpar filtros
          </button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 rounded-full animate-spin"
            style={{ borderColor: '#3d3d47', borderTopColor: '#f97316' }} />
        </div>
      ) : companies.length === 0 ? (
        <div className="rounded-2xl text-center py-14" style={{ background: '#1a1a1f', border: '1px solid #2e2e35' }}>
          <Building2 size={36} className="mx-auto mb-3" style={{ color: '#3d3d47' }} />
          <p style={{ color: '#8a8a9a' }}>Nenhuma empresa encontrada</p>
        </div>
      ) : (
        <>
          {/* Tabela desktop */}
          <div className="hidden md:block rounded-2xl overflow-hidden" style={{ background: '#1a1a1f', border: '1px solid #2e2e35' }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid #2e2e35' }}>
                    {['Empresa', 'Plano', 'Usuários', 'Vence em', 'Status', ''].map((h, i) => (
                      <th key={i} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                        style={{ color: '#5c5c6b' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {companies.map(c => (
                    <tr key={c._id} className="cursor-pointer" style={{ borderBottom: '1px solid #2e2e35' }}
                      onClick={() => setSelectedCompany(c)}
                      onMouseEnter={e => e.currentTarget.style.background = '#242429'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium" style={{ color: '#e0e0ec' }}>{c.name}</p>
                        <p className="text-xs" style={{ color: '#5c5c6b' }}>{c.email}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs px-2 py-1 rounded-full"
                          style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>
                          {c.plan?.name ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: '#b8b8c8' }}>
                        {c.userCount} / {c.plan?.maxUsers === -1 ? '∞' : c.plan?.maxUsers}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs" style={{ color: isExpired(c.planExpiresAt) ? '#ef4444' : '#8a8a9a' }}>
                          {fmtDate(c.planExpiresAt)}{isExpired(c.planExpiresAt) && ' ⚠'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="flex items-center gap-1.5 text-xs"
                          style={{ color: c.isActive ? '#22c55e' : '#ef4444' }}>
                          {c.isActive ? <CheckCircle size={13} /> : <XCircle size={13} />}
                          {c.isActive ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Arrow size={15} style={{ color: '#5c5c6b' }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cartões mobile */}
          <div className="md:hidden space-y-3">
            {companies.map(c => (
              <div key={c._id} className="rounded-xl p-4 cursor-pointer"
                style={{ background: '#1a1a1f', border: '1px solid #2e2e35' }}
                onClick={() => setSelectedCompany(c)}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#e0e0ec' }}>{c.name}</p>
                    <p className="text-xs truncate" style={{ color: '#5c5c6b' }}>{c.email}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full flex-shrink-0"
                    style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>
                    {c.plan?.name ?? '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs" style={{ color: c.isActive ? '#22c55e' : '#ef4444' }}>
                      {c.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {c.isActive ? 'Ativa' : 'Inativa'}
                    </span>
                    <span className="text-xs" style={{ color: isExpired(c.planExpiresAt) ? '#ef4444' : '#8a8a9a' }}>
                      Vence {fmtDate(c.planExpiresAt)}
                    </span>
                  </div>
                  <Arrow size={15} style={{ color: '#5c5c6b' }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-lg" style={{ background: '#1a1a1f', color: page === 1 ? '#3d3d47' : '#e0e0ec' }}>
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm" style={{ color: '#8a8a9a' }}>Página {page} de {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="p-2 rounded-lg" style={{ background: '#1a1a1f', color: page === totalPages ? '#3d3d47' : '#e0e0ec' }}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {showModal && <CreateCompanyModal plans={plans} onClose={() => setShowModal(false)} onSuccess={fetchData} />}
      {selectedCompany && (
        <CompanyPanel company={selectedCompany} plans={plans}
          onClose={() => setSelectedCompany(null)} onRefresh={handleRefresh} />
      )}
    </div>
  )
}

export default AdminCompaniesPage
