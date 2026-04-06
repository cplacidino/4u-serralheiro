import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import { LayoutDashboard, Building2, CreditCard, LogOut, Menu, X } from 'lucide-react'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/empresas', label: 'Empresas', icon: Building2 },
  { to: '/admin/planos', label: 'Planos', icon: CreditCard },
]

// Conteúdo da sidebar — reutilizado no desktop e no drawer mobile
const SidebarContent = ({ onClose, user, onLogout }) => (
  <div className="flex flex-col h-full">
    {/* Logo */}
    <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #2e2e35' }}>
      <div>
        <p className="text-base font-bold" style={{ color: '#e0e0ec' }}>
          4u <span style={{ color: '#f97316' }}>Serralheiro</span>
        </p>
        <span className="text-xs px-2 py-0.5 rounded-full mt-0.5 inline-block"
          style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>
          Admin
        </span>
      </div>
      {/* Botão fechar — só aparece no mobile */}
      {onClose && (
        <button onClick={onClose} className="lg:hidden p-1" style={{ color: '#5c5c6b' }}>
          <X size={18} />
        </button>
      )}
    </div>

    {/* Navegação */}
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {navItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end}
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={({ isActive }) => ({
            background: isActive ? 'rgba(249,115,22,0.15)' : 'transparent',
            color: isActive ? '#f97316' : '#8a8a9a',
          })}>
          <Icon size={17} />
          {label}
        </NavLink>
      ))}
    </nav>

    {/* Usuário + logout */}
    <div className="p-3" style={{ borderTop: '1px solid #2e2e35' }}>
      <div className="flex items-center gap-2 px-2 py-2 mb-1">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: 'rgba(249,115,22,0.2)', color: '#f97316' }}>
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium truncate" style={{ color: '#e0e0ec' }}>{user?.name}</p>
          <p className="text-xs truncate" style={{ color: '#5c5c6b', fontSize: 10 }}>{user?.email}</p>
        </div>
      </div>
      <button onClick={onLogout}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm transition-colors"
        style={{ color: '#8a8a9a' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8a8a9a' }}>
        <LogOut size={16} /> Sair
      </button>
    </div>
  </div>
)

const AdminLayout = () => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Fecha o drawer mobile ao trocar de página
  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  const handleLogout = async () => {
    await logout()
    toast.success('Até logo!')
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#111114' }}>

      {/* ══════════════════════════════════════
          SIDEBAR DESKTOP — sempre visível no lg+
          ══════════════════════════════════════ */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0"
        style={{ width: 220, background: '#1a1a1f', borderRight: '1px solid #2e2e35' }}
      >
        <SidebarContent user={user} onLogout={handleLogout} />
      </aside>

      {/* ══════════════════════════════════════
          DRAWER MOBILE — overlay com toggle
          ══════════════════════════════════════ */}
      {drawerOpen && (
        <div className="fixed inset-0 z-30 lg:hidden" style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setDrawerOpen(false)} />
      )}
      <aside
        className="fixed top-0 left-0 h-full z-40 lg:hidden flex flex-col"
        style={{
          width: 220,
          background: '#1a1a1f',
          borderRight: '1px solid #2e2e35',
          transform: drawerOpen ? 'translateX(0)' : 'translateX(-220px)',
          transition: 'transform 0.25s ease',
        }}
      >
        <SidebarContent onClose={() => setDrawerOpen(false)} user={user} onLogout={handleLogout} />
      </aside>

      {/* ══════════════════════════════════════
          CONTEÚDO PRINCIPAL
          ══════════════════════════════════════ */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Header com botão menu — visível em todos os tamanhos */}
        <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3"
          style={{ background: '#111114', borderBottom: '1px solid #2e2e35' }}>
          {/* No desktop o botão ainda existe para fechar/abrir se quiser, mas a sidebar já está visível */}
          <button onClick={() => setDrawerOpen(true)} className="lg:hidden p-2 rounded-xl"
            style={{ color: '#8a8a9a', background: '#1a1a1f' }}>
            <Menu size={18} />
          </button>
          <span className="text-sm font-semibold lg:hidden" style={{ color: '#e0e0ec' }}>
            4u <span style={{ color: '#f97316' }}>Serralheiro</span>
          </span>
        </header>

        <div className="flex-1 p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default AdminLayout
