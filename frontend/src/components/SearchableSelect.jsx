import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

/**
 * Dropdown pesquisável.
 * Props:
 *   value        – valor selecionado
 *   onChange     – fn(value)
 *   options      – [{ value, label, sub? }]
 *   placeholder  – texto quando vazio
 *   clearable    – mostra botão de limpar
 *   disabled
 *   error        – booleano
 */
const SearchableSelect = ({
  value, onChange, options = [],
  placeholder = 'Selecione...', clearable = false,
  disabled = false, error = false,
}) => {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const ref               = useRef(null)
  const inputRef          = useRef(null)

  const selected = options.find(o => o.value === value)

  const filtered = query.trim()
    ? options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        (o.sub  && o.sub.toLowerCase().includes(query.toLowerCase()))
      )
    : options

  useEffect(() => {
    if (!open) { setQuery('') }
    else { setTimeout(() => inputRef.current?.focus(), 50) }
  }, [open])

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (val) => { onChange(val); setOpen(false) }

  const triggerStyle = {
    background: 'var(--c-bg2)',
    border: `1px solid ${error ? '#ef4444' : open ? '#f97316' : 'var(--c-bd1)'}`,
    color: selected ? 'var(--c-tx0)' : 'var(--c-tx3)',
    borderRadius: 10,
    padding: '9px 36px 9px 12px',
    fontSize: 13,
    width: '100%',
    outline: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    position: 'relative',
    userSelect: 'none',
    opacity: disabled ? 0.6 : 1,
  }

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger */}
      <div
        style={triggerStyle}
        onClick={() => !disabled && setOpen(o => !o)}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? (
            <>
              {selected.label}
              {selected.sub && (
                <span style={{ color: 'var(--c-tx3)', fontSize: 11, marginLeft: 6 }}>
                  — {selected.sub}
                </span>
              )}
            </>
          ) : placeholder}
        </span>
        <div style={{ position: 'absolute', right: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
          {clearable && value && (
            <button
              onClick={e => { e.stopPropagation(); select('') }}
              style={{ color: 'var(--c-tx3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <X size={13} />
            </button>
          )}
          <ChevronDown size={14} style={{ color: 'var(--c-tx3)', transform: open ? 'rotate(180deg)' : '', transition: '0.15s' }} />
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 999,
          background: 'var(--c-bg1)', border: '1px solid var(--c-bd1)',
          borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          maxHeight: 280, display: 'flex', flexDirection: 'column',
        }}>
          {/* Campo de busca */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--c-bd0)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Search size={13} style={{ color: 'var(--c-tx3)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Pesquisar..."
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: 'var(--c-tx0)', fontSize: 12,
              }}
            />
          </div>

          {/* Opções */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--c-tx3)', textAlign: 'center' }}>
                Nenhum resultado
              </div>
            ) : (
              filtered.map(opt => (
                <div
                  key={opt.value}
                  onClick={() => select(opt.value)}
                  style={{
                    padding: '9px 14px', cursor: 'pointer', fontSize: 13,
                    color: opt.value === value ? '#f97316' : 'var(--c-tx1)',
                    background: opt.value === value ? 'rgba(249,115,22,0.08)' : 'transparent',
                    borderBottom: '1px solid var(--c-bd0)',
                  }}
                  onMouseEnter={e => { if (opt.value !== value) e.currentTarget.style.background = 'var(--c-bg2)' }}
                  onMouseLeave={e => { if (opt.value !== value) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ fontWeight: opt.value === value ? 600 : 400 }}>{opt.label}</div>
                  {opt.sub && (
                    <div style={{ fontSize: 11, color: 'var(--c-tx3)', marginTop: 1 }}>{opt.sub}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchableSelect
