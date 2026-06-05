import { create } from 'zustand'
import type { Framework, ScanPhase, ScanStatus, LogEntry, Violation, AuditReport } from '../types'

interface ScanState {
  scan_id: string | null
  url: string
  framework: Framework
  phase: ScanPhase
  phaseIndex: number
  status: ScanStatus
  violations_found: number
  checks_passed: number
  risk_score: number
  logs: LogEntry[]
  live_findings: Violation[]
  report: AuditReport | null

  setUrl: (url: string) => void
  setFramework: (fw: Framework) => void
  setScanId: (id: string) => void
  setPhase: (phase: ScanPhase, phaseIndex: number) => void
  setStatus: (status: ScanStatus) => void
  addLog: (log: Omit<LogEntry, 'id' | 'ts'>) => void
  addFinding: (finding: Violation) => void
  updateMetrics: (v: number, c: number, r: number) => void
  setReport: (report: AuditReport) => void
  reset: () => void
}

const initialState = {
  scan_id: null,
  url: '',
  framework: 'auto' as Framework,
  phase: 'crawling' as ScanPhase,
  phaseIndex: 0,
  status: 'idle' as ScanStatus,
  violations_found: 0,
  checks_passed: 0,
  risk_score: 0,
  logs: [] as LogEntry[],
  live_findings: [] as Violation[],
  report: null,
}

export const useScanStore = create<ScanState>((set) => ({
  ...initialState,

  setUrl: (url) => set({ url }),
  setFramework: (framework) => set({ framework }),
  setScanId: (scan_id) => set({ scan_id }),
  setPhase: (phase, phaseIndex) => set({ phase, phaseIndex }),
  setStatus: (status) => set({ status }),

  addLog: (entry) =>
    set((s) => ({
      logs: [
        ...s.logs,
        { ...entry, id: Math.random().toString(36).slice(2), ts: Date.now() },
      ].slice(-200),
    })),

  addFinding: (finding) =>
    set((s) => ({ live_findings: [...s.live_findings, finding] })),

  updateMetrics: (violations_found, checks_passed, risk_score) =>
    set({ violations_found, checks_passed, risk_score }),

  setReport: (report) => set({ report, status: 'complete' }),

  reset: () => set({ ...initialState }),
}))
