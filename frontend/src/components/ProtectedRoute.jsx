import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// Componente que protege rotas — redireciona para login se não autenticado
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#111114' }}>
        <div className="text-center">
          <div
            className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: '#3d3d47', borderTopColor: '#f97316' }}
          />
          <p style={{ color: '#8a8a9a' }}>Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redireciona para o painel correto conforme o papel do usuário
    if (user.role === 'superadmin') return <Navigate to="/admin" replace />
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default ProtectedRoute
