import { useEffect, useState } from 'react'
import useAutoRefresh from '../../hooks/useAutoRefresh'
import { Plus, Search, Users, Phone, Mail, Pencil, Trash2, Download, MessageCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import api from '../../services/api'

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  type: z.enum(['pessoa_fisica', 'pessoa_juridica']),
  cpfCnpj: z.string().optional(),
  email: z.email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  phone2: z.string().optional(),
  notes: z.string().optional(),
  'address.street': z.string().optional(),
  'address.number': z.string().optional(),
  'address.neighborhood': z.string().optional(),
  'address.city': z.string().optional(),
  'address.state': z.string().optional(),
  'address.zipCode': z.string().optional(),
})

const Field = ({ label, error, children }) => (
  <div>
    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--c-tx1)' }}>{label}</label>
    {children}
    {error && <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>{error}</p>}
  </div>
)

const inp = (err) => ({
  background: 'var(--c-bg2)',
  border: `1px solid ${err ? '#ef4444' : 'var(--c-bd1)'}`,
  color: 'var(--c-tx0)', borderRadius: 10, padding: '9px 12px', fontSize: 13, width: '100%', outline: 'none',
})

const ClientModal = ({ client, onClose, onSuccess }) => {
  const isEdit = !!client
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: isEdit ? {
      ...client,
      'address.street': client.address?.street,
      'address.number': client.address?.number,
      'address.neighborhood': client.address?.neighborhood,
      'address.city': client.address?.city,
      'address.state': client.address?.state,
      'address.zipCode': client.address?.zipCode,
    } : { type: 'pessoa_fisica' },
  })

  const onSubmit = async (data) => {
    // Reorganiza endereço
    const payload = {
      name: data.name, type: data.type, cpfCnpj: data.cpfCnpj,
      email: data.email, phone: data.phone, phone2: data.phone2, notes: data.notes,
      address: {
        street: data['address.street'], number: data['address.number'],
        neighborhood: data['address.neighborhood'], city: data['address.city'],
        state: data['address.state'], zipCode: data['address.zipCode'],
      },
    }
    try {
      if (isEdit) {
        await api.put(`/s/clients/${client._id}`, payload)
        toast.success('Cliente atualizado!')
      } else {
        await api.post('/s/clients', payload)
        toast.success('Cliente cadastrado!')
      }
      onSuccess()
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erro ao salvar cliente')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-xl rounded-2xl my-4" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
        <div className="p-5" style={{ borderBottom: '1px solid var(--c-bd0)' }}>
          <h2 className="text-base font-bold" style={{ color: 'var(--c-tx0)' }}>
            {isEdit ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nome *" error={errors.name?.message}>
              <input {...register('name')} style={inp(errors.name)} placeholder="Nome completo ou razão social" />
            </Field>
            <Field label="Tipo">
              <select {...register('type')} style={inp()}>
                <option value="pessoa_fisica">Pessoa Física</option>
                <option value="pessoa_juridica">Pessoa Jurídica</option>
              </select>
            </Field>
            <Field label="CPF / CNPJ">
              <input {...register('cpfCnpj')} style={inp()} placeholder="000.000.000-00" />
            </Field>
            <Field label="E-mail" error={errors.email?.message}>
              <input {...register('email')} type="email" style={inp(errors.email)} placeholder="email@exemplo.com" />
            </Field>
            <Field label="Telefone">
              <input {...register('phone')} style={inp()} placeholder="(11) 99999-9999" />
            </Field>
            <Field label="Telefone 2">
              <input {...register('phone2')} style={inp()} placeholder="(11) 99999-9999" />
            </Field>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider pt-1" style={{ color: '#f97316' }}>Endereço</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Field label="Rua / Avenida">
                <input {...register('address.street')} style={inp()} placeholder="Nome da rua" />
              </Field>
            </div>
            <Field label="Número">
              <input {...register('address.number')} style={inp()} placeholder="123" />
            </Field>
            <Field label="Bairro">
              <input {...register('address.neighborhood')} style={inp()} placeholder="Bairro" />
            </Field>
            <Field label="Cidade">
              <input {...register('address.city')} style={inp()} placeholder="Cidade" />
            </Field>
            <Field label="Estado">
              <input {...register('address.state')} style={inp()} placeholder="SP" maxLength={2} />
            </Field>
            <Field label="CEP">
              <input {...register('address.zipCode')} style={inp()} placeholder="00000-000" />
            </Field>
          </div>

          <Field label="Observações">
            <textarea {...register('notes')} rows={2} style={{ ...inp(), resize: 'none' }}
              placeholder="Informações adicionais sobre o cliente..." />
          </Field>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: 'var(--c-bd0)', color: 'var(--c-tx1)' }}>
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea6c10)', color: 'white', opacity: isSubmitting ? 0.7 : 1 }}>
              {isSubmitting ? 'Salvando...' : isEdit ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const ClientesPage = () => {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [modal, setModal] = useState(null) // null | 'new' | client object

  const fetchClients = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/s/clients?search=${search}&page=${page}&limit=15`)
      setClients(res.data.data.clients)
      setTotalPages(res.data.data.pages)
    } catch { toast.error('Erro ao carregar clientes') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchClients() }, [search, page])
  useAutoRefresh(fetchClients)

  const handleDelete = async (client) => {
    if (!confirm(`Deseja excluir/desativar "${client.name}"?`)) return
    try {
      await api.delete(`/s/clients/${client._id}`)
      toast.success('Cliente removido')
      fetchClients()
    } catch { toast.error('Erro ao remover cliente') }
  }

  const exportCSV = async () => {
    try {
      const res = await api.get('/s/clients?limit=1000')
      const rows = res.data.data.clients
      if (!rows.length) return toast.error('Nenhum cliente para exportar')
      const header = ['Nome', 'Tipo', 'CPF/CNPJ', 'Telefone', 'E-mail', 'Cidade', 'Estado', 'Ativo']
      const lines = rows.map(c => [
        `"${(c.name || '').replace(/"/g, '""')}"`,
        c.type === 'pessoa_juridica' ? 'Pessoa Jurídica' : 'Pessoa Física',
        c.cpfCnpj || '',
        c.phone || '',
        c.email || '',
        c.address?.city || '',
        c.address?.state || '',
        c.isActive ? 'Sim' : 'Não',
      ].join(';'))
      const csv = '\uFEFF' + [header.join(';'), ...lines].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `clientes-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Erro ao exportar')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--c-tx0)' }}>Clientes</h1>
          <p className="text-base mt-1" style={{ color: 'var(--c-tx2)' }}>Gerencie sua carteira de clientes</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium flex-shrink-0"
            style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)', color: 'var(--c-tx2)' }}
            title="Exportar clientes em CSV">
            <Download size={16} /> CSV
          </button>
          <button onClick={() => setModal('new')}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-base font-semibold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #f97316, #ea6c10)', color: 'white' }}>
            <Plus size={18} /> Novo Cliente
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-6"
        style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
        <Search size={16} style={{ color: 'var(--c-tx3)', flexShrink: 0 }} />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Buscar por nome, telefone, CPF/CNPJ..."
          className="flex-1 bg-transparent outline-none text-base"
          style={{ color: 'var(--c-tx0)' }} />
      </div>

      {loading ? (
        <div className="flex justify-center h-48 items-center">
          <div className="w-8 h-8 border-4 rounded-full animate-spin"
            style={{ borderColor: 'var(--c-bd1)', borderTopColor: '#f97316' }} />
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-2xl text-center py-14" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
          <Users size={36} className="mx-auto mb-3" style={{ color: 'var(--c-bd1)' }} />
          <p style={{ color: 'var(--c-tx2)' }}>
            {search ? 'Nenhum cliente encontrado' : 'Cadastre seu primeiro cliente'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map((c) => (
            <div key={c._id} className="rounded-xl p-4 flex items-center gap-4"
              style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>
                {c.name.charAt(0).toUpperCase()}
              </div>
              {/* Dados */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--c-tx0)' }}>{c.name}</p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {c.phone && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--c-tx2)' }}>
                      <Phone size={11} /> {c.phone}
                    </span>
                  )}
                  {c.email && (
                    <span className="flex items-center gap-1 text-xs truncate" style={{ color: 'var(--c-tx2)' }}>
                      <Mail size={11} /> {c.email}
                    </span>
                  )}
                  {c.address?.city && (
                    <span className="text-xs" style={{ color: 'var(--c-tx3)' }}>{c.address.city}</span>
                  )}
                </div>
              </div>
              {/* Tipo */}
              <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 hidden sm:block"
                style={{ background: 'var(--c-bg2)', color: 'var(--c-tx2)' }}>
                {c.type === 'pessoa_fisica' ? 'PF' : 'PJ'}
              </span>
              {/* Ações */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {c.phone && (
                  <button
                    onClick={() => {
                      const phone = c.phone.replace(/\D/g, '')
                      const num = phone.startsWith('55') ? phone : `55${phone}`
                      const msg = encodeURIComponent(`Olá ${c.name}! `)
                      window.open(`https://wa.me/${num}?text=${msg}`, '_blank')
                    }}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--c-tx2)' }}
                    title="WhatsApp"
                    onMouseEnter={e => e.currentTarget.style.color = '#22c55e'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--c-tx2)'}>
                    <MessageCircle size={15} />
                  </button>
                )}
                <button onClick={() => setModal(c)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--c-tx2)' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#f97316'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--c-tx2)'}>
                  <Pencil size={15} />
                </button>
                <button onClick={() => handleDelete(c)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--c-tx2)' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--c-tx2)'}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
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

      {modal && (
        <ClientModal
          client={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSuccess={fetchClients}
        />
      )}
    </div>
  )
}

export default ClientesPage
