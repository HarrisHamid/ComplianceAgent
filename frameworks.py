# frameworks.py — all compliance checklists in one place
#
# Why a separate file instead of keeping checklists in policy_agent.py?
# Because as you add more frameworks (PCI-DSS, ISO 27001, CCPA...),
# policy_agent.py would become 500+ lines of checklist data mixed with logic.
# Keeping data and logic in separate files is called "separation of concerns."
# It also means you can add a new framework by editing only THIS file.

# --- GDPR ARTICLE 13 ---
# European data privacy law. Applies to any company handling EU residents' data.
GDPR_CHECKLIST = [
    {
        "id": "GDPR-1",
        "requirement": "Identity and contact details of the data controller",
        "keywords": ["controller", "company name", "contact", "address"],
        "example": "Must name the company responsible for your data and give contact info"
    },
    {
        "id": "GDPR-2",
        "requirement": "Contact details of the Data Protection Officer (if applicable)",
        "keywords": ["DPO", "data protection officer", "dpo@"],
        "example": "If they have a DPO, they must list their contact details"
    },
    {
        "id": "GDPR-3",
        "requirement": "Purposes and legal basis for processing",
        "keywords": ["purpose", "legal basis", "legitimate interest", "consent", "contract", "article 6"],
        "example": "Must say WHY they collect data AND the legal justification"
    },
    {
        "id": "GDPR-4",
        "requirement": "Recipients or categories of recipients of personal data",
        "keywords": ["third party", "share", "recipients", "partners", "disclose"],
        "example": "Must name who else receives your data"
    },
    {
        "id": "GDPR-5",
        "requirement": "Data retention period",
        "keywords": ["retain", "retention", "store", "delete", "years", "months"],
        "example": "Must say how long they keep your data"
    },
    {
        "id": "GDPR-6",
        "requirement": "Right to access personal data",
        "keywords": ["right to access", "access your data", "subject access"],
        "example": "Must tell you that you can request a copy of your data"
    },
    {
        "id": "GDPR-7",
        "requirement": "Right to rectification",
        "keywords": ["rectif", "correct", "update your data", "inaccurate"],
        "example": "Must tell you that you can correct wrong data"
    },
    {
        "id": "GDPR-8",
        "requirement": "Right to erasure (right to be forgotten)",
        "keywords": ["erasure", "delete", "forgotten", "remove your data"],
        "example": "Must tell you that you can request deletion of your data"
    },
    {
        "id": "GDPR-9",
        "requirement": "Right to withdraw consent",
        "keywords": ["withdraw consent", "opt out", "unsubscribe", "revoke"],
        "example": "Must tell you how to withdraw consent"
    },
    {
        "id": "GDPR-10",
        "requirement": "Right to lodge a complaint with a supervisory authority",
        "keywords": ["supervisory authority", "complaint", "ICO", "data protection authority"],
        "example": "Must tell you that you can complain to a government regulator"
    },
]

# --- HIPAA ---
# US healthcare privacy law. Applies to any company that handles Protected Health Information (PHI).
# PHI = anything that could identify a patient + their health data.
# Think: hospitals, health apps, insurance companies, telehealth platforms.
HIPAA_CHECKLIST = [
    {
        "id": "HIPAA-1",
        "requirement": "Notice of Privacy Practices (NPP) provided to patients",
        "keywords": ["notice of privacy", "NPP", "privacy practices", "privacy notice"],
        "example": "Covered entities must give patients a written notice explaining how their health info is used"
    },
    {
        "id": "HIPAA-2",
        "requirement": "Description of how PHI is used and disclosed",
        "keywords": ["protected health information", "PHI", "health information", "medical records", "use and disclosure"],
        "example": "Must explain the specific ways patient health data is used (treatment, payment, operations)"
    },
    {
        "id": "HIPAA-3",
        "requirement": "Patient rights regarding their PHI",
        "keywords": ["patient rights", "right to access", "right to amend", "right to restrict", "access your records"],
        "example": "Must explain patient's right to see, copy, and request changes to their health records"
    },
    {
        "id": "HIPAA-4",
        "requirement": "Minimum necessary standard — only access/share PHI that is needed",
        "keywords": ["minimum necessary", "need to know", "limit access", "only necessary"],
        "example": "Must state that they only use or share the minimum amount of health data needed"
    },
    {
        "id": "HIPAA-5",
        "requirement": "Business Associate Agreements (BAA) with third parties",
        "keywords": ["business associate", "BAA", "third party", "vendor", "subcontractor"],
        "example": "Must state that any vendor who touches PHI has signed a BAA — a legal contract"
    },
    {
        "id": "HIPAA-6",
        "requirement": "Security safeguards for PHI (administrative, physical, technical)",
        "keywords": ["encryption", "access control", "audit logs", "security", "safeguards", "physical security"],
        "example": "Must describe how they protect health data — encryption, access controls, audit trails"
    },
    {
        "id": "HIPAA-7",
        "requirement": "Breach notification policy",
        "keywords": ["breach", "notification", "notify", "incident", "unauthorized access"],
        "example": "Must explain they will notify patients and HHS within 60 days of a data breach"
    },
    {
        "id": "HIPAA-8",
        "requirement": "Right to request restrictions on PHI use",
        "keywords": ["restrict", "restriction", "opt out", "limit use", "request restriction"],
        "example": "Patients can ask them to restrict how their health info is used — must be acknowledged"
    },
    {
        "id": "HIPAA-9",
        "requirement": "Workforce training and access controls",
        "keywords": ["training", "workforce", "employees", "access control", "role-based"],
        "example": "Must state that employees are trained on HIPAA and only authorized staff access PHI"
    },
    {
        "id": "HIPAA-10",
        "requirement": "Retention of PHI records (6 years minimum)",
        "keywords": ["retain", "retention", "6 years", "six years", "records"],
        "example": "HIPAA requires PHI and related policies to be kept for a minimum of 6 years"
    },
]

# --- SOC 2 ---
# An auditing standard for SaaS and tech companies. Not a law — it's a voluntary certification.
# But enterprise customers DEMAND it before signing contracts.
# Based on 5 Trust Service Criteria (TSC): Security, Availability, Processing Integrity,
# Confidentiality, and Privacy. Most companies only do Security (Type I or Type II).
SOC2_CHECKLIST = [
    {
        "id": "SOC2-1",
        "requirement": "Security policy and access control procedures",
        "keywords": ["access control", "security policy", "role-based", "least privilege", "authentication"],
        "example": "Must have documented security policies — who can access what, how access is granted/revoked"
    },
    {
        "id": "SOC2-2",
        "requirement": "Encryption of data in transit and at rest",
        "keywords": ["encrypt", "TLS", "SSL", "AES", "at rest", "in transit", "HTTPS"],
        "example": "Data must be encrypted moving across the network (TLS) and when stored (AES-256)"
    },
    {
        "id": "SOC2-3",
        "requirement": "Availability and uptime commitments (SLA)",
        "keywords": ["uptime", "availability", "SLA", "99.", "downtime", "service level"],
        "example": "Must state their uptime commitment — e.g. 99.9% availability SLA"
    },
    {
        "id": "SOC2-4",
        "requirement": "Incident response and breach notification procedures",
        "keywords": ["incident response", "breach", "notify", "security incident", "response plan"],
        "example": "Must describe the process for detecting, responding to, and notifying customers of incidents"
    },
    {
        "id": "SOC2-5",
        "requirement": "Vendor and third-party risk management",
        "keywords": ["vendor", "third party", "subprocessor", "supply chain", "third-party risk"],
        "example": "Must state that they assess and monitor the security of their own vendors"
    },
    {
        "id": "SOC2-6",
        "requirement": "Audit logging and monitoring",
        "keywords": ["audit log", "logging", "monitor", "SIEM", "activity log", "audit trail"],
        "example": "Must maintain logs of who accessed what and when — and actively monitor them"
    },
    {
        "id": "SOC2-7",
        "requirement": "Change management procedures",
        "keywords": ["change management", "code review", "deployment", "testing", "change control"],
        "example": "Must have a process for testing and approving changes before they go to production"
    },
    {
        "id": "SOC2-8",
        "requirement": "Business continuity and disaster recovery plan",
        "keywords": ["disaster recovery", "business continuity", "backup", "RTO", "RPO", "redundancy"],
        "example": "Must describe how they recover data and restore service after a major outage"
    },
    {
        "id": "SOC2-9",
        "requirement": "Employee security training and background checks",
        "keywords": ["training", "background check", "security awareness", "onboarding", "employees"],
        "example": "Must state that employees receive security training and undergo background screening"
    },
    {
        "id": "SOC2-10",
        "requirement": "Penetration testing and vulnerability management",
        "keywords": ["penetration test", "pentest", "vulnerability", "scan", "security assessment"],
        "example": "Must state that they regularly test their systems for vulnerabilities"
    },
]

# --- REGISTRY ---
# This dict is the key design decision in this file.
# Instead of a chain of if/elif in policy_agent.py like:
#   if framework == "GDPR": checklist = GDPR_CHECKLIST
#   elif framework == "HIPAA": checklist = HIPAA_CHECKLIST
#   ...
# We just do: checklist = FRAMEWORKS[framework]
# Adding a new framework = add one entry here. That's it.

FRAMEWORKS = {
    "GDPR":  GDPR_CHECKLIST,
    "HIPAA": HIPAA_CHECKLIST,
    "SOC2":  SOC2_CHECKLIST,
}

# Human-readable descriptions shown in the selection menu
FRAMEWORK_DESCRIPTIONS = {
    "GDPR":  "EU data privacy law — applies to any company handling EU residents' data",
    "HIPAA": "US healthcare privacy law — applies to companies handling patient health data",
    "SOC2":  "SaaS security certification — required by enterprise customers before signing contracts",
}

if __name__ == "__main__":
    print("Available frameworks:\n")
    for name, description in FRAMEWORK_DESCRIPTIONS.items():
        checklist = FRAMEWORKS[name]
        print(f"  {name} ({len(checklist)} requirements)")
        print(f"  {description}\n")