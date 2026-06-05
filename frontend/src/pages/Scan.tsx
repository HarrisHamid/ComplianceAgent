import { useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { streamAudit } from '../lib/api'
import { useScanStore } from '../store/scanStore'
import type { Severity } from '../types'
import { PHASE_LABELS } from '../types'

const AGENT_COLORS: Record<string, string> = {
  crawler:          'text-blue',
  orchestrator:     'text-violet',
  gdpr_agent:       'text-emerald',
  hipaa_agent:      'text-amber',
  soc2_agent:       'text-rose',
  reporter:         'text-secondary',
}

function severityColor(s: Severity) {
  return {
    critical: 'text-crimson border-crimson',
    high:     'text-orange border-orange',
    medium:   'text-amber border-amber',
    low:      'text-muted border-muted',
  }[s]
}

function severityBg(s: Severity) {
  return {
    critical: 'bg-crimson-dim',
    high:     'bg-orange-dim',
    medium:   'bg-amber-glow',
    low:      'bg-surface',
  }[s]
}

function PhaseBar({ currentPhase }: { currentPhase: number }) {
  return (
    <div className="flex items-center gap-0 px-8 py-4 border-b border-border overflow-x-auto">
      {[0, 1, 2, 3].map((i) => {
        const done    = i < currentPhase
        const active  = i === currentPhase
        const pending = i > currentPhase
        return (
          <div key={i} className="flex items-center min-w-0">
            {i > 0 && (
              <div className={`w-8 md:w-16 h-px mx-1 ${done || active ? 'bg-amber/40' : 'bg-border'}`} />
            )}
            <div className={`flex items-center gap-2 px-3 py-1.5 border transition-all whitespace-nowrap ${
              active  ? 'border-amber bg-amber-glow phase-active' :
              done    ? 'border-emerald/40 bg-emerald-dim' :
                        'border-border bg-surface'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                active  ? 'bg-amber animate-pulse' :
                done    ? 'bg-emerald' :
                          'bg-border'
              }`} />
              <span className={`font-mono text-[10px] tracking-[0.18em] font-semibold ${
                active  ? 'text-amber' :
                done    ? 'text-emerald' :
                          'text-muted'
              }`}>
                {PHASE_LABELS[i]}
              </span>
              {done && <span className="font-mono text-[9px] text-emerald">✓</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Scan() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const store = useScanStore()
  const logRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!id || startedRef.current) return
    if (!store.url) {
      navigate('/')
      return
    }
    startedRef.current = true

    const cleanup = streamAudit(
      id,
      store.url,
      store.framework,
      (event) => {
        if (event.type === 'phase_change' && event.phase !== undefined) {
          const labels = ['crawling', 'orchestrating', 'auditing', 'reporting', 'complete'] as const
          store.setPhase(labels[event.phase] ?? 'crawling', event.phase)
        }
        if (event.type === 'log' && event.agent && event.message) {
          store.addLog({ agent: event.agent, message: event.message, color: event.color ?? 'muted' })
        }
        if (event.type === 'finding' && event.finding) {
          store.addFinding(event.finding)
        }
        if (event.type === 'metrics' && event.metrics) {
          store.updateMetrics(event.metrics.violations, event.metrics.checks_passed, event.metrics.risk_score)
        }
      },
      (report) => {
        store.setReport(report)
        store.setPhase('complete', 4)
        setTimeout(() => navigate(`/report/${id}`), 1200)
      },
      (err) => {
        store.setStatus('error')
        store.addLog({ agent: 'system', message: `✖ ${err}`, color: 'rose' })
      }
    )
    return cleanup
  }, [id])

  // auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [store.logs])

  const riskColor =
    store.risk_score >= 70 ? 'text-crimson' :
    store.risk_score >= 40 ? 'text-amber' : 'text-emerald'

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-border bg-bg/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link to="/" className="font-mono text-xs tracking-[0.2em] uppercase text-secondary hover:text-primary transition-colors">
            COMPLIANCE<span className="text-amber">·</span>AGENT
          </Link>
          <span className="text-border">|</span>
          <span className="font-mono text-xs text-muted truncate max-w-48">{store.url}</span>
        </div>
        <Link to="/history" className="font-mono text-xs tracking-widest uppercase text-muted hover:text-primary transition-colors">
          History
        </Link>
      </header>

      {/* Phase bar */}
      <PhaseBar currentPhase={store.phaseIndex} />

      {/* Metrics row */}
      <div className="grid grid-cols-3 border-b border-border">
        {[
          { label: 'VIOLATIONS FOUND', value: store.violations_found, color: store.violations_found > 0 ? 'text-crimson' : 'text-secondary' },
          { label: 'CHECKS PASSED',    value: store.checks_passed,    color: 'text-emerald' },
          { label: 'RISK SCORE',       value: store.risk_score || '—', color: riskColor },
        ].map((m) => (
          <div key={m.label} className="flex flex-col items-center justify-center py-5 border-r last:border-r-0 border-border bg-surface/40">
            <div className={`font-mono text-3xl md:text-4xl font-semibold ${m.color} count-in`}>{m.value}</div>
            <div className="font-mono text-[9px] tracking-[0.22em] text-muted mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2">

        {/* Agent log */}
        <div className="flex flex-col border-r border-border">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
            <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted">Agent Log</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse ml-auto" />
          </div>
          <div
            ref={logRef}
            className="flex-1 overflow-y-auto log-terminal font-mono text-xs leading-relaxed p-4 space-y-0.5"
            style={{ maxHeight: 'calc(100vh - 260px)', minHeight: '300px' }}
          >
            {store.logs.map((log) => {
              const agentColor = AGENT_COLORS[log.agent] ?? 'text-secondary'
              return (
                <div key={log.id} className="flex gap-2 py-0.5">
                  <span className={`${agentColor} shrink-0 font-semibold`}>[{log.agent}]</span>
                  <span className="text-secondary/80">{log.message}</span>
                </div>
              )
            })}
            {store.status !== 'complete' && store.logs.length > 0 && (
              <div className="py-0.5">
                <span className="cursor text-muted text-xs" />
              </div>
            )}
            {store.logs.length === 0 && (
              <div className="text-muted/40 text-xs pt-2">Waiting for agents...</div>
            )}
          </div>
        </div>

        {/* Live findings */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
            <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted">Live Findings</span>
            {store.live_findings.length > 0 && (
              <span className="font-mono text-[10px] text-crimson ml-auto">
                {store.live_findings.length} flagged
              </span>
            )}
          </div>
          <div
            className="flex-1 overflow-y-auto p-4 space-y-2"
            style={{ maxHeight: 'calc(100vh - 260px)', minHeight: '300px' }}
          >
            {store.live_findings.length === 0 && (
              <div className="text-muted/40 font-mono text-xs pt-2">
                Violations will appear here as agents report them...
              </div>
            )}
            {[...store.live_findings].reverse().map((v, i) => (
              <div
                key={v.id}
                className={`finding-enter border-b border-border/50 pb-2 ${severityBg(v.severity)} px-3 py-2.5 sev-${v.severity}`}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-mono text-[9px] font-bold tracking-[0.18em] uppercase border px-1.5 py-0.5 ${severityColor(v.severity)}`}>
                    {v.severity}
                  </span>
                  <span className="font-mono text-[9px] text-muted">{v.id}</span>
                </div>
                <div className="font-sans text-xs font-medium text-primary leading-snug">{v.requirement}</div>
                {v.article && (
                  <div className="font-mono text-[9px] text-muted mt-0.5">{v.article}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Complete overlay */}
      {store.status === 'complete' && (
        <div className="fixed inset-0 flex items-center justify-center bg-bg/80 backdrop-blur-sm z-50">
          <div className="border border-emerald/30 bg-surface px-12 py-8 text-center">
            <div className="w-3 h-3 rounded-full bg-emerald mx-auto mb-4 animate-pulse" />
            <div className="font-mono text-xs tracking-[0.2em] text-emerald mb-2">AUDIT COMPLETE</div>
            <div className="font-display text-2xl text-primary mb-1">Generating Report</div>
            <div className="font-mono text-xs text-muted">Redirecting...</div>
          </div>
        </div>
      )}
    </div>
  )
}
