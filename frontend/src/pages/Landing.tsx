import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowRight, Globe, Zap, Shield, Check, X, History } from 'lucide-react'
import { startAudit } from '../lib/api'
import { useScanStore } from '../store/scanStore'
import type { Framework } from '../types'
import { HeroGeometric } from '../components/ui/shape-landing-hero'

// ─── Data ──────────────────────────────────────────────────────────────────────

const FRAMEWORKS: { id: Framework; label: string; desc: string; color: string; border: string; bg: string }[] = [
  { id: 'gdpr',  label: 'GDPR',  desc: 'EU Data Protection',    color: '#10B981', border: 'rgba(16,185,129,0.55)',  bg: 'rgba(16,185,129,0.08)'  },
  { id: 'hipaa', label: 'HIPAA', desc: 'Health Data Privacy',   color: '#06B6D4', border: 'rgba(6,182,212,0.55)',   bg: 'rgba(6,182,212,0.08)'   },
  { id: 'soc2',  label: 'SOC 2', desc: 'Security Controls',     color: '#8B5CF6', border: 'rgba(139,92,246,0.55)', bg: 'rgba(139,92,246,0.08)' },
  { id: 'auto',  label: 'AUTO',  desc: 'Let the AI choose',     color: '#F59E0B', border: 'rgba(245,158,11,0.55)',  bg: 'rgba(245,158,11,0.08)'  },
]

const STATS = [
  { value: 847,  suffix: 'M', prefix: '$', label: 'Average GDPR enforcement fine',  color: '#EF4444', sub: 'EU fines in 2024 alone' },
  { value: 72,   suffix: 'hr',             label: 'Breach notification window',      color: '#F59E0B', sub: 'Legal requirement, not optional' },
  { value: 350,  suffix: '/hr', prefix: '$',label: 'Avg. compliance consultant rate', color: '#8B5CF6', sub: 'Before travel & expenses' },
  { value: 2,    suffix: 'min',             label: 'Our audit completion time',       color: '#10B981', sub: 'vs weeks of back-and-forth' },
]

const TICKER = [
  'GDPR ART. 6', 'LAWFUL BASIS', 'ART. 13 DISCLOSURE', 'RIGHT TO ERASURE', 'DATA BREACH 72HR',
  'HIPAA §164.312', 'PHI ENCRYPTION', 'ACCESS CONTROLS', 'BAA AGREEMENTS', 'WORKFORCE TRAINING',
  'SOC 2 CC6.1', 'INCIDENT RESPONSE', 'CC7.2', 'VENDOR RISK CC9.1', 'CHANGE MANAGEMENT CC8.1',
]

const OLD_WAY = [
  '$50,000+ annual retainer fees',
  '4–8 week audit cycle per framework',
  '150-page PDF that gathers dust',
  'One framework per engagement',
  'Findings lost in email threads',
]

const NEW_WAY = [
  'Under $50 per full audit',
  'Complete report in 90 seconds',
  'Actionable fixes, not jargon',
  'GDPR + HIPAA + SOC 2 simultaneously',
  'Shareable link, always live',
]

const STEPS = [
  { num: '01', title: 'Enter a URL', icon: Globe, color: '#06B6D4',
    desc: 'Paste any company URL. Our crawler discovers every policy, legal, and security page automatically.' },
  { num: '02', title: 'Agents Audit in Parallel', icon: Zap, color: '#8B5CF6',
    desc: 'Specialist AI agents simultaneously check each clause against GDPR, HIPAA, and SOC 2 requirements.' },
  { num: '03', title: 'Get Actionable Results', icon: Shield, color: '#10B981',
    desc: 'Prioritized violations with severity ratings and specific remediation steps — not boilerplate paragraphs.' },
]

// ─── Hooks ─────────────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1800) {
  const [count, setCount] = useState(0)
  const started = useRef(false)

  const trigger = () => {
    if (started.current) return
    started.current = true
    let t0: number | null = null
    const ease = (t: number) => 1 - Math.pow(1 - t, 3)
    const step = (ts: number) => {
      if (!t0) t0 = ts
      const p = Math.min((ts - t0) / duration, 1)
      setCount(Math.round(ease(p) * target))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  return { count, trigger }
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true) },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  return [ref, inView] as const
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ stat, delay }: { stat: typeof STATS[0]; delay: number }) {
  const { count, trigger } = useCountUp(stat.value)
  const [ref, inView] = useInView()

  useEffect(() => {
    if (!inView) return
    const t = setTimeout(trigger, delay)
    return () => clearTimeout(t)
  }, [inView])

  return (
    <div ref={ref} className="flex flex-col items-center text-center px-6 py-8 border border-border bg-surface/50 hover:bg-surface transition-colors">
      <div className="flex items-baseline gap-0.5 mb-2">
        {stat.prefix && <span className="font-mono text-2xl font-semibold" style={{ color: stat.color }}>{stat.prefix}</span>}
        <span className="font-mono text-5xl md:text-6xl font-semibold tabular-nums" style={{ color: stat.color }}>
          {count}
        </span>
        <span className="font-mono text-2xl font-semibold" style={{ color: stat.color }}>{stat.suffix}</span>
      </div>
      <div className="font-sans text-sm font-medium text-primary mb-1">{stat.label}</div>
      <div className="font-mono text-[10px] text-muted tracking-wider">{stat.sub}</div>
    </div>
  )
}

function AuditForm({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate()
  const store = useScanStore()
  const [url, setUrl] = useState('')
  const [framework, setFramework] = useState<Framework>('auto')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const trimmed = url.trim()
    if (!trimmed) { setError('Enter a URL to audit'); return }
    let finalUrl = trimmed
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl
    setLoading(true)
    try {
      const id = await startAudit(finalUrl, framework)
      store.reset()
      store.setUrl(finalUrl)
      store.setFramework(framework)
      store.setScanId(id)
      store.setStatus('running')
      navigate(`/scan/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start audit')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      {/* URL input */}
      <div className="relative mb-3 border border-border bg-surface/80 focus-within:border-amber transition-colors backdrop-blur-sm">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm text-amber select-none pointer-events-none">
          ›_
        </span>
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://company.com"
          className="w-full bg-transparent font-mono text-base text-primary placeholder:text-muted pl-10 pr-4 py-4 outline-none"
        />
      </div>

      {/* Framework selector */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {FRAMEWORKS.map(fw => (
          <button
            key={fw.id}
            type="button"
            onClick={() => setFramework(fw.id)}
            className="py-3 px-2 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              border: `1px solid ${framework === fw.id ? fw.border : 'rgba(31,41,55,1)'}`,
              background: framework === fw.id ? fw.bg : 'rgba(17,24,39,0.6)',
            }}
          >
            <div className="font-mono text-xs font-bold tracking-widest mb-0.5" style={{ color: framework === fw.id ? fw.color : '#9ca3af' }}>
              {fw.label}
            </div>
            {!compact && <div className="font-sans text-[10px] text-muted leading-tight">{fw.desc}</div>}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-3 font-mono text-xs text-crimson border border-crimson/30 bg-crimson-dim px-4 py-2">
          ⚠ {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 font-sans font-semibold text-sm tracking-[0.15em] uppercase py-5 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
        style={{
          background: loading ? '#7a5a1a' : '#F59E0B',
          color: '#0a0d14',
          boxShadow: loading ? 'none' : '0 0 0 0 rgba(245,158,11,0)',
          transition: 'all 0.2s, box-shadow 0.3s',
        }}
        onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 28px rgba(245,158,11,0.45), 0 0 60px rgba(245,158,11,0.15)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none' }}
      >
        {loading ? (
          <span className="font-mono text-xs animate-pulse tracking-widest">INITIALIZING AGENTS...</span>
        ) : (
          <>RUN COMPLIANCE AUDIT <ArrowRight className="w-4 h-4" /></>
        )}
      </button>
    </form>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Landing() {
  const [statsRef, statsInView] = useInView(0.1)
  const [problemRef, problemInView] = useInView(0.1)
  const [stepsRef, stepsInView] = useInView(0.1)
  const [appRef, appInView] = useInView(0.1)
  const appSectionRef = useRef<HTMLElement>(null)

  function scrollToApp() {
    appSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg">

      {/* ── Fixed Header ── */}
      <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 py-4 bg-bg/70 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-amber animate-pulse" />
          <span className="font-mono text-xs tracking-[0.2em] uppercase text-secondary">
            COMPLIANCE<span className="text-amber">·</span>AGENT
          </span>
        </div>
        <nav className="flex items-center gap-6">
          <button onClick={scrollToApp} className="font-mono text-xs tracking-widest uppercase text-muted hover:text-amber transition-colors">
            Try It
          </button>
          <Link to="/history" className="flex items-center gap-1.5 font-mono text-xs tracking-widest uppercase text-muted hover:text-primary transition-colors">
            <History className="w-3 h-3" /> History
          </Link>
        </nav>
      </header>

      {/* ── HERO ── */}
      <HeroGeometric
        badge="Multi-Agent AI · GDPR · HIPAA · SOC 2"
        title1="Your Audit Consultant"
        title2="Just Got Automated."
      >
        <div className="flex flex-col items-center gap-4 pt-2">
          <button
            onClick={scrollToApp}
            className="inline-flex items-center gap-3 border border-amber/40 bg-amber-glow hover:bg-amber/15 px-8 py-4 font-sans font-semibold text-sm tracking-[0.15em] uppercase text-amber transition-all hover:-translate-y-0.5"
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 24px rgba(245,158,11,0.35)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none' }}
          >
            Run your first audit <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={scrollToApp}
            className="flex flex-col items-center gap-2 opacity-40 hover:opacity-70 transition-opacity cursor-pointer mt-4"
          >
            <div className="w-px h-8 bg-gradient-to-b from-white/40 to-transparent" />
          </button>
        </div>
      </HeroGeometric>

      {/* ── MARQUEE TICKER ── */}
      <div className="border-y border-border bg-surface/80 backdrop-blur-sm py-3 overflow-hidden">
        <div
          className="flex gap-8 whitespace-nowrap"
          style={{ animation: 'marquee 35s linear infinite', width: 'max-content' }}
        >
          {[...TICKER, ...TICKER].map((item, i) => (
            <span key={i} className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted/60 flex items-center gap-8">
              {item}
              <span className="w-1 h-1 rounded-full bg-amber/30 inline-block" />
            </span>
          ))}
        </div>
      </div>

      {/* ── STATS ── */}
      <section ref={statsRef} className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div
            className={`reveal-up text-center mb-12 ${statsInView ? 'in-view' : ''}`}
          >
            <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-amber block mb-3">By the numbers</span>
            <h2 className="font-display text-4xl text-primary">The cost of non-compliance</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 border border-border divide-y md:divide-y-0 md:divide-x divide-border">
            {STATS.map((stat, i) => (
              <StatCard key={i} stat={stat} delay={i * 120} />
            ))}
          </div>
        </div>
      </section>

      {/* ── PROBLEM vs SOLUTION ── */}
      <section ref={problemRef} className="py-20 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className={`reveal-up text-center mb-14 ${problemInView ? 'in-view' : ''}`}>
            <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-amber block mb-3">Why switch</span>
            <h2 className="font-display text-4xl text-primary">Old way vs. new way</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-px bg-border">
            {/* Old way */}
            <div
              className={`reveal-up bg-bg p-8 ${problemInView ? 'in-view' : ''}`}
              style={{ transitionDelay: '0.1s' }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-2 bg-crimson rounded-full" />
                <span className="font-mono text-xs tracking-[0.2em] uppercase text-crimson font-semibold">The Old Way</span>
                <span className="font-mono text-[10px] text-muted ml-auto">Compliance consultants</span>
              </div>
              <ul className="space-y-4">
                {OLD_WAY.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-none border border-crimson/40 bg-crimson-dim flex items-center justify-center shrink-0 mt-0.5">
                      <X className="w-3 h-3 text-crimson" />
                    </div>
                    <span className="font-sans text-sm text-secondary">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 border-t border-border pt-6">
                <div className="font-mono text-[10px] text-muted uppercase tracking-widest mb-1">Annual cost</div>
                <div className="font-mono text-3xl font-semibold text-crimson">$50,000+</div>
              </div>
            </div>

            {/* New way */}
            <div
              className={`reveal-up bg-bg p-8 ${problemInView ? 'in-view' : ''}`}
              style={{ transitionDelay: '0.25s' }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-2 bg-emerald rounded-full" />
                <span className="font-mono text-xs tracking-[0.2em] uppercase text-emerald font-semibold">The New Way</span>
                <span className="font-mono text-[10px] text-muted ml-auto">ComplianceAgent</span>
              </div>
              <ul className="space-y-4">
                {NEW_WAY.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-none border border-emerald/40 bg-emerald-dim flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-emerald" />
                    </div>
                    <span className="font-sans text-sm text-primary">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 border-t border-emerald/20 pt-6">
                <div className="font-mono text-[10px] text-muted uppercase tracking-widest mb-1">Per audit</div>
                <div className="font-mono text-3xl font-semibold text-emerald">Under $50</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section ref={stepsRef} className="py-20 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className={`reveal-up text-center mb-14 ${stepsInView ? 'in-view' : ''}`}>
            <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-amber block mb-3">Process</span>
            <h2 className="font-display text-4xl text-primary">Three steps. Ninety seconds.</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-border">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <div
                  key={i}
                  className={`reveal-up bg-bg p-8 group hover:bg-surface transition-colors ${stepsInView ? 'in-view' : ''}`}
                  style={{ transitionDelay: `${i * 0.15}s` }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div
                      className="w-12 h-12 flex items-center justify-center border"
                      style={{ borderColor: `${step.color}55`, background: `${step.color}11` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: step.color }} />
                    </div>
                    <span className="font-mono text-4xl font-semibold text-border group-hover:text-muted/30 transition-colors">
                      {step.num}
                    </span>
                  </div>
                  <h3
                    className="font-display text-2xl mb-3 transition-colors"
                    style={{ color: '#f9fafb' }}
                  >
                    {step.title}
                  </h3>
                  <p className="font-sans text-sm text-secondary leading-relaxed">{step.desc}</p>
                  <div className="mt-6 h-px w-0 group-hover:w-full transition-all duration-500" style={{ background: `${step.color}60` }} />
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── APP SECTION ── */}
      <section ref={appSectionRef as React.RefObject<HTMLElement>} className="py-24 px-6 border-t border-border relative overflow-hidden">
        {/* Subtle glow behind app */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px]"
            style={{
              background: 'radial-gradient(ellipse, rgba(245,158,11,0.08) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />
        </div>

        <div ref={appRef} className="max-w-2xl mx-auto relative z-10">
          <div className={`reveal-up text-center mb-10 ${appInView ? 'in-view' : ''}`}>
            <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-amber block mb-3">
              Try it right now — it's free
            </span>
            <h2 className="font-display text-5xl text-primary mb-4">
              Audit any company<br />
              <span className="gradient-text italic">in under 2 minutes.</span>
            </h2>
            <p className="font-sans text-base text-secondary">
              No sign-up. No credit card. Just paste a URL.
            </p>
          </div>

          {/* Terminal frame */}
          <div
            className={`reveal-up border border-border bg-surface/80 backdrop-blur-sm ${appInView ? 'in-view' : ''}`}
            style={{ transitionDelay: '0.2s' }}
          >
            {/* Terminal title bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-crimson/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald/70" />
              </div>
              <span className="font-mono text-[10px] text-muted tracking-widest mx-auto">compliance-agent — audit</span>
            </div>
            <div className="p-6">
              <AuditForm compact />
            </div>
          </div>

          {/* Trust signals */}
          <div className={`reveal-up flex items-center justify-center gap-8 mt-8 ${appInView ? 'in-view' : ''}`} style={{ transitionDelay: '0.4s' }}>
            {[
              { color: '#10B981', label: 'GDPR' },
              { color: '#06B6D4', label: 'HIPAA' },
              { color: '#8B5CF6', label: 'SOC 2' },
            ].map(fw => (
              <div key={fw.label} className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: fw.color }} />
                <span className="font-mono text-[10px] tracking-[0.2em] text-muted">{fw.label} covered</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border bg-surface/40 px-8 py-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-amber" />
            <span className="font-mono text-xs tracking-[0.2em] uppercase text-secondary">
              COMPLIANCE<span className="text-amber">·</span>AGENT
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/history" className="font-mono text-xs text-muted hover:text-primary transition-colors tracking-widest uppercase">
              History
            </Link>
            <span className="font-mono text-[10px] text-muted/40 tracking-widest">
              Powered by Claude
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
