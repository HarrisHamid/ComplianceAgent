import type { AuditReport, HistoryItem, StreamEvent } from '../types'
import { getMockEvents, MOCK_HISTORY, GDPR_VIOLATIONS, HIPAA_VIOLATIONS, SOC2_VIOLATIONS } from './mockData'

const USE_MOCK = true

let mockReportStore: Record<string, AuditReport> = {}

export async function startAudit(url: string, framework: string): Promise<string> {
  if (USE_MOCK) {
    const id = Math.random().toString(36).slice(2, 10)
    return id
  }
  const res = await fetch('/api/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, framework }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to start audit')
  return data.scan_id
}

export function streamAudit(
  scanId: string,
  url: string,
  framework: string,
  onEvent: (e: StreamEvent) => void,
  onDone: (report: AuditReport) => void,
  onError: (msg: string) => void
): () => void {
  if (USE_MOCK) {
    const events = getMockEvents(url, framework)
    const timers: ReturnType<typeof setTimeout>[] = []
    events.forEach(({ delay, event }) => {
      const t = setTimeout(() => {
        if (event.type === 'done' && event.report) {
          const report = { ...event.report, scan_id: scanId }
          mockReportStore[scanId] = report
          onDone(report)
        } else {
          onEvent(event)
        }
      }, delay)
      timers.push(t)
    })
    return () => timers.forEach(clearTimeout)
  }

  const es = new EventSource(`/api/audit/${scanId}/stream`)
  es.onmessage = (e) => {
    const data: StreamEvent = JSON.parse(e.data)
    if (data.type === 'done' && data.report) {
      es.close()
      onDone(data.report)
    } else if (data.type === 'error') {
      es.close()
      onError(data.error || 'Stream error')
    } else {
      onEvent(data)
    }
  }
  es.onerror = () => {
    es.close()
    onError('Connection lost. Please retry.')
  }
  return () => es.close()
}

export async function getReport(scanId: string): Promise<AuditReport> {
  if (USE_MOCK) {
    const r = mockReportStore[scanId]
    if (r) return r
    const historyItem = MOCK_HISTORY.find((h) => h.scan_id === scanId)
    if (historyItem) {
      const fw = historyItem.framework
      const allViolations =
        fw === 'GDPR' ? GDPR_VIOLATIONS : fw === 'HIPAA' ? HIPAA_VIOLATIONS : SOC2_VIOLATIONS
      const violations = allViolations.slice(0, -3)
      const report: AuditReport = {
        scan_id: historyItem.scan_id,
        url: historyItem.url,
        company_name: historyItem.company_name,
        framework: fw,
        compliance_score: historyItem.compliance_score,
        risk_score: historyItem.risk_score,
        violations_found: violations.length,
        checks_passed: 35 - violations.length,
        pages_crawled: 9,
        created_at: historyItem.created_at,
        completed_at: historyItem.created_at,
        violations,
      }
      mockReportStore[scanId] = report
      return report
    }
    throw new Error('Report not found')
  }
  const res = await fetch(`/api/audit/${scanId}/report`)
  if (!res.ok) throw new Error('Report not found')
  return res.json()
}

export async function getHistory(): Promise<HistoryItem[]> {
  if (USE_MOCK) return MOCK_HISTORY
  const res = await fetch('/api/audits')
  if (!res.ok) throw new Error('Failed to load history')
  return res.json()
}
