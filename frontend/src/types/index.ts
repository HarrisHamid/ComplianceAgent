export type Framework = 'gdpr' | 'hipaa' | 'soc2' | 'auto'
export type Severity = 'critical' | 'high' | 'medium' | 'low'
export type ScanPhase = 'crawling' | 'orchestrating' | 'auditing' | 'reporting' | 'complete'
export type ScanStatus = 'idle' | 'running' | 'complete' | 'error'
export type AgentColor = 'blue' | 'violet' | 'emerald' | 'amber' | 'rose' | 'muted'

export interface Violation {
  id: string
  severity: Severity
  requirement: string
  article?: string
  category?: string
  finding: string
  suggested_fix: string
}

export interface AuditReport {
  scan_id: string
  url: string
  company_name: string
  framework: string
  compliance_score: number
  risk_score: number
  violations_found: number
  checks_passed: number
  pages_crawled: number
  created_at: string
  completed_at: string
  violations: Violation[]
  frameworks_detected?: string[]
}

export interface LogEntry {
  id: string
  ts: number
  agent: string
  message: string
  color: AgentColor
}

export interface StreamEvent {
  type: 'phase_change' | 'log' | 'finding' | 'metrics' | 'done' | 'error'
  phase?: number
  phase_label?: string
  agent?: string
  message?: string
  color?: AgentColor
  finding?: Violation
  metrics?: { violations: number; checks_passed: number; risk_score: number }
  report?: AuditReport
  error?: string
}

export interface HistoryItem {
  scan_id: string
  url: string
  company_name: string
  framework: string
  compliance_score: number
  risk_score: number
  status: 'complete' | 'error' | 'running'
  created_at: string
}

export const PHASE_LABELS: Record<number, string> = {
  0: 'CRAWLING',
  1: 'ORCHESTRATING',
  2: 'AUDITING',
  3: 'REPORTING',
}

export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export const FRAMEWORK_LABELS: Record<string, string> = {
  gdpr: 'GDPR',
  hipaa: 'HIPAA',
  soc2: 'SOC 2',
  auto: 'AUTO-DETECT',
  GDPR: 'GDPR',
  HIPAA: 'HIPAA',
  'SOC 2': 'SOC 2',
}
