import { useEffect, useState } from 'react'
import { Plus, Search, Building2, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import api from '../../services/api'

// ─── Validação do formulário de criação ───
const schema = z.object({
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

// ─── Campo de input reutilizável ───
const Field = ({ label, error, children }) => (
  <div>
    <label className="block text-sm font-medium mb-1.5" style={{ color: '#b8b8c8' }}>{label}</label>
    {children}
    {error && <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>{error}</p>}
  </div>
)

const inputStyle = (hasError) => ({
  background: '#242429',
  border: `1px solid ${hasError ? '#ef4444' : '#3d3d47'}`,
  color: '#e0e0ec',
  borderRadius: 12,
  padding: '10px 14px',
  fontSize: 14,
  width: '100%',
  outline: 'none',
})

// ─── Modal de criação de empresa ───
const CreateModal = ({ onClose, plans, onSuccess }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-y-auto max-h-screen" style={{ background: '#1a1a1f', border: '1px solid #2e2e35' }}>
        <div className="p-6" style={{ borderBottom: '1px solid #2e2e35' }}>
          <h2 className="text-lg font-bold" style={{ color: '#e0e0ec' }}>Nova Empresa</h2>
          <p className="text-sm mt-1" style={{ color: '#8a8a9a' }}>Preencha os dados da serralheria e do responsável</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#f97316' }}>Dados da Empresa</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome da empresa *" error={errors.name?.message}>
              <input {...register('name')} style={inputStyle(errors.name)} placeholder="Ex: Serralheria Silva" />
            </Field>
            <Field label="E-mail *" error={errors.email?.message}>
              <input {...register('email')} type="email" style={inputStyle(errors.email)} placeholder="empresa@email.com" />
            </Field>
            <Field label="Telefone" error={errors.phone?.message}>
              <input {...register('phone')} style={inputStyle(errors.phone)} placeholder="(11) 99999-9999" />
            </Field>
            <Field label="CNPJ" error={errors.cnpj?.message}>
              <input {...register('cnpj')} style={inputStyle(errors.cnpj)} placeholder="00.000.000/0001-00" />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Plano *" error={errors.planId?.message}>
              <select {...register('planId')} style={inputStyle(errors.planId)}>
                <option value="">Selecione...</option>
                {plans.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} — R$ {p.price.toFixed(2).replace('.', ',')}/mês
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Duração (meses) *" error={errors.durationMonths?.message}>
              <input {...register('durationMonths')} type="number" min="1" max="36" style={inputStyle(errors.durationMonths)} />
            </Field>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider pt-2" style={{ color: '#f97316' }}>Responsável / Dono</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome do responsável *" error={errors.ownerName?.message}>
              <input {...register('ownerName')} style={inputStyle(errors.ownerName)} placeholder="João da Silva" />
            </Field>
            <Field label="E-mail do responsável *" error={errors.ownerEmail?.message}>
              <input {...register('ownerEmail')} type="email" style={inputStyle(errors.ownerEmail)} placeholder="joao@email.com" />
            </Field>
            <Field label="Senha de acesso *" error={errors.ownerPassword?.message}>
              <input {...register('ownerPassword')} type="password" style={inputStyle(errors.ownerPassword)} placeholder="Mín. 8 caracteres" />
            </Field>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-medium"
              style={{ background: '#2e2e35', color: '#b8b8c8' }}>
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea6c10)', color: 'white', opacity: isSubmitting ? 0.7 : 1 }}>
              {isSubmitting ? 'Salvando...' : 'Criar Empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Página principal ───
const AdminCompaniesPage = () => {
  const [companies, setCompanies] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [companiesRes, plansRes] = await Promise.all([
        api.get(`/admin/companies?search=${search}&page=${page}&limit=10`),
        api.get('/admin/plans'),
      ])
      setCompanies(companiesRes.data.data.companies)
      setTotalPages(companiesRes.data.data.pages)
      setPlans(plansRes.data.data.plans)
    } catch {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [search, page])

  const toggleStatus = async (company) => {
    try {
      await api.put(`/admin/companies/${company._id}`, { isActive: !company.isActive })
      toast.success(`Empresa ${company.isActive ? 'desativada' : 'ativada'} com sucesso`)
      fetchData()
    } catch {
      toast.error('Erro ao alterar status')
    }
  }

  const formatDate = (date) => new Date(date).toLocaleDateString('pt-BR')
  const isExpired = (date) => new Date(date) < new Date()

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold" style={{ color: '#e0e0ec' }}>Empresas</h2>
          <p className="text-sm mt-0.5" style={{ color: '#8a8a9a' }}>Gerencie as serralherias cadastradas</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #f97316, #ea6c10)', color: 'white' }}>
          <Plus size={15} /> Nova Empresa
        </button>
      </div>

      {/* Busca */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#5c5c6b' }} />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Buscar por nome ou e-mail..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: '#1a1a1f', border: '1px solid #2e2e35', color: '#e0e0ec' }} />
      </div>

      {/* Lista — tabela no desktop, cartões no mobile */}
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
          {/* Tabela — só aparece em telas md+ */}
          <div className="hidden md:block rounded-2xl overflow-hidden" style={{ background: '#1a1a1f', border: '1px solid #2e2e35' }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid #2e2e35' }}>
                    {['Empresa', 'Plano', 'Usuários', 'Vence em', 'Status', 'Ações'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                        style={{ color: '#5c5c6b' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c._id} style={{ borderBottom: '1px solid #2e2e35' }}
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
                          {formatDate(c.planExpiresAt)}
                          {isExpired(c.planExpiresAt) && ' ⚠'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="flex items-center gap-1.5 text-xs"
                          style={{ color: c.isActive ? '#22c55e' : '#ef4444' }}>
                          {c.isActive ? <CheckCircle size={13} /> : <XCircle size={13} />}
                          {c.isActive ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button onClick={() => toggleStatus(c)}
                          className="text-xs px-3 py-1.5 rounded-lg"
                          style={{ background: c.isActive ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: c.isActive ? '#ef4444' : '#22c55e' }}>
                          {c.isActive ? 'Desativar' : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cartões — só aparecem no mobile */}
          <div className="md:hidden space-y-3">
            {companies.map((c) => (
              <div key={c._id} className="rounded-xl p-4" style={{ background: '#1a1a1f', border: '1px solid #2e2e35' }}>
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
                      Vence {formatDate(c.planExpiresAt)}
                    </span>
                  </div>
                  <button onClick={() => toggleStatus(c)}
                    className="text-xs px-3 py-1.5 rounded-lg"
                    style={{ background: c.isActive ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: c.isActive ? '#ef4444' : '#22c55e' }}>
                    {c.isActive ? 'Desativar' : 'Ativar'}
                  </button>
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

      {showModal && (
        <CreateModal plans={plans} onClose={() => setShowModal(false)} onSuccess={fetchData} />
      )}
    </div>
  )
}

export default AdminCompaniesPage
