import { useEffect, useState } from 'react'
import { Users, Package, FileText, TrendingUp, TrendingDown, AlertTriangle, Clock, RefreshCw, Wallet } from 'lucide-react'
import api from '../../services/api'
import useAutoRefresh from '../../hooks/useAutoRefresh'

const STATUS_COLORS = {
  rascunho: { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', label: 'Rascunho' },
  enviado:  { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa', label: 'Enviado' },
  aprovado: { bg: 'rgba(34,197,94,0.15)',   color: '#22c55e', label: 'Aprovado' },
  rejeitado:{ bg: 'rgba(239,68,68,0.15)',   color: '#ef4444', label: 'Rejeitado' },
  cancelado:{ bg: 'rgba(239,68,68,0.15)',   color: '#ef4444', label: 'Cancelado' },
}

const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <div className="rounded-2xl p-6" style={{ background: '#1a1a1f', border: '1px solid #2e2e35' }}>
    <div className="flex items-start justify-between mb-4">
      <p className="text-base font-medium" style={{ color: '#8a8a9a' }}>{title}</p>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}22` }}>
        <Icon size={24} style={{ color }} />
      </div>
    </div>
    <p className="text-4xl font-bold mb-1" style={{ color: '#e0e0ec' }}>{value}</p>
    {subtitle && <p className="text-sm mt-1" style={{ color: '#5c5c6b' }}>{subtitle}</p>}
  </div>
)

const DashboardSerralheiro = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchData = () => {
    setLoading(true)
    setError(false)
    api.get('/s/dashboard')
      .then(r => setData(r.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])
  useAutoRefresh(fetchData)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 rounded-full animate-spin"
          style={{ borderColor: '#3d3d47', borderTopColor: '#f97316' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-base" style={{ color: '#8a8a9a' }}>Erro ao carregar o dashboard.</p>
        <button onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>
          <RefreshCw size={16} /> Tentar novamente
        </button>
      </div>
    )
  }

  const fmt = (v) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmtDate = (d) => new Date(d).toLocaleDateString('pt-BR')
  const balance = data?.monthBalance ?? 0

  return (
    <div>
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: '#e0e0ec' }}>Dashboard</h1>
        <p className="text-base mt-1" style={{ color: '#8a8a9a' }}>Visão geral do seu negócio</p>
      </div>

      {/* KPIs linha 1 — contadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-5">
        <StatCard title="Clientes" value={data?.totalClients ?? 0}
          icon={Users} color="#f97316" subtitle="Cadastrados" />
        <StatCard title="Produtos" value={data?.totalProducts ?? 0}
          icon={Package} color="#64748b" subtitle="No catálogo" />
        <StatCard title="Orçamentos Pendentes" value={data?.pendingBudgets ?? 0}
          icon={Clock} color="#eab308" subtitle="Aguardando aprovação" />
        <StatCard title="Orçamentos Aprovados" value={data?.approvedBudgets ?? 0}
          icon={FileText} color="#60a5fa" subtitle="Total no sistema" />
      </div>

      {/* KPIs linha 2 — financeiro do mês */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="rounded-2xl p-6" style={{ background: '#1a1a1f', border: '1px solid #2e2e35' }}>
          <div className="flex items-start justify-between mb-3">
            <p className="text-base font-medium" style={{ color: '#8a8a9a' }}>Receita do Mês</p>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(34,197,94,0.15)' }}>
              <TrendingUp size={20} style={{ color: '#22c55e' }} />
            </div>
          </div>
          <p className="text-3xl font-bold" style={{ color: '#22c55e' }}>{fmt(data?.monthRevenue)}</p>
          <p className="text-xs mt-1" style={{ color: '#5c5c6b' }}>Receitas pagas no mês</p>
        </div>

        <div className="rounded-2xl p-6" style={{ background: '#1a1a1f', border: '1px solid #2e2e35' }}>
          <div className="flex items-start justify-between mb-3">
            <p className="text-base font-medium" style={{ color: '#8a8a9a' }}>Despesas do Mês</p>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.15)' }}>
              <TrendingDown size={20} style={{ color: '#ef4444' }} />
            </div>
          </div>
          <p className="text-3xl font-bold" style={{ color: '#ef4444' }}>{fmt(data?.monthExpenses)}</p>
          <p className="text-xs mt-1" style={{ color: '#5c5c6b' }}>Despesas pagas no mês</p>
        </div>

        <div className="rounded-2xl p-6"
          style={{
            background: balance >= 0 ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
            border: `1px solid ${balance >= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
          }}>
          <div className="flex items-start justify-between mb-3">
            <p className="text-base font-medium" style={{ color: '#8a8a9a' }}>Saldo do Mês</p>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: balance >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }}>
              <Wallet size={20} style={{ color: balance >= 0 ? '#22c55e' : '#ef4444' }} />
            </div>
          </div>
          <p className="text-3xl font-bold" style={{ color: balance >= 0 ? '#22c55e' : '#ef4444' }}>
            {fmt(balance)}
          </p>
          <p className="text-xs mt-1" style={{ color: '#5c5c6b' }}>Receitas − Despesas</p>
        </div>
      </div>

      {/* Painéis inferiores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Orçamentos recentes */}
        <div className="rounded-2xl p-6" style={{ background: '#1a1a1f', border: '1px solid #2e2e35' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold" style={{ color: '#e0e0ec' }}>Últimos Orçamentos</h2>
            <FileText size={20} style={{ color: '#5c5c6b' }} />
          </div>
          {!data?.recentBudgets?.length ? (
            <div className="text-center py-10">
              <FileText size={36} className="mx-auto mb-3" style={{ color: '#2e2e35' }} />
              <p className="text-base" style={{ color: '#5c5c6b' }}>Nenhum orçamento ainda.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.recentBudgets.map((b) => {
                const st = STATUS_COLORS[b.status] ?? STATUS_COLORS.rascunho
                return (
                  <div key={b._id} className="flex items-center justify-between gap-3 py-2"
                    style={{ borderBottom: '1px solid #2e2e35' }}>
                    <div className="min-w-0">
                      <p className="text-base font-semibold truncate" style={{ color: '#e0e0ec' }}>
                        {b.client?.name ?? 'Cliente'}
                      </p>
                      <p className="text-sm mt-0.5" style={{ color: '#5c5c6b' }}>
                        ORC-{String(b.number).padStart(3, '0')} · {fmtDate(b.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-base font-bold" style={{ color: '#e0e0ec' }}>
                        {fmt(b.total)}
                      </span>
                      <span className="text-sm px-3 py-1 rounded-full font-medium"
                        style={{ background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Estoque baixo */}
        <div className="rounded-2xl p-6" style={{ background: '#1a1a1f', border: '1px solid #2e2e35' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold" style={{ color: '#e0e0ec' }}>Estoque Baixo</h2>
            <AlertTriangle size={20} style={{ color: '#eab308' }} />
          </div>
          {!data?.lowStockProducts?.length ? (
            <div className="text-center py-10">
              <Package size={36} className="mx-auto mb-3" style={{ color: '#2e2e35' }} />
              <p className="text-base" style={{ color: '#5c5c6b' }}>Nenhum produto com estoque crítico.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.lowStockProducts.map((p) => (
                <div key={p._id} className="flex items-center justify-between gap-3 py-2"
                  style={{ borderBottom: '1px solid #2e2e35' }}>
                  <div className="min-w-0">
                    <p className="text-base font-semibold truncate" style={{ color: '#e0e0ec' }}>{p.name}</p>
                    <p className="text-sm mt-0.5" style={{ color: '#5c5c6b' }}>{p.category}</p>
                  </div>
                  <span className="text-sm px-3 py-1.5 rounded-full font-semibold flex-shrink-0"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                    {p.stock} un / mín {p.minStock}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default DashboardSerralheiro
