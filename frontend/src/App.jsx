import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'

// Admin
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminCompaniesPage from './pages/admin/AdminCompaniesPage'
import AdminPlansPage from './pages/admin/AdminPlansPage'
import AdminAlertsPage from './pages/admin/AdminAlertsPage'

// Serralheiro
import SerralheiroLayout from './pages/serralheiro/SerralheiroLayout'
import DashboardSerralheiro from './pages/serralheiro/DashboardSerralheiro'
import ClientesPage from './pages/serralheiro/ClientesPage'
import ProdutosPage from './pages/serralheiro/ProdutosPage'
import OrcamentosPage from './pages/serralheiro/OrcamentosPage'
import UsuariosPage from './pages/serralheiro/UsuariosPage'
import FinanceiroPage from './pages/serralheiro/FinanceiroPage'
import ConfiguracoesPage from './pages/serralheiro/ConfiguracoesPage'
import FuncionariosPage from './pages/serralheiro/FuncionariosPage'
import OrdensServicoPage from './pages/serralheiro/OrdensServicoPage'

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
          <Route path="/login" element={<LoginPage />} />

          {/* Painel do Serralheiro */}
          <Route path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['owner', 'employee']}>
                <SerralheiroLayout />
              </ProtectedRoute>
            }>
            <Route index element={<DashboardSerralheiro />} />
            <Route path="clientes" element={<ClientesPage />} />
            <Route path="produtos" element={<ProdutosPage />} />
            <Route path="orcamentos" element={<OrcamentosPage />} />
            <Route path="financeiro" element={<FinanceiroPage />} />
            <Route path="usuarios" element={<UsuariosPage />} />
            <Route path="funcionarios" element={<FuncionariosPage />} />
            <Route path="ordens-servico" element={<OrdensServicoPage />} />
            <Route path="configuracoes" element={<ConfiguracoesPage />} />
          </Route>

          {/* Painel Admin */}
          <Route path="/admin"
            element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <AdminLayout />
              </ProtectedRoute>
            }>
            <Route index element={<AdminDashboardPage />} />
            <Route path="empresas" element={<AdminCompaniesPage />} />
            <Route path="planos" element={<AdminPlansPage />} />
            <Route path="alertas" element={<AdminAlertsPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
