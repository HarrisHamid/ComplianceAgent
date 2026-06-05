import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Plus } from 'lucide-react'
import { getHistory } from '../lib/api'
import { useScanStore } from '../store/scanStore'
import type { HistoryItem } from '../types'

function ScorePill({ score }: { score: number }) {
  const color =
    score >= 75 ? 'text-emerald border-emerald bg-emerald-dim' :
    score >= 50 ? 'text-amber border-amber bg-amber-glow' :
                  'text-crimson border-crimson bg-crimson-dim'
  return (
    <span className={`font-mono text-xs font-semibold border px-2 py-0.5 ${color}`}>
      {score}
    </span>
  )
}

function RiskBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-crimson' : score >= 40 ? 'bg-amber' : 'bg-emerald'
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1 bg-border">
        <div className={`h-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="font-mono text-xs text-secondary">{score}</span>
    </div>
  )
}

export default function History() {
  const navigate = useNavigate()
  const store = useScanStore()
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<keyof HistoryItem>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    getHistory()
      .then(setItems)
      .finally(() => setLoading(false))
  }, [])

  function toggleSort(field: keyof HistoryItem) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const sorted = [...items].sort((a, b) => {
    const av = a[sortField]
    const bv = b[sortField]
    if (typeof av === 'number' && typeof bv === 'number') {
      return sortDir === 'asc' ? av - bv : bv - av
    }
    return sortDir === 'asc'
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av))
  })

  function handleRowClick(item: HistoryItem) {
    store.reset()
    store.setUrl(item.url)
    navigate(`/report/${item.scan_id}`)
  }

  const TH = ({ field, label }: { field: keyof HistoryItem; label: string }) => (
    <th
      className="px-5 py-3 font-mono text-[9px] tracking-[0.2em] uppercase text-muted text-left cursor-pointer hover:text-secondary transition-colors select-none"
      onClick={() => toggleSort(field)}
    >
      {label}
      {sortField === field && (
        <span className="ml-1 text-amber">{sortDir === 'asc' ? '↑' : '↓'}</span>
      )}
    </th>
  )

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 bg-bg/70 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-amber animate-pulse" />
          <Link to="/" className="font-mono text-xs tracking-[0.2em] uppercase text-secondary hover:text-primary transition-colors">
            COMPLIANCE<span className="text-amber">·</span>AGENT
          </Link>
        </div>
        <nav className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-1.5 font-mono text-xs tracking-widest uppercase text-muted hover:text-amber transition-colors">
            <ArrowLeft className="w-3 h-3" /> Home
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 bg-amber hover:bg-amber/90 text-bg font-sans font-semibold text-xs tracking-[0.14em] uppercase px-4 py-2 transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-3 h-3" /> New Audit
          </Link>
        </nav>
      </header>

      <div className="max-w-6xl mx-auto w-full px-8 py-10 flex-1">

        {/* Title */}
        <div className="mb-8">
          <div className="font-mono text-[10px] tracking-[0.28em] uppercase text-amber mb-3">Audit Registry</div>
          <h1 className="font-display text-5xl text-primary">History</h1>
        </div>

        {/* Summary pills */}
        <div className="flex gap-4 mb-8">
          {[
            { label: 'TOTAL AUDITS',  value: items.length },
            { label: 'AVG SCORE',     value: items.length ? Math.round(items.reduce((s, i) => s + i.compliance_score, 0) / items.length) : '—' },
            { label: 'HIGH RISK',     value: items.filter(i => i.risk_score >= 70).length },
          ].map(({ label, value }) => (
            <div key={label} className="border border-border bg-surface px-5 py-3">
              <div className="font-mono text-xl font-semibold text-primary">{value}</div>
              <div className="font-mono text-[9px] tracking-[0.2em] text-muted uppercase mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-16 text-center font-mono text-xs text-muted animate-pulse tracking-widest">
            LOADING AUDIT REGISTRY...
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-16 text-center">
            <div className="font-mono text-xs text-muted mb-4">No audits run yet.</div>
            <Link to="/" className="font-mono text-xs text-amber hover:underline">Run your first audit →</Link>
          </div>
        ) : (
          <div className="border border-border overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-border bg-surface/80">
                <tr>
                  <TH field="url"              label="URL" />
                  <TH field="framework"        label="Framework" />
                  <TH field="compliance_score" label="Score" />
                  <TH field="risk_score"       label="Risk" />
                  <TH field="created_at"       label="Date" />
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((item, i) => (
                  <tr
                    key={item.scan_id}
                    onClick={() => handleRowClick(item)}
                    className="border-b border-border/50 last:border-b-0 hover:bg-surface/60 cursor-pointer transition-colors group"
                  >
                    <td className="px-5 py-4">
                      <div className="font-sans text-sm font-medium text-primary truncate max-w-48">
                        {item.company_name}
                      </div>
                      <div className="font-mono text-[10px] text-muted truncate max-w-48">{item.url}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-[10px] tracking-widest border border-border text-secondary px-2 py-0.5">
                        {item.framework}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <ScorePill score={item.compliance_score} />
                    </td>
                    <td className="px-5 py-4">
                      <RiskBar score={item.risk_score} />
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-secondary">
                      {new Date(item.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-4">
                      <ArrowUpRight className="w-3.5 h-3.5 text-muted group-hover:text-amber transition-colors" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-surface/40 px-8 py-6 mt-auto">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-amber" />
            <span className="font-mono text-xs tracking-[0.2em] uppercase text-secondary">
              COMPLIANCE<span className="text-amber">·</span>AGENT
            </span>
          </div>
          <span className="font-mono text-[10px] text-muted/40 tracking-widest">Powered by Claude</span>
        </div>
      </footer>
    </div>
  )
}
