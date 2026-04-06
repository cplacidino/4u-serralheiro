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
    <div className="min-h-screen p-8" style={{ background: '#111114' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold" style={{ color: '#e0e0ec' }}>
            4u <span style={{ color: '#f97316' }}>Serralheiro</span>
          </h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ background: '#2e2e35', color: '#b8b8c8' }}
          >
            Sair
          </button>
        </div>

        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: '#1a1a1f', border: '1px solid #2e2e35' }}
        >
          <h2 className="text-xl font-semibold mb-2" style={{ color: '#e0e0ec' }}>
            Bem-vindo, {user?.name}! 👋
          </h2>
          <p style={{ color: '#8a8a9a' }}>
            O painel completo será construído nas próximas etapas.
          </p>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
