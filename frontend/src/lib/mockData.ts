import type { Violation, AuditReport, HistoryItem, StreamEvent } from '../types'

const GDPR_VIOLATIONS: Violation[] = [
  {
    id: 'GDPR-6-1',
    severity: 'critical',
    requirement: 'Lawful basis for processing',
    article: 'Art. 6(1)',
    category: 'Legal Basis',
    finding: 'No explicit lawful basis for processing personal data is stated. The privacy policy references "legitimate interests" without specifying what those interests are or providing a balancing test.',
    suggested_fix: 'Explicitly state the lawful basis for each category of data processing (consent, contract, legal obligation, vital interests, public task, or legitimate interests) and document the balancing test for legitimate interests.',
  },
  {
    id: 'GDPR-13-1',
    severity: 'critical',
    requirement: 'Transparency at point of collection',
    article: 'Art. 13',
    category: 'Transparency',
    finding: 'Privacy notice is not presented at the time of data collection. Users complete registration before being linked to the privacy policy, violating the requirement for just-in-time disclosure.',
    suggested_fix: 'Display a clear link to the privacy notice at every data collection point (signup, checkout, contact forms) with a timestamp-logged acknowledgment.',
  },
  {
    id: 'GDPR-37-1',
    severity: 'high',
    requirement: 'Data Protection Officer designation',
    article: 'Art. 37',
    category: 'Accountability',
    finding: 'No Data Protection Officer (DPO) contact information is published. Given the scale of data processing, a DPO appointment appears mandatory under Art. 37(1)(b).',
    suggested_fix: 'Appoint a DPO and publish their contact details prominently in the privacy policy and on the company\'s website.',
  },
  {
    id: 'GDPR-17-1',
    severity: 'high',
    requirement: 'Right to erasure ("right to be forgotten")',
    article: 'Art. 17',
    category: 'Data Subject Rights',
    finding: 'The privacy policy acknowledges the right to erasure but provides no mechanism for exercising it — no email, form, or process is specified. The stated 90-day response window exceeds the statutory 30-day requirement.',
    suggested_fix: 'Provide a dedicated erasure request mechanism (web form preferred) with a documented 30-day maximum response SLA.',
  },
  {
    id: 'GDPR-7-3',
    severity: 'high',
    requirement: 'Right to withdraw consent',
    article: 'Art. 7(3)',
    category: 'Consent',
    finding: 'While consent is collected for marketing communications, no mechanism for withdrawing consent is described. The unsubscribe process mentions a 14-day processing delay, which is not permitted.',
    suggested_fix: 'Implement immediate consent withdrawal, processable within one business day. Add clear "withdraw consent" functionality in user account settings and marketing emails.',
  },
  {
    id: 'GDPR-28-1',
    severity: 'high',
    requirement: 'Data processor agreements',
    article: 'Art. 28',
    category: 'Third Parties',
    finding: 'Third-party processors are listed (AWS, Stripe, Intercom, Segment) but no confirmation of Data Processing Agreements (DPAs) is provided. Several listed processors have not committed to GDPR-compliant sub-processing.',
    suggested_fix: 'Execute and document DPAs with all data processors. Publish a sub-processor list with DPA confirmation dates.',
  },
  {
    id: 'GDPR-33-1',
    severity: 'medium',
    requirement: 'Personal data breach notification',
    article: 'Art. 33',
    category: 'Security',
    finding: 'No breach notification procedure is described. The privacy policy contains no reference to 72-hour supervisory authority notification requirements or data subject notification obligations.',
    suggested_fix: 'Document and publish breach notification procedures including the 72-hour notification window to relevant supervisory authorities.',
  },
  {
    id: 'GDPR-5-1e',
    severity: 'medium',
    requirement: 'Storage limitation',
    article: 'Art. 5(1)(e)',
    category: 'Data Minimisation',
    finding: 'Data retention periods are vague. The policy states data is kept "as long as necessary for legitimate business purposes" without specifying concrete timelines for different data categories.',
    suggested_fix: 'Define specific retention periods for each data category (account data, transaction logs, support tickets, analytics) and implement automated deletion schedules.',
  },
  {
    id: 'GDPR-46-1',
    severity: 'medium',
    requirement: 'International data transfers',
    article: 'Art. 46',
    category: 'International Transfers',
    finding: 'Data is transferred to US-based processors but the transfer mechanism (SCCs, Adequacy Decision, BCRs) is not specified. Post-Schrems II compliance is unclear.',
    suggested_fix: 'Specify the transfer mechanism for each international transfer, update SCCs to the 2021 EU Commission version, and conduct Transfer Impact Assessments.',
  },
  {
    id: 'GDPR-13-2f',
    severity: 'low',
    requirement: 'Supervisory authority complaint right',
    article: 'Art. 13(2)(d)',
    category: 'Data Subject Rights',
    finding: 'The right to lodge a complaint with a supervisory authority is mentioned but no specific authority is named or linked. Users should be directed to the relevant DPA for their jurisdiction.',
    suggested_fix: 'Name the lead supervisory authority (based on main establishment) and provide a direct link to their complaint mechanism.',
  },
]

const HIPAA_VIOLATIONS: Violation[] = [
  {
    id: 'HIPAA-164.312a1',
    severity: 'critical',
    requirement: 'Access Control — Unique User Identification',
    article: '§164.312(a)(1)',
    category: 'Technical Safeguards',
    finding: 'No documentation of unique user identification procedures for PHI systems. Shared administrator accounts appear to be in use based on support documentation references.',
    suggested_fix: 'Implement unique user IDs for all personnel accessing PHI. Eliminate shared accounts. Enforce MFA for all PHI system access.',
  },
  {
    id: 'HIPAA-164.312e2ii',
    severity: 'critical',
    requirement: 'Encryption and Decryption of PHI in transit',
    article: '§164.312(e)(2)(ii)',
    category: 'Technical Safeguards',
    finding: 'PHI transmission encryption standard not specified in the privacy notice. API documentation shows an HTTP fallback endpoint that is publicly accessible.',
    suggested_fix: 'Enforce TLS 1.2+ for all PHI transmission. Disable HTTP fallback endpoints. Document encryption standards in the security policy.',
  },
  {
    id: 'HIPAA-164.308a1',
    severity: 'high',
    requirement: 'Security Management Process',
    article: '§164.308(a)(1)',
    category: 'Administrative Safeguards',
    finding: 'No documented risk analysis or risk management program is referenced. HIPAA requires a formal, documented risk assessment of PHI confidentiality, integrity, and availability.',
    suggested_fix: 'Conduct and document a comprehensive risk analysis covering all PHI systems. Establish a formal risk management program with remediation tracking.',
  },
  {
    id: 'HIPAA-164.308a6',
    severity: 'high',
    requirement: 'Security Incident Procedures',
    article: '§164.308(a)(6)',
    category: 'Administrative Safeguards',
    finding: 'Security incident response procedures are not documented publicly. No Breach Notification Rule compliance statement is present despite handling PHI.',
    suggested_fix: 'Document and publish security incident response procedures including the 60-day breach notification window for affected individuals and HHS reporting.',
  },
  {
    id: 'HIPAA-164.308a3',
    severity: 'high',
    requirement: 'Workforce Security — Termination Procedures',
    article: '§164.308(a)(3)',
    category: 'Administrative Safeguards',
    finding: 'No workforce termination or access revocation procedures documented. Former employee account deactivation timeline is not specified.',
    suggested_fix: 'Implement and document same-day access revocation for terminated employees with automated deprovisioning from all PHI systems.',
  },
  {
    id: 'HIPAA-164.314a1',
    severity: 'high',
    requirement: 'Business Associate Contracts',
    article: '§164.314(a)(1)',
    category: 'Organizational Requirements',
    finding: 'BAA confirmation with sub-processors not publicly documented. Three listed vendors handle PHI but BAA status is unconfirmed.',
    suggested_fix: 'Execute BAAs with all Business Associates. Maintain a BAA register and confirm compliance annually.',
  },
  {
    id: 'HIPAA-164.312c1',
    severity: 'medium',
    requirement: 'Integrity Controls for PHI',
    article: '§164.312(c)(1)',
    category: 'Technical Safeguards',
    finding: 'No integrity verification mechanisms for PHI at rest are described. Data checksumming or hash verification procedures are absent from documentation.',
    suggested_fix: 'Implement and document PHI integrity controls including checksums, digital signatures, or hash verification. Enable database audit logging.',
  },
  {
    id: 'HIPAA-164.310d1',
    severity: 'medium',
    requirement: 'Device and Media Controls',
    article: '§164.310(d)(1)',
    category: 'Physical Safeguards',
    finding: 'No media disposal or reuse procedures documented. Hardware decommissioning policy is absent despite likely containing PHI on storage media.',
    suggested_fix: 'Document media sanitization and disposal procedures following NIST SP 800-88 standards. Maintain disposal certificates.',
  },
]

const SOC2_VIOLATIONS: Violation[] = [
  {
    id: 'SOC2-CC6.1',
    severity: 'critical',
    requirement: 'Logical and Physical Access Controls',
    article: 'CC6.1',
    category: 'Common Criteria',
    finding: 'No documented access provisioning and deprovisioning process. Access reviews are not performed on a periodic basis. Principle of least privilege is not enforced per available system documentation.',
    suggested_fix: 'Implement quarterly access reviews, automated deprovisioning workflows, and a formal least-privilege access policy enforced by RBAC.',
  },
  {
    id: 'SOC2-CC7.2',
    severity: 'critical',
    requirement: 'Incident Response and Recovery',
    article: 'CC7.2',
    category: 'Common Criteria',
    finding: 'No incident response plan (IRP) is published or referenced. Historical incident records show two prior data events with no documented post-mortems or corrective actions.',
    suggested_fix: 'Develop, test annually, and publish an IRP. Document all past incidents with root cause analysis and remediation steps.',
  },
  {
    id: 'SOC2-CC3.2',
    severity: 'high',
    requirement: 'Risk Assessment Process',
    article: 'CC3.2',
    category: 'Common Criteria',
    finding: 'Risk assessment methodology is not described. No evidence of periodic risk identification or remediation tracking is present in public documentation.',
    suggested_fix: 'Implement a formal annual risk assessment process and maintain a risk register with owner assignments and remediation deadlines.',
  },
  {
    id: 'SOC2-CC8.1',
    severity: 'high',
    requirement: 'Change Management',
    article: 'CC8.1',
    category: 'Common Criteria',
    finding: 'Software change management procedures are not documented. No evidence of formal code review, testing gates, or change approval processes.',
    suggested_fix: 'Implement a change management policy requiring peer code review, automated testing, and approval workflows before production deployments.',
  },
  {
    id: 'SOC2-CC9.1',
    severity: 'high',
    requirement: 'Vendor and Partner Risk Management',
    article: 'CC9.1',
    category: 'Common Criteria',
    finding: 'Third-party vendor risk assessment is not documented. Critical vendors listed (AWS, Stripe, Twilio) lack SOC 2 compliance verification in customer-facing documentation.',
    suggested_fix: 'Establish a vendor risk management program. Collect and review SOC 2 reports for critical vendors annually. Document assessment results.',
  },
  {
    id: 'SOC2-A1.2',
    severity: 'medium',
    requirement: 'Availability — Performance Monitoring',
    article: 'A1.2',
    category: 'Availability',
    finding: 'No SLA or availability targets are published. System monitoring and alerting procedures are not described. Historical uptime data is not accessible.',
    suggested_fix: 'Publish SLAs (e.g., 99.9% uptime), implement automated monitoring with alerting, and maintain a public status page.',
  },
  {
    id: 'SOC2-PI1.1',
    severity: 'medium',
    requirement: 'Processing Integrity',
    article: 'PI1.1',
    category: 'Processing Integrity',
    finding: 'No data validation or quality controls documented for processing pipelines. Error handling and exception management procedures are absent.',
    suggested_fix: 'Document data validation controls, implement systematic error logging, and establish quality assurance checkpoints in data processing workflows.',
  },
  {
    id: 'SOC2-CC5.2',
    severity: 'low',
    requirement: 'Security Policy Communication',
    article: 'CC5.2',
    category: 'Common Criteria',
    finding: 'Security policies are not publicly communicated to relevant stakeholders. No employee security training program is referenced.',
    suggested_fix: 'Implement annual security awareness training, publish security policy summaries, and track completion rates.',
  },
]

function buildEvents(url: string, framework: string): StreamEvent[] {
  const company = url.replace(/^https?:\/\//, '').replace(/\/.*/,'').replace(/^www\./,'')
  const fw = framework === 'auto' ? 'GDPR' : framework.toUpperCase()
  const violations =
    fw === 'GDPR' ? GDPR_VIOLATIONS
    : fw === 'HIPAA' ? HIPAA_VIOLATIONS
    : SOC2_VIOLATIONS

  const timeline: StreamEvent[] = [
    // Phase 0: Crawling
    { type: 'phase_change', phase: 0, phase_label: 'CRAWLING' },
    { type: 'log', agent: 'crawler', message: `→ Initializing web crawler for ${company}...`, color: 'blue' },
    { type: 'log', agent: 'crawler', message: `→ Fetching ${url}`, color: 'blue' },
    { type: 'log', agent: 'crawler', message: `→ Resolved DNS: 104.21.${Math.floor(Math.random()*200)}.${Math.floor(Math.random()*200)}`, color: 'blue' },
    { type: 'log', agent: 'crawler', message: `→ Discovered 18 linked policy pages`, color: 'blue' },
    { type: 'log', agent: 'crawler', message: `→ Crawling /privacy-policy...`, color: 'blue' },
    { type: 'log', agent: 'crawler', message: `→ Crawling /terms-of-service...`, color: 'blue' },
    { type: 'log', agent: 'crawler', message: `→ Crawling /cookie-policy...`, color: 'blue' },
    { type: 'log', agent: 'crawler', message: `→ Crawling /security...`, color: 'blue' },
    { type: 'log', agent: 'crawler', message: `✓ Extracted 54,820 characters from 9 pages`, color: 'blue' },

    // Phase 1: Orchestrating
    { type: 'phase_change', phase: 1, phase_label: 'ORCHESTRATING' },
    { type: 'log', agent: 'orchestrator', message: `→ Analyzing document corpus (54,820 chars)...`, color: 'violet' },
    { type: 'log', agent: 'orchestrator', message: `→ Detected EU data subject mentions — GDPR scope flagged`, color: 'violet' },
    { type: 'log', agent: 'orchestrator', message: fw === 'HIPAA' || fw === 'auto'
      ? `→ Detected PHI references — HIPAA scope flagged` : `→ Checking HIPAA applicability... not applicable`, color: 'violet' },
    { type: 'log', agent: 'orchestrator', message: `→ Selected framework: ${fw}`, color: 'violet' },
    { type: 'log', agent: 'orchestrator', message: `✓ Dispatching specialist audit agent...`, color: 'violet' },

    // Phase 2: Auditing
    { type: 'phase_change', phase: 2, phase_label: 'AUDITING' },
    { type: 'log', agent: fw.toLowerCase().replace(' ', '') + '_agent', message: `→ ${fw} audit initialized — checking ${violations.length + Math.floor(Math.random()*30 + 20)} requirements`, color: fw === 'GDPR' ? 'emerald' : fw === 'HIPAA' ? 'amber' : 'rose' },
  ]

  violations.forEach((v, i) => {
    const agentColor: 'emerald' | 'amber' | 'rose' = fw === 'GDPR' ? 'emerald' : fw === 'HIPAA' ? 'amber' : 'rose'
    const agentName = fw.toLowerCase().replace(' ', '') + '_agent'
    const pass = i >= violations.length - 3
    if (!pass) {
      timeline.push({ type: 'log', agent: agentName, message: `→ Checking ${v.article}: ${v.requirement.substring(0, 40)}...`, color: agentColor })
      timeline.push({ type: 'log', agent: agentName, message: `⚠ VIOLATION [${v.severity.toUpperCase()}]: ${v.id}`, color: agentColor })
      timeline.push({ type: 'finding', finding: v })
      timeline.push({ type: 'metrics', metrics: { violations: i + 1, checks_passed: i * 2 + 3, risk_score: Math.min(95, 30 + i * 5) } })
    } else {
      timeline.push({ type: 'log', agent: agentName, message: `✓ PASS: ${v.article} — ${v.requirement.substring(0, 35)}`, color: agentColor })
    }
  })

  const totalViolations = violations.filter((_, i) => i < violations.length - 3).length
  const totalPassed = 35 - totalViolations + 3

  timeline.push({ type: 'phase_change' as const, phase: 3, phase_label: 'REPORTING' })
  timeline.push({ type: 'log' as const, agent: 'reporter', message: `→ Compiling ${totalViolations} violations...`, color: 'muted' as const })
  timeline.push({ type: 'log' as const, agent: 'reporter', message: `→ Computing risk score...`, color: 'muted' as const })
  timeline.push({ type: 'log' as const, agent: 'reporter', message: `✓ Report generated`, color: 'muted' as const })
  timeline.push({
    type: 'done' as const,
    report: {
      scan_id: '',
      url,
      company_name: company.charAt(0).toUpperCase() + company.slice(1),
      framework: fw,
      compliance_score: Math.max(20, 100 - totalViolations * 8),
      risk_score: Math.min(95, totalViolations * 8 + 20),
      violations_found: totalViolations,
      checks_passed: totalPassed,
      pages_crawled: 9,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      violations: violations.filter((_, i) => i < violations.length - 3),
      frameworks_detected: ['GDPR', 'HIPAA', 'SOC 2'],
    },
  })

  return timeline
}

export function getMockEvents(url: string, framework: string): Array<{ delay: number; event: StreamEvent }> {
  const events = buildEvents(url, framework)
  let delay = 0
  return events.map((event) => {
    if (event.type === 'phase_change') delay += 400
    else if (event.type === 'finding') delay += 800
    else if (event.type === 'metrics') delay += 100
    else if (event.type === 'done') delay += 1200
    else delay += 350
    return { delay, event }
  })
}

export const MOCK_HISTORY: HistoryItem[] = [
  { scan_id: 'a1b2c3', url: 'https://stripe.com', company_name: 'Stripe', framework: 'GDPR', compliance_score: 78, risk_score: 42, status: 'complete', created_at: '2026-06-04T14:22:00Z' },
  { scan_id: 'd4e5f6', url: 'https://notion.so', company_name: 'Notion', framework: 'SOC 2', compliance_score: 61, risk_score: 63, status: 'complete', created_at: '2026-06-03T09:15:00Z' },
  { scan_id: 'g7h8i9', url: 'https://figma.com', company_name: 'Figma', framework: 'GDPR', compliance_score: 84, risk_score: 28, status: 'complete', created_at: '2026-06-03T07:41:00Z' },
  { scan_id: 'j1k2l3', url: 'https://linear.app', company_name: 'Linear', framework: 'HIPAA', compliance_score: 44, risk_score: 81, status: 'complete', created_at: '2026-06-02T18:05:00Z' },
  { scan_id: 'm4n5o6', url: 'https://vercel.com', company_name: 'Vercel', framework: 'SOC 2', compliance_score: 91, risk_score: 18, status: 'complete', created_at: '2026-06-02T11:33:00Z' },
  { scan_id: 'p7q8r9', url: 'https://supabase.com', company_name: 'Supabase', framework: 'GDPR', compliance_score: 55, risk_score: 72, status: 'complete', created_at: '2026-06-01T16:20:00Z' },
  { scan_id: 's1t2u3', url: 'https://planetscale.com', company_name: 'PlanetScale', framework: 'HIPAA', compliance_score: 37, risk_score: 88, status: 'complete', created_at: '2026-06-01T09:07:00Z' },
]

export { GDPR_VIOLATIONS, HIPAA_VIOLATIONS, SOC2_VIOLATIONS }
