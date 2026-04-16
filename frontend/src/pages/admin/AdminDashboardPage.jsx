import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, TrendingUp, CheckCircle, XCircle, Users, PlusCircle, AlertTriangle, CalendarClock } from 'lucide-react'
import api from '../../services/api'

const fmt = (v) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$ 0,00'
const fmtDate = (d) => new Date(d).toLocaleDateString('pt-BR')

const StatCard = ({ title, value, icon: Icon, color, subtitle, onClick }) => (
  <div
    className={`rounded-2xl p-5 ${onClick ? 'cursor-pointer' : ''}`}
    style={{ background: '#1a1a1f', border: '1px solid #2e2e35' }}
    onClick={onClick}
    onMouseEnter={e => { if (onClick) e.currentTarget.style.borderColor = color }}
    onMouseLeave={e => { if (onClick) e.currentTarget.style.borderColor = '#2e2e35' }}
  >
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs font-medium" style={{ color: '#8a8a9a' }}>{title}</p>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}22` }}>
        <Icon size={18} style={{ color }} />
      </div>
    </div>
    <p className="text-2xl font-bold truncate" style={{ color: '#e0e0ec' }}>{value}</p>
    {subtitle && <p className="text-xs mt-1 truncate" style={{ color: '#5c5c6b' }}>{subtitle}</p>}
  </div>
)

const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/admin/stats')
      .then(r => setStats(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 rounded-full animate-spin"
          style={{ borderColor: '#3d3d47', borderTopColor: '#f97316' }} />
      </div>
    )
  }

  const daysUntil = (date) => Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24))

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold" style={{ color: '#e0e0ec' }}>Dashboard</h2>
        <p className="text-sm mt-0.5" style={{ color: '#8a8a9a' }}>Visão geral do sistema</p>
      </div>

      {/* Alerta de vencimentos próximos */}
      {stats?.expiringIn30Count > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-5 cursor-pointer"
          style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)' }}
          onClick={() => navigate('/admin/alertas')}
        >
          <AlertTriangle size={18} style={{ color: '#eab308', flexShrink: 0 }} />
          <p className="text-sm" style={{ color: '#eab308' }}>
            <strong>{stats.expiringIn30Count}</strong> empresa{stats.expiringIn30Count > 1 ? 's' : ''} com plano vencendo nos próximos 30 dias.{' '}
            <span style={{ textDecoration: 'underline' }}>Ver alertas →</span>
          </p>
        </div>
      )}

      {/* KPI cards — 2 colunas mobile, 3 desktop, 6 xl */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 mb-6">
        <StatCard title="Total de Empresas" value={stats?.totalCompanies ?? 0}
          icon={Building2} color="#f97316" subtitle="Cadastradas no sistema" />
        <StatCard title="Ativas" value={stats?.activeCompanies ?? 0}
          icon={CheckCircle} color="#22c55e" subtitle="Com plano vigente" />
        <StatCard title="Inativas / Vencidas" value={stats?.inactiveCompanies ?? 0}
          icon={XCircle} color="#ef4444" subtitle="Desativadas ou expiradas" />
        <StatCard title="Total de Usuários" value={stats?.totalUsers ?? 0}
          icon={Users} color="#6366f1" subtitle="Em todas as empresas" />
        <StatCard title="Novas este mês" value={stats?.newThisMonth ?? 0}
          icon={PlusCircle} color="#22c55e" subtitle="Empresas criadas no mês atual" />
        <StatCard
          title="Vencendo em 30 dias"
          value={stats?.expiringIn30Count ?? 0}
          icon={CalendarClock}
          color="#eab308"
          subtitle="Clique para ver detalhes"
          onClick={() => navigate('/admin/alertas')}
        />
      </div>

      {/* Receita mensal destaque */}
      <div className="rounded-2xl p-5 mb-5" style={{ background: '#1a1a1f', border: '1px solid #2e2e35' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(249,115,22,0.15)' }}>
            <TrendingUp size={20} style={{ color: '#f97316' }} />
          </div>
          <div>
            <p className="text-xs" style={{ color: '#8a8a9a' }}>Receita Mensal Recorrente (MRR)</p>
            <p className="text-3xl font-bold" style={{ color: '#e0e0ec' }}>{fmt(stats?.monthlyRevenue)}</p>
          </div>
        </div>
      </div>

      {/* Linha inferior — 3 colunas no lg */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Empresas por plano */}
        {stats?.companiesByPlan?.length > 0 && (
          <div className="rounded-2xl p-5" style={{ background: '#1a1a1f', border: '1px solid #2e2e35' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: '#e0e0ec' }}>Por Plano</h3>
            <div className="space-y-3">
              {stats.companiesByPlan.map((p) => (
                <div key={p.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#f97316' }} />
                    <span className="text-sm truncate" style={{ color: '#b8b8c8' }}>{p.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs hidden sm:block" style={{ color: '#8a8a9a' }}>{fmt(p.price)}/mês</span>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full"
                      style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>
                      {p.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Últimas empresas */}
        <div className="rounded-2xl p-5" style={{ background: '#1a1a1f', border: '1px solid #2e2e35' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: '#e0e0ec' }}>Últimas Cadastradas</h3>
          {!stats?.recentCompanies?.length ? (
            <p className="text-sm" style={{ color: '#5c5c6b' }}>Nenhuma empresa ainda.</p>
          ) : (
            <div className="space-y-3">
              {stats.recentCompanies.map((c) => (
                <div key={c._id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#e0e0ec' }}>{c.name}</p>
                    <p className="text-xs truncate" style={{ color: '#5c5c6b' }}>{c.email}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full flex-shrink-0"
                    style={{ background: c.isActive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: c.isActive ? '#22c55e' : '#ef4444' }}>
                    {c.plan?.name ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vencendo em breve */}
        <div className="rounded-2xl p-5" style={{ background: '#1a1a1f', border: '1px solid #2e2e35' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: '#e0e0ec' }}>Vencendo em Breve</h3>
          {!stats?.expiringSoon?.length ? (
            <p className="text-sm" style={{ color: '#5c5c6b' }}>Nenhuma nos próximos 30 dias.</p>
          ) : (
            <div className="space-y-3">
              {stats.expiringSoon.map((c) => {
                const days = daysUntil(c.planExpiresAt)
                const color = days <= 7 ? '#ef4444' : days <= 15 ? '#eab308' : '#f97316'
                return (
                  <div key={c._id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#e0e0ec' }}>{c.name}</p>
                      <p className="text-xs truncate" style={{ color: '#5c5c6b' }}>{fmtDate(c.planExpiresAt)}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full flex-shrink-0 font-semibold"
                      style={{ background: `${color}22`, color }}>
                      {days}d
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {stats?.totalCompanies === 0 && (
        <div className="rounded-2xl p-10 text-center mt-4" style={{ background: '#1a1a1f', border: '1px dashed #3d3d47' }}>
          <Building2 size={40} className="mx-auto mb-3" style={{ color: '#3d3d47' }} />
          <h3 className="text-base font-semibold mb-1" style={{ color: '#e0e0ec' }}>Nenhuma empresa cadastrada</h3>
          <p className="text-sm" style={{ color: '#8a8a9a' }}>
            Vá em <strong>Empresas</strong> para cadastrar a primeira serralheria.
          </p>
        </div>
      )}
    </div>
  )
}

export default AdminDashboardPage
