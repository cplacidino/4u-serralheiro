import { useState, useEffect, useCallback } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Users, Package, FileText, LogOut, Menu, X, UserCog, DollarSign, Bell, Settings, Wrench, ClipboardList, Sun, Moon, HandCoins, CalendarDays,
} from 'lucide-react'
import api from '../../services/api'

const allNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { to: '/dashboard/produtos', label: 'Produtos', icon: Package },
  { to: '/dashboard/orcamentos', label: 'Orçamentos', icon: FileText },
  { to: '/dashboard/financeiro', label: 'Financeiro', icon: DollarSign },
  { to: '/dashboard/ordens-servico', label: 'Ordens de Serviço', icon: ClipboardList },
  { to: '/dashboard/fiado', label: 'Fiado', icon: HandCoins },
  { to: '/dashboard/agendamentos', label: 'Agendamentos', icon: CalendarDays },
  { to: '/dashboard/funcionarios', label: 'Funcionários', icon: Wrench, ownerOnly: true },
  { to: '/dashboard/usuarios', label: 'Usuários', icon: UserCog, ownerOnly: true },
  { to: '/dashboard/configuracoes', label: 'Configurações', icon: Settings },
]

const SidebarContent = ({ onClose, user, onLogout }) => {
  const navItems = allNavItems.filter(item => !item.ownerOnly || user?.role === 'owner')
  const { theme, toggleTheme } = useTheme()
  return (
  <div className="flex flex-col h-full">

    {/* Logo */}
    <div className="px-6 py-6" style={{ borderBottom: '1px solid var(--c-bd0)' }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xl font-bold tracking-tight" style={{ color: 'var(--c-tx0)' }}>
            4u <span style={{ color: '#f97316' }}>Serralheiro</span>
          </p>
          {user?.company && (
            <p className="text-sm mt-1 font-medium truncate" style={{ color: '#f97316', opacity: 0.8 }}>
              {typeof user.company === 'object' ? user.company.name : ''}
            </p>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-2 rounded-lg" style={{ color: 'var(--c-tx3)' }}>
            <X size={20} />
          </button>
        )}
      </div>
    </div>

    {/* Navegação */}
    <nav className="flex-1 px-4 py-5 space-y-2 overflow-y-auto">
      {navItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={onClose}
          className="flex items-center gap-4 px-4 py-3.5 rounded-2xl text-base font-medium transition-all"
          style={({ isActive }) => ({
            background: isActive ? 'rgba(249,115,22,0.18)' : 'transparent',
            color: isActive ? '#f97316' : 'var(--c-tx2)',
            borderLeft: isActive ? '3px solid #f97316' : '3px solid transparent',
          })}>
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
    </nav>

    {/* Usuário + logout */}
    <div className="px-4 py-5" style={{ borderTop: '1px solid var(--c-bd0)' }}>
      <div className="flex items-center gap-3 px-3 py-3 rounded-2xl mb-3"
        style={{ background: 'var(--c-bg2)' }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0"
          style={{ background: 'rgba(249,115,22,0.25)', color: '#f97316' }}>
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--c-tx0)' }}>{user?.name}</p>
          <p className="text-xs truncate" style={{ color: 'var(--c-tx3)' }}>
            {user?.role === 'owner' ? 'Proprietário' : 'Funcionário'}
          </p>
        </div>
      </div>
      <button onClick={toggleTheme}
        className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-base font-medium transition-all mb-1"
        style={{ color: 'var(--c-tx2)', background: 'var(--c-bg0)' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(249,115,22,0.1)'; e.currentTarget.style.color = '#f97316' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--c-bg0)'; e.currentTarget.style.color = 'var(--c-tx2)' }}>
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
      </button>
      <button onClick={onLogout}
        className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-base font-medium transition-all"
        style={{ color: 'var(--c-tx2)' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = '#ef4444' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--c-tx2)' }}>
        <LogOut size={20} /> Sair
      </button>
    </div>
  </div>
  )
}

const SerralheiroLayout = () => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/s/notifications/count')
      setNotifCount(res.data.data.total ?? 0)
    } catch { /* silencia */ }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const id = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(id)
  }, [fetchNotifications])

  const handleLogout = async () => {
    await logout()
    toast.success('Até logo!')
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--c-bg0)' }}>

      {/* Sidebar desktop — sempre visível */}
      <aside className="hidden lg:flex flex-col flex-shrink-0"
        style={{ width: 260, background: 'var(--c-bg1)', borderRight: '1px solid var(--c-bd0)' }}>
        <SidebarContent user={user} onLogout={handleLogout} />
      </aside>

      {/* Overlay mobile */}
      {drawerOpen && (
        <div className="fixed inset-0 z-30 lg:hidden" style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setDrawerOpen(false)} />
      )}

      {/* Drawer mobile */}
      <aside className="fixed top-0 left-0 h-full z-40 lg:hidden flex flex-col"
        style={{
          width: 260, background: 'var(--c-bg1)', borderRight: '1px solid var(--c-bd0)',
          transform: drawerOpen ? 'translateX(0)' : 'translateX(-260px)',
          transition: 'transform 0.25s ease',
        }}>
        <SidebarContent onClose={() => setDrawerOpen(false)} user={user} onLogout={handleLogout} />
      </aside>

      {/* Área principal */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Header mobile */}
        <header className="sticky top-0 z-20 flex items-center gap-4 px-5 py-4 lg:hidden"
          style={{ background: 'var(--c-bg0)', borderBottom: '1px solid var(--c-bd0)' }}>
          <button onClick={() => setDrawerOpen(true)} className="p-2.5 rounded-xl"
            style={{ color: 'var(--c-tx2)', background: 'var(--c-bg1)' }}>
            <Menu size={22} />
          </button>
          <span className="flex-1 text-lg font-bold" style={{ color: 'var(--c-tx0)' }}>
            4u <span style={{ color: '#f97316' }}>Serralheiro</span>
          </span>
          {/* Tema — mobile */}
          <button onClick={toggleTheme} className="p-2.5 rounded-xl"
            style={{ color: 'var(--c-tx2)', background: 'var(--c-bg1)' }}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          {/* Sino de notificações — mobile */}
          <button onClick={() => navigate('/dashboard/financeiro')} className="relative p-2.5 rounded-xl"
            style={{ color: notifCount > 0 ? '#eab308' : 'var(--c-tx3)', background: 'var(--c-bg1)' }}>
            <Bell size={20} />
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
                style={{ background: '#ef4444', color: 'white' }}>
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>
        </header>

        {/* Barra superior desktop — só para o sino */}
        {notifCount > 0 && (
          <div className="hidden lg:flex items-center justify-end px-8 py-2"
            style={{ borderBottom: '1px solid var(--c-bd0)', background: 'var(--c-bg1)' }}>
            <button onClick={() => navigate('/dashboard/financeiro')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
              <Bell size={15} />
              {notifCount} alerta{notifCount > 1 ? 's' : ''} pendente{notifCount > 1 ? 's' : ''}
            </button>
          </div>
        )}

        {/* Conteúdo da página */}
        <div className="flex-1 p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default SerralheiroLayout
