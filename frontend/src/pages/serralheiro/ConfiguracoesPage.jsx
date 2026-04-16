import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Building2, User, Lock, Save, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

const inp = (err) => ({
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

const SectionTitle = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: 'rgba(249,115,22,0.15)' }}>
      <Icon size={20} style={{ color: '#f97316' }} />
    </div>
    <div>
      <h2 className="text-base font-bold" style={{ color: 'var(--c-tx0)' }}>{title}</h2>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--c-tx3)' }}>{subtitle}</p>}
    </div>
  </div>
)

// ─── Seção: Dados da Empresa ───────────────────────────────────────────────────
const CompanySection = () => {
  const [company, setCompany] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', phone: '', cnpj: '',
    address: { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zipCode: '' },
  })

  useEffect(() => {
    api.get('/s/company').then(r => {
      const c = r.data.data.company
      setCompany(c)
      setForm({
        name: c.name ?? '',
        phone: c.phone ?? '',
        cnpj: c.cnpj ?? '',
        address: {
          street: c.address?.street ?? '',
          number: c.address?.number ?? '',
          complement: c.address?.complement ?? '',
          neighborhood: c.address?.neighborhood ?? '',
          city: c.address?.city ?? '',
          state: c.address?.state ?? '',
          zipCode: c.address?.zipCode ?? '',
        },
      })
    }).catch(() => toast.error('Erro ao carregar dados da empresa'))
  }, [])

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))
  const setAddr = (field, val) => setForm(f => ({ ...f, address: { ...f.address, [field]: val } }))

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Nome da empresa é obrigatório')
    setSaving(true)
    try {
      await api.put('/s/company', form)
      toast.success('Empresa atualizada com sucesso!')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (!company) return (
    <div className="flex justify-center py-10">
      <div className="w-7 h-7 border-4 rounded-full animate-spin"
        style={{ borderColor: 'var(--c-bd1)', borderTopColor: '#f97316' }} />
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Field label="Nome da Empresa *">
            <input value={form.name} onChange={e => set('name', e.target.value)} style={inp()} />
          </Field>
        </div>
        <Field label="CNPJ">
          <input value={form.cnpj} onChange={e => set('cnpj', e.target.value)}
            style={inp()} placeholder="00.000.000/0001-00" />
        </Field>
        <Field label="Telefone">
          <input value={form.phone} onChange={e => set('phone', e.target.value)}
            style={inp()} placeholder="(11) 99999-9999" />
        </Field>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wider pt-2" style={{ color: 'var(--c-tx3)' }}>
        Endereço
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Field label="Rua / Avenida">
            <input value={form.address.street} onChange={e => setAddr('street', e.target.value)}
              style={inp()} placeholder="Rua das Flores" />
          </Field>
        </div>
        <Field label="Número">
          <input value={form.address.number} onChange={e => setAddr('number', e.target.value)}
            style={inp()} placeholder="123" />
        </Field>
        <Field label="Complemento">
          <input value={form.address.complement} onChange={e => setAddr('complement', e.target.value)}
            style={inp()} placeholder="Sala 2, Galpão..." />
        </Field>
        <Field label="Bairro">
          <input value={form.address.neighborhood} onChange={e => setAddr('neighborhood', e.target.value)}
            style={inp()} placeholder="Centro" />
        </Field>
        <Field label="CEP">
          <input value={form.address.zipCode} onChange={e => setAddr('zipCode', e.target.value)}
            style={inp()} placeholder="00000-000" />
        </Field>
        <Field label="Cidade">
          <input value={form.address.city} onChange={e => setAddr('city', e.target.value)}
            style={inp()} placeholder="São Paulo" />
        </Field>
        <Field label="Estado">
          <select value={form.address.state} onChange={e => setAddr('state', e.target.value)} style={inp()}>
            <option value="">Selecione...</option>
            {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(s =>
              <option key={s} value={s}>{s}</option>
            )}
          </select>
        </Field>
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg, #f97316, #ea6c10)', color: 'white', opacity: saving ? 0.7 : 1 }}>
          <Save size={15} /> {saving ? 'Salvando...' : 'Salvar Empresa'}
        </button>
      </div>

      {/* Plano ativo */}
      {company.plan && (
        <div className="rounded-xl p-4 mt-2" style={{ background: 'var(--c-bg2)', border: '1px solid var(--c-bd0)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--c-tx3)' }}>Plano Ativo</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-bold" style={{ color: '#f97316' }}>{company.plan.name}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--c-tx2)' }}>
                {company.plan.maxUsers === -1 ? 'Usuários ilimitados' : `Até ${company.plan.maxUsers} usuário(s)`}
                {' · '}Expira em {new Date(company.planExpiresAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <p className="text-lg font-bold" style={{ color: 'var(--c-tx0)' }}>
              {(company.plan.price ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Seção: Perfil do Usuário ──────────────────────────────────────────────────
const ProfileSection = () => {
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '' })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const handleSave = async () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Nome obrigatório'
    if (!form.email.trim()) errs.email = 'E-mail obrigatório'
    if (Object.keys(errs).length) return setErrors(errs)
    setErrors({})
    setSaving(true)
    try {
      const res = await api.put('/s/profile', form)
      updateUser({ name: res.data.data.user.name, email: res.data.data.user.email })
      toast.success('Perfil atualizado!')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erro ao salvar perfil')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nome *" error={errors.name}>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            style={inp(errors.name)} placeholder="Seu nome" />
        </Field>
        <Field label="E-mail *" error={errors.email}>
          <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            style={inp(errors.email)} placeholder="email@exemplo.com" type="email" />
        </Field>
      </div>
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg, #f97316, #ea6c10)', color: 'white', opacity: saving ? 0.7 : 1 }}>
          <Save size={15} /> {saving ? 'Salvando...' : 'Salvar Perfil'}
        </button>
      </div>
    </div>
  )
}

// ─── Seção: Alterar Senha ──────────────────────────────────────────────────────
const PasswordSection = () => {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const handleSave = async () => {
    const errs = {}
    if (!form.currentPassword) errs.currentPassword = 'Informe a senha atual'
    if (!form.newPassword || form.newPassword.length < 8) errs.newPassword = 'Mínimo de 8 caracteres'
    if (form.newPassword !== form.confirmPassword) errs.confirmPassword = 'As senhas não coincidem'
    if (Object.keys(errs).length) return setErrors(errs)
    setErrors({})
    setSaving(true)
    try {
      await api.put('/s/profile/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
      toast.success('Senha alterada com sucesso!')
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erro ao trocar senha')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Field label="Senha Atual *" error={errors.currentPassword}>
            <input value={form.currentPassword} onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
              type="password" style={inp(errors.currentPassword)} placeholder="••••••••" />
          </Field>
        </div>
        <Field label="Nova Senha *" error={errors.newPassword}>
          <input value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
            type="password" style={inp(errors.newPassword)} placeholder="Mínimo 8 caracteres" />
        </Field>
        <Field label="Confirmar Nova Senha *" error={errors.confirmPassword}>
          <input value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
            type="password" style={inp(errors.confirmPassword)} placeholder="Repita a nova senha" />
        </Field>
      </div>
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg, #f97316, #ea6c10)', color: 'white', opacity: saving ? 0.7 : 1 }}>
          <Lock size={15} /> {saving ? 'Salvando...' : 'Alterar Senha'}
        </button>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
const TABS = [
  { id: 'empresa', label: 'Dados da Empresa', icon: Building2, ownerOnly: true },
  { id: 'perfil', label: 'Meu Perfil', icon: User },
  { id: 'senha', label: 'Alterar Senha', icon: Lock },
]

const ConfiguracoesPage = () => {
  const { user } = useAuth()
  const [tab, setTab] = useState(user?.role === 'owner' ? 'empresa' : 'perfil')

  const tabs = TABS.filter(t => !t.ownerOnly || user?.role === 'owner')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--c-tx0)' }}>Configurações</h1>
        <p className="text-base mt-1" style={{ color: 'var(--c-tx2)' }}>Gerencie os dados da empresa e do seu perfil</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Menu lateral */}
        <aside className="lg:w-56 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: tab === id ? 'rgba(249,115,22,0.12)' : 'var(--c-bg1)',
                  color: tab === id ? '#f97316' : 'var(--c-tx2)',
                  border: `1px solid ${tab === id ? 'rgba(249,115,22,0.3)' : 'var(--c-bd0)'}`,
                }}>
                <div className="flex items-center gap-3">
                  <Icon size={16} />
                  {label}
                </div>
                {tab === id && <ChevronRight size={14} />}
              </button>
            ))}
          </nav>
        </aside>

        {/* Conteúdo */}
        <div className="flex-1 rounded-2xl p-6" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
          {tab === 'empresa' && (
            <>
              <SectionTitle icon={Building2} title="Dados da Empresa"
                subtitle="Essas informações aparecem nos PDFs de orçamento" />
              <CompanySection />
            </>
          )}
          {tab === 'perfil' && (
            <>
              <SectionTitle icon={User} title="Meu Perfil" subtitle="Atualize seu nome e e-mail de acesso" />
              <ProfileSection />
            </>
          )}
          {tab === 'senha' && (
            <>
              <SectionTitle icon={Lock} title="Alterar Senha"
                subtitle="Use uma senha forte com ao menos 8 caracteres" />
              <PasswordSection />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ConfiguracoesPage
