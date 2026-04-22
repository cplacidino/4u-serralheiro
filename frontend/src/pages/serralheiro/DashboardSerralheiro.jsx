import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Package, FileText, TrendingUp, TrendingDown, AlertTriangle, Clock, RefreshCw, Wallet, ClipboardList, CalendarCheck, HandCoins, CreditCard, CheckSquare } from 'lucide-react'
import api from '../../services/api'
import useAutoRefresh from '../../hooks/useAutoRefresh'

const STATUS_COLORS = {
  rascunho:  { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', label: 'Rascunho' },
  enviado:   { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa', label: 'Enviado' },
  aprovado:  { bg: 'rgba(34,197,94,0.15)',   color: '#22c55e', label: 'Aprovado' },
  em_os:     { bg: 'rgba(249,115,22,0.15)',  color: '#f97316', label: 'Em OS' },
  finalizado:{ bg: 'rgba(168,85,247,0.15)',  color: '#a855f7', label: 'Finalizado' },
  rejeitado: { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444', label: 'Rejeitado' },
  cancelado: { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444', label: 'Cancelado' },
}

const OS_STATUS = {
  pendente:    { label: 'Pendente',    color: '#eab308' },
  em_execucao: { label: 'Em execução', color: '#60a5fa' },
  concluido:   { label: 'Concluído',   color: '#22c55e' },
  cancelado:   { label: 'Cancelado',   color: '#ef4444' },
}

const AfazeresWidget = ({ afazeres, navigate }) => {
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'
  const fmt = (v) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const total = afazeres?.totalAfazeres ?? 0

  const Section = ({ icon: Icon, color, title, items, renderItem }) => {
    if (!items?.length) return null
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Icon size={15} style={{ color }} />
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>{title}</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold"
            style={{ background: `${color}22`, color }}>{items.length}</span>
        </div>
        <div className="space-y-1.5 mb-3">
          {items.map((item, i) => renderItem(item, i))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl p-6 mb-6" style={{
      background: total > 0 ? 'rgba(249,115,22,0.05)' : 'var(--c-bg1)',
      border: `1px solid ${total > 0 ? 'rgba(249,115,22,0.3)' : 'var(--c-bd0)'}`,
    }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <CheckSquare size={20} style={{ color: '#f97316' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--c-tx0)' }}>Afazeres de Hoje</h2>
        </div>
        {total > 0 && (
          <span className="text-sm px-3 py-1 rounded-full font-bold"
            style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>
            {total} {total === 1 ? 'item' : 'itens'}
          </span>
        )}
      </div>

      {total === 0 ? (
        <div className="text-center py-6">
          <CheckSquare size={32} className="mx-auto mb-2" style={{ color: 'var(--c-bd0)' }} />
          <p className="text-sm" style={{ color: 'var(--c-tx3)' }}>Nenhum afazer pendente hoje. Tudo em dia!</p>
        </div>
      ) : (
        <div className="space-y-3">
          <Section icon={ClipboardList} color="#f97316" title="OS para entregar / atrasadas"
            items={afazeres?.osDueToday}
            renderItem={(os, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer"
                style={{ background: 'var(--c-bg2)' }}
                onClick={() => navigate('/dashboard/ordens-servico')}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--c-tx0)' }}>
                    OS-{String(os.number).padStart(3,'0')} · {os.client?.name ?? '—'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--c-tx3)' }}>{os.title}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: `${OS_STATUS[os.status]?.color ?? '#eab308'}22`, color: OS_STATUS[os.status]?.color ?? '#eab308' }}>
                    {OS_STATUS[os.status]?.label ?? os.status}
                  </span>
                  <p className="text-xs mt-1" style={{ color: new Date(os.dueDate) < new Date() ? '#ef4444' : 'var(--c-tx3)' }}>
                    {fmtDate(os.dueDate)}
                  </p>
                </div>
              </div>
            )}
          />
          <Section icon={CalendarCheck} color="#60a5fa" title="Agendamentos de hoje"
            items={afazeres?.agendamentosHoje}
            renderItem={(ag, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer"
                style={{ background: 'var(--c-bg2)' }}
                onClick={() => navigate('/dashboard/agendamentos')}>
                <p className="text-sm font-medium" style={{ color: 'var(--c-tx0)' }}>{ag.title}</p>
                <p className="text-xs flex-shrink-0 ml-2" style={{ color: 'var(--c-tx3)' }}>
                  {new Date(ag.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}
          />
          <Section icon={HandCoins} color="#eab308" title="Fiados vencendo / vencidos"
            items={afazeres?.fiadosVencendoHoje}
            renderItem={(f, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer"
                style={{ background: 'var(--c-bg2)' }}
                onClick={() => navigate('/dashboard/fiado')}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--c-tx0)' }}>{f.client?.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--c-tx3)' }}>
                    ORC-{String(f.budget?.number ?? 0).padStart(3,'0')} · vence {fmtDate(f.dueDate)}
                  </p>
                </div>
                <p className="text-sm font-bold flex-shrink-0 ml-2" style={{ color: '#eab308' }}>{fmt(f.amount)}</p>
              </div>
            )}
          />
          <Section icon={CreditCard} color="#ef4444" title="Despesas a pagar"
            items={afazeres?.despesasVencendoHoje}
            renderItem={(d, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer"
                style={{ background: 'var(--c-bg2)' }}
                onClick={() => navigate('/dashboard/financeiro')}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--c-tx0)' }}>{d.description}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--c-tx3)' }}>{d.category} · vence {fmtDate(d.dueDate)}</p>
                </div>
                <p className="text-sm font-bold flex-shrink-0 ml-2" style={{ color: '#ef4444' }}>{fmt(d.amount)}</p>
              </div>
            )}
          />
          <Section icon={CreditCard} color="#a855f7" title="Cheques a compensar"
            items={afazeres?.chequesVencendoHoje}
            renderItem={(c, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer"
                style={{ background: 'var(--c-bg2)' }}
                onClick={() => navigate('/dashboard/fiado')}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--c-tx0)' }}>{c.client?.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--c-tx3)' }}>
                    Nº {c.chequeNumero || 'S/N'} · {c.chequeBanco || ''} · {fmtDate(c.dueDate)}
                  </p>
                </div>
                <p className="text-sm font-bold flex-shrink-0 ml-2" style={{ color: '#a855f7' }}>{fmt(c.amount)}</p>
              </div>
            )}
          />
        </div>
      )}
    </div>
  )
}

const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <div className="rounded-2xl p-6" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
    <div className="flex items-start justify-between mb-4">
      <p className="text-base font-medium" style={{ color: 'var(--c-tx2)' }}>{title}</p>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}22` }}>
        <Icon size={24} style={{ color }} />
      </div>
    </div>
    <p className="text-4xl font-bold mb-1" style={{ color: 'var(--c-tx0)' }}>{value}</p>
    {subtitle && <p className="text-sm mt-1" style={{ color: 'var(--c-tx3)' }}>{subtitle}</p>}
  </div>
)

const DashboardSerralheiro = () => {
  const navigate = useNavigate()
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
          style={{ borderColor: 'var(--c-bd1)', borderTopColor: '#f97316' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-base" style={{ color: 'var(--c-tx2)' }}>Erro ao carregar o dashboard.</p>
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
        <h1 className="text-3xl font-bold" style={{ color: 'var(--c-tx0)' }}>Dashboard</h1>
        <p className="text-base mt-1" style={{ color: 'var(--c-tx2)' }}>Visão geral do seu negócio</p>
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
        <div className="rounded-2xl p-6" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
          <div className="flex items-start justify-between mb-3">
            <p className="text-base font-medium" style={{ color: 'var(--c-tx2)' }}>Receita do Mês</p>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(34,197,94,0.15)' }}>
              <TrendingUp size={20} style={{ color: '#22c55e' }} />
            </div>
          </div>
          <p className="text-3xl font-bold" style={{ color: '#22c55e' }}>{fmt(data?.monthRevenue)}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--c-tx3)' }}>Receitas pagas no mês</p>
        </div>

        <div className="rounded-2xl p-6" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
          <div className="flex items-start justify-between mb-3">
            <p className="text-base font-medium" style={{ color: 'var(--c-tx2)' }}>Despesas do Mês</p>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.15)' }}>
              <TrendingDown size={20} style={{ color: '#ef4444' }} />
            </div>
          </div>
          <p className="text-3xl font-bold" style={{ color: '#ef4444' }}>{fmt(data?.monthExpenses)}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--c-tx3)' }}>Despesas pagas no mês</p>
        </div>

        <div className="rounded-2xl p-6"
          style={{
            background: balance >= 0 ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
            border: `1px solid ${balance >= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
          }}>
          <div className="flex items-start justify-between mb-3">
            <p className="text-base font-medium" style={{ color: 'var(--c-tx2)' }}>Saldo do Mês</p>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: balance >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }}>
              <Wallet size={20} style={{ color: balance >= 0 ? '#22c55e' : '#ef4444' }} />
            </div>
          </div>
          <p className="text-3xl font-bold" style={{ color: balance >= 0 ? '#22c55e' : '#ef4444' }}>
            {fmt(balance)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--c-tx3)' }}>Receitas − Despesas</p>
        </div>
      </div>

      {/* Afazeres do dia */}
      <AfazeresWidget afazeres={data?.afazeres} navigate={navigate} />

      {/* Painéis inferiores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Orçamentos recentes */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold" style={{ color: 'var(--c-tx0)' }}>Últimos Orçamentos</h2>
            <FileText size={20} style={{ color: 'var(--c-tx3)' }} />
          </div>
          {!data?.recentBudgets?.length ? (
            <div className="text-center py-10">
              <FileText size={36} className="mx-auto mb-3" style={{ color: 'var(--c-bd0)' }} />
              <p className="text-base" style={{ color: 'var(--c-tx3)' }}>Nenhum orçamento ainda.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.recentBudgets.map((b) => {
                const st = STATUS_COLORS[b.status] ?? STATUS_COLORS.rascunho
                return (
                  <div key={b._id} className="flex items-center justify-between gap-3 py-2"
                    style={{ borderBottom: '1px solid var(--c-bd0)' }}>
                    <div className="min-w-0">
                      <p className="text-base font-semibold truncate" style={{ color: 'var(--c-tx0)' }}>
                        {b.client?.name ?? 'Cliente'}
                      </p>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--c-tx3)' }}>
                        ORC-{String(b.number).padStart(3, '0')} · {fmtDate(b.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-base font-bold" style={{ color: 'var(--c-tx0)' }}>
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
        <div className="rounded-2xl p-6" style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-bd0)' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold" style={{ color: 'var(--c-tx0)' }}>Estoque Baixo</h2>
            <AlertTriangle size={20} style={{ color: '#eab308' }} />
          </div>
          {!data?.lowStockProducts?.length ? (
            <div className="text-center py-10">
              <Package size={36} className="mx-auto mb-3" style={{ color: 'var(--c-bd0)' }} />
              <p className="text-base" style={{ color: 'var(--c-tx3)' }}>Nenhum produto com estoque crítico.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.lowStockProducts.map((p) => (
                <div key={p._id} className="flex items-center justify-between gap-3 py-2"
                  style={{ borderBottom: '1px solid var(--c-bd0)' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name}
                        style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--c-bd0)' }} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--c-bg2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--c-bd0)' }}>
                        <Package size={18} style={{ color: 'var(--c-tx3)' }} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-base font-semibold truncate" style={{ color: 'var(--c-tx0)' }}>{p.name}</p>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--c-tx3)' }}>{p.category}</p>
                    </div>
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
