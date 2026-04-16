import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const DashboardPage = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    toast.success('Até logo!')
    navigate('/login')
  }

  return (
    <div className="min-h-screen p-8" style={{ background: 'var(--c-bg0)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--c-tx0)' }}>
            4u <span style={{ color: '#f97316' }}>Serralheiro</span>
          </h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ background: 'var(--c-bd0)', color: 'var(--c-tx1)' }}
          >
            Sair
          </button>
        </div>

        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}
        >
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--c-tx0)' }}>
            Bem-vindo, {user?.name}! 👋
          </h2>
          <p style={{ color: 'var(--c-tx2)' }}>
            O painel completo será construído nas próximas etapas.
          </p>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
