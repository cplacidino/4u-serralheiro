import { useEffect, useState, useCallback } from 'react'
import useAutoRefresh from '../../hooks/useAutoRefresh'
import { Plus, X, Pencil, UserX, Shield, Wifi, WifiOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'

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

// ─── Modal de criação / edição ─────────────────────────────────────────────────
const UserModal = ({ user, onClose, onSaved }) => {
  const isEdit = !!user
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setError('')
    if (!name.trim()) return setError('Nome é obrigatório.')
    if (!email.trim()) return setError('E-mail é obrigatório.')
    if (!isEdit && password.length < 8) return setError('Senha deve ter mínimo 8 caracteres.')

    setSaving(true)
    try {
      const payload = { name, email }
      if (password) payload.password = password

      if (isEdit) {
        await api.put(`/s/users/${user._id}`, payload)
        toast.success('Funcionário atualizado!')
      } else {
        await api.post('/s/users', payload)
        toast.success('Funcionário adicionado!')
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
      <div className="w-full max-w-md rounded-2xl" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--c-bd0)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--c-tx0)' }}>
            {isEdit ? 'Editar Funcionário' : 'Novo Funcionário'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ color: 'var(--c-tx3)', background: 'var(--c-bg2)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <Field label="Nome *">
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Nome completo" style={inputCls(!name && error)} />
          </Field>
          <Field label="E-mail *">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="funcionario@email.com" style={inputCls(!email && error)} />
          </Field>
          <Field label={isEdit ? 'Nova senha (deixe em branco para manter)' : 'Senha * (mín. 8 caracteres)'}>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" autoComplete="new-password" style={inputCls(!isEdit && !password && error)} />
          </Field>

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
            style={{ background: 'linear-gradient(135deg,#f97316,#ea6c10)', color: 'white', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────
const UsuariosPage = () => {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [maxUsers, setMaxUsers] = useState(-1)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/s/users')
      setUsers(res.data.data.users)
      setMaxUsers(res.data.data.maxUsers)
    } catch {
      toast.error('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])
  useAutoRefresh(fetchUsers)

  const toggleActive = async (u) => {
    try {
      await api.put(`/s/users/${u._id}`, { isActive: !u.isActive })
      toast.success(u.isActive ? 'Funcionário desativado' : 'Funcionário ativado')
      fetchUsers()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erro ao alterar status')
    }
  }

  const kickSessions = async (u) => {
    if (!window.confirm(`Encerrar todas as sessões de ${u.name}?`)) return
    try {
      await api.delete(`/s/users/${u._id}/kick`)
      toast.success('Sessões encerradas')
      fetchUsers()
    } catch {
      toast.error('Erro ao encerrar sessões')
    }
  }

  const activeCount = users.filter(u => u.isActive).length
  const limitLabel = maxUsers === -1 ? '∞' : maxUsers

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--c-tx0)' }}>Usuários</h1>
          <p className="text-base mt-1" style={{ color: 'var(--c-tx2)' }}>
            Gerencie quem acessa o sistema
            <span className="ml-2 px-2 py-0.5 rounded-full text-sm font-semibold"
              style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>
              {activeCount} / {limitLabel}
            </span>
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl text-base font-semibold"
          style={{ background: 'linear-gradient(135deg,#f97316,#ea6c10)', color: 'white' }}>
          <Plus size={18} /> Novo Funcionário
        </button>
      </div>

      {/* Aviso de limite */}
      {maxUsers !== -1 && activeCount >= maxUsers && (
        <div className="rounded-2xl px-5 py-4 mb-6 text-sm"
          style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', color: '#eab308' }}>
          Limite de usuários do plano atingido. Para adicionar mais funcionários, faça upgrade do plano.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-56">
          <div className="w-10 h-10 border-4 rounded-full animate-spin"
            style={{ borderColor: 'var(--c-bd1)', borderTopColor: '#f97316' }} />
        </div>
      ) : (
        <div className="space-y-4">
          {users.map(u => {
            const isMe = u._id === me?._id
            const isOwner = u.role === 'owner'

            return (
              <div key={u._id} className="rounded-2xl p-6 flex items-center gap-5"
                style={{ background: 'var(--c-bg1)', border: `1px solid ${isMe ? 'rgba(249,115,22,0.4)' : 'var(--c-bd0)'}` }}>

                {/* Avatar */}
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0"
                  style={{ background: isOwner ? 'rgba(249,115,22,0.2)' : 'rgba(100,116,139,0.2)', color: isOwner ? '#f97316' : '#94a3b8' }}>
                  {u.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-base font-bold" style={{ color: 'var(--c-tx0)' }}>{u.name}</p>
                    {isOwner && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>
                        <Shield size={11} /> Proprietário
                      </span>
                    )}
                    {isMe && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                        Você
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs"
                      style={{ color: u.isActive ? '#22c55e' : '#ef4444' }}>
                      {u.isActive ? <Wifi size={12} /> : <WifiOff size={12} />}
                      {u.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--c-tx3)' }}>{u.email}</p>
                  {u.activeSessions > 0 && (
                    <p className="text-xs mt-1" style={{ color: '#eab308' }}>
                      {u.activeSessions} sessão(ões) ativa(s)
                    </p>
                  )}
                </div>

                {/* Ações — não mostra para si mesmo se for owner */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!isOwner && (
                    <>
                      <button onClick={() => setEditUser(u)}
                        className="p-2.5 rounded-xl" title="Editar"
                        style={{ background: 'var(--c-bg2)', color: 'var(--c-tx2)' }}>
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => toggleActive(u)}
                        className="p-2.5 rounded-xl text-xs font-semibold px-3"
                        style={{
                          background: u.isActive ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                          color: u.isActive ? '#ef4444' : '#22c55e',
                        }}>
                        {u.isActive ? 'Desativar' : 'Ativar'}
                      </button>
                      {u.activeSessions > 0 && (
                        <button onClick={() => kickSessions(u)}
                          className="p-2.5 rounded-xl" title="Encerrar sessões"
                          style={{ background: 'rgba(234,179,8,0.1)', color: '#eab308' }}>
                          <UserX size={16} />
                        </button>
                      )}
                    </>
                  )}
                  {isOwner && !isMe && (
                    <button onClick={() => setEditUser(u)}
                      className="p-2.5 rounded-xl" title="Editar"
                      style={{ background: 'var(--c-bg2)', color: 'var(--c-tx2)' }}>
                      <Pencil size={16} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <UserModal onClose={() => setShowModal(false)} onSaved={fetchUsers} />
      )}
      {editUser && (
        <UserModal user={editUser} onClose={() => setEditUser(null)} onSaved={fetchUsers} />
      )}
    </div>
  )
}

export default UsuariosPage
