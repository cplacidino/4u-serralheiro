import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminCompaniesPage from './pages/admin/AdminCompaniesPage'
import AdminPlansPage from './pages/admin/AdminPlansPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#242429', color: '#e0e0ec', border: '1px solid #3d3d47' },
            success: { iconTheme: { primary: '#22c55e', secondary: '#242429' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#242429' } },
          }}
        />

        <Routes>
          {/* Página de login — pública */}
          <Route path="/login" element={<LoginPage />} />

          {/* Painel do Serralheiro */}
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute allowedRoles={['owner', 'employee']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Painel Admin — com layout e sub-rotas */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="empresas" element={<AdminCompaniesPage />} />
            <Route path="planos" element={<AdminPlansPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
