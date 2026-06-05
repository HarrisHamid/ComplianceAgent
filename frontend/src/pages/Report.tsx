import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Download, History, ChevronDown } from 'lucide-react'
import { getReport } from '../lib/api'
import { useScanStore } from '../store/scanStore'
import type { AuditReport, Violation, Severity } from '../types'
import { SEVERITY_ORDER } from '../types'

// ── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const [displayed, setDisplayed] = useState(0)
  const R = 76
  const C = 2 * Math.PI * R
  const color =
    score >= 75 ? '#10b981' :
    score >= 50 ? '#f59e0b' : '#ef4444'

  useEffect(() => {
    const t = setTimeout(() => setDisplayed(score), 200)
    return () => clearTimeout(t)
  }, [score])

  return (
    <div className="relative" style={{ width: 180, height: 180 }}>
      <svg width="180" height="180" viewBox="0 0 180 180">
        {/* track */}
        <circle cx="90" cy="90" r={R} fill="none" stroke="#1f2937" strokeWidth="10" />
        {/* fill */}
        <circle
          cx="90" cy="90" r={R}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="square"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - displayed / 100)}
          className="score-ring-fill"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '90px 90px' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-4xl font-semibold leading-none" style={{ color }}>{displayed}</span>
        <span className="font-mono text-xs text-muted mt-1">/ 100</span>
      </div>
    </div>
  )
}

// ── Severity Badge ────────────────────────────────────────────────────────────
function SevBadge({ sev }: { sev: Severity }) {
  const cfg = {
    critical: { text: 'text-crimson', border: 'border-crimson', bg: 'bg-crimson-dim' },
    high:     { text: 'text-orange',  border: 'border-orange',  bg: 'bg-orange-dim' },
    medium:   { text: 'text-amber',   border: 'border-amber',   bg: 'bg-amber-glow' },
    low:      { text: 'text-muted',   border: 'border-muted',   bg: 'bg-surface' },
  }[sev]
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[9px] font-bold tracking-[0.18em] uppercase border px-2 py-0.5 ${cfg.text} ${cfg.border} ${cfg.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.text.replace('text-', 'bg-')}`} />
      {sev}
    </span>
  )
}

// ── Violation Card ────────────────────────────────────────────────────────────
function ViolationCard({ v, index }: { v: Violation; index: number }) {
  const [open, setOpen] = useState(false)
  const leftColors = {
    critical: '#ef4444',
    high:     '#f97316',
    medium:   '#f59e0b',
    low:      '#6b7280',
  }

  return (
    <div
      className="border border-border bg-surface/60 mb-2 finding-enter"
      style={{
        borderLeft: `3px solid ${leftColors[v.severity]}`,
        animationDelay: `${index * 40}ms`,
      }}
    >
      <button
        className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-elevated/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <SevBadge sev={v.severity} />
            {v.article && (
              <span className="font-mono text-[9px] text-muted border border-border px-1.5 py-0.5">{v.article}</span>
            )}
            {v.category && (
              <span className="font-mono text-[9px] text-secondary/60">{v.category}</span>
            )}
            <span className="font-mono text-[9px] text-muted ml-auto">{v.id}</span>
          </div>
          <div className="font-sans text-sm font-medium text-primary">{v.requirement}</div>
          <div className="font-sans text-xs text-secondary mt-1 line-clamp-2">{v.finding}</div>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted shrink-0 mt-0.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-border/50">
          <div className="mt-4 mb-4">
            <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted mb-2">Finding</div>
            <p className="font-sans text-sm text-secondary leading-relaxed">{v.finding}</p>
          </div>
          <div>
            <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-amber mb-2">Suggested Fix</div>
            <div className="border-l-2 border-amber/30 pl-4">
              <p className="font-sans text-sm text-primary/80 leading-relaxed">{v.suggested_fix}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Report Page ───────────────────────────────────────────────────────────────
export default function Report() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const storeReport = useScanStore((s) => s.report)
  const [report, setReport] = useState<AuditReport | null>(storeReport)
  const [loading, setLoading] = useState(!storeReport)
  const [filterSev, setFilterSev] = useState<Severity | 'all'>('all')
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (storeReport) { setReport(storeReport); return }
    if (!id) return
    getReport(id)
      .then(setReport)
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="font-mono text-xs text-muted animate-pulse tracking-widest">LOADING REPORT...</span>
      </div>
    )
  }
  if (!report) return null

  const sorted = [...report.violations].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  )
  const filtered = filterSev === 'all' ? sorted : sorted.filter((v) => v.severity === filterSev)
  const counts = { critical: 0, high: 0, medium: 0, low: 0 }
  sorted.forEach((v) => counts[v.severity]++)

  function handleExport() {
    window.print()
  }

  const riskLabel =
    report.risk_score >= 70 ? 'HIGH RISK' :
    report.risk_score >= 40 ? 'MODERATE RISK' : 'LOW RISK'
  const riskColor =
    report.risk_score >= 70 ? 'text-crimson border-crimson bg-crimson-dim' :
    report.risk_score >= 40 ? 'text-amber border-amber bg-amber-glow' :
                              'text-emerald border-emerald bg-emerald-dim'

  return (
    <div className="min-h-screen flex flex-col" ref={printRef}>
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-border bg-bg/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 font-mono text-xs text-muted hover:text-primary transition-colors">
            <ArrowLeft className="w-3 h-3" /> NEW AUDIT
          </button>
          <span className="text-border">|</span>
          <span className="font-mono text-xs tracking-[0.2em] uppercase text-secondary">
            COMPLIANCE<span className="text-amber">·</span>AGENT
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/history" className="flex items-center gap-1.5 font-mono text-xs text-muted hover:text-primary transition-colors">
            <History className="w-3 h-3" /> HISTORY
          </Link>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 border border-amber bg-amber-glow hover:bg-amber/20 px-4 py-2 font-mono text-xs text-amber tracking-widest uppercase transition-colors"
          >
            <Download className="w-3 h-3" />
            EXPORT PDF
          </button>
        </div>
      </header>

      {/* Report header */}
      <div className="border-b border-border bg-surface/40">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-start gap-8">

            {/* Left: company info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className={`font-mono text-[9px] font-bold tracking-[0.2em] uppercase border px-2 py-1 ${riskColor}`}>
                  {riskLabel}
                </span>
                <span className="font-mono text-[9px] border border-border text-secondary px-2 py-1 tracking-widest">
                  {report.framework}
                </span>
              </div>
              <h1
                className="font-display text-5xl md:text-6xl text-primary mb-2"
                style={{ letterSpacing: '-0.01em' }}
              >
                {report.company_name}
              </h1>
              <div className="font-mono text-sm text-secondary mb-6">{report.url}</div>

              {/* Meta */}
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                {[
                  ['PAGES CRAWLED', report.pages_crawled],
                  ['VIOLATIONS', report.violations_found],
                  ['CHECKS PASSED', report.checks_passed],
                  ['AUDITED', new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex items-center gap-2">
                    <span className="font-mono text-[9px] tracking-[0.2em] text-muted uppercase">{k}</span>
                    <span className="font-mono text-xs text-secondary">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: score ring */}
            <div className="flex flex-col items-center gap-4">
              <ScoreRing score={report.compliance_score} />
              <div className="font-mono text-[9px] tracking-[0.2em] text-muted uppercase text-center">
                Compliance Score
              </div>
              {/* Severity summary */}
              <div className="grid grid-cols-4 gap-1 w-full">
                {(['critical', 'high', 'medium', 'low'] as Severity[]).map((sev) => {
                  const colors = {
                    critical: 'text-crimson',
                    high:     'text-orange',
                    medium:   'text-amber',
                    low:      'text-muted',
                  }
                  return (
                    <div key={sev} className="flex flex-col items-center py-2 border border-border bg-surface/60">
                      <span className={`font-mono text-lg font-semibold ${colors[sev]}`}>{counts[sev]}</span>
                      <span className="font-mono text-[7px] tracking-widest text-muted uppercase">{sev}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Violations list */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-8 py-8">

        {/* Filter bar */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <span className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase mr-2">Filter</span>
          {(['all', 'critical', 'high', 'medium', 'low'] as const).map((sev) => {
            const active = filterSev === sev
            const count = sev === 'all' ? sorted.length : counts[sev]
            return (
              <button
                key={sev}
                onClick={() => setFilterSev(sev)}
                className={`font-mono text-[10px] tracking-widest uppercase border px-3 py-1.5 transition-all ${
                  active
                    ? 'border-amber bg-amber-glow text-amber'
                    : 'border-border text-muted hover:border-border-active hover:text-secondary'
                }`}
              >
                {sev === 'all' ? 'ALL' : sev} ({count})
              </button>
            )
          })}
          <span className="ml-auto font-mono text-[10px] text-muted">
            {filtered.length} violation{filtered.length !== 1 ? 's' : ''} shown
          </span>
        </div>

        {/* Heading */}
        <div className="flex items-baseline gap-4 mb-6">
          <h2 className="font-display text-3xl text-primary">Violation Report</h2>
          <span className="font-sans text-sm text-muted">Click any finding to expand remediation guidance</span>
        </div>

        {/* Cards */}
        {filtered.length === 0 ? (
          <div className="border border-emerald/20 bg-emerald-dim px-6 py-8 text-center">
            <div className="font-mono text-xs tracking-[0.2em] text-emerald mb-2">✓ NO VIOLATIONS IN THIS CATEGORY</div>
          </div>
        ) : (
          filtered.map((v, i) => <ViolationCard key={v.id} v={v} index={i} />)
        )}
      </div>
    </div>
  )
}
