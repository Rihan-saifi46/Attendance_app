# WorkforcePro — Automated Biometric Matching & Liveness Detection Proposal
> **Document Status**: DRAFT / AWAITING FORMAL COMPLIANCE APPROVAL  
> **Classification**: Security & Privacy Architecture Proposal  
> **Target System**: WorkforcePro Mobile Client & API Backend  

---

## 1. Executive Summary & Security Disclaimer

### 1.1 Fundamental Security Disclaimer
WorkforcePro's baseline GPS and front-facing camera selfie attendance workflow provides **point-in-time presence verification**, but **neither GPS nor a standard selfie alone proves individual identity or guarantees spoofing prevention**. 

* GPS signals can be subject to multipath distortion, indoor signal attenuation, simulated provider injection, or SDR (Software Defined Radio) spoofing.
* A standard 2D camera photograph, without certified hardware-backed liveness or multi-factor biometric matching, is susceptible to presentation attacks (photos held up to camera, deepfake virtual cameras, video playback, or printed masks).
* Therefore, the baseline system serves as an **operational audit record** requiring supervisory oversight, not an unforgeable cryptographic guarantee of physical identity.

### 1.2 Purpose of This Proposal
This document specifies the technical architecture, privacy safeguards, and regulatory compliance requirements for introducing **Automated Face Matching** and **Real-Time Liveness Detection** into WorkforcePro.

> [!IMPORTANT]
> **Implementation Prohibition**: In accordance with enterprise privacy guidelines, **no automatic facial matching algorithms or biometric liveness models shall be deployed into production until this proposal receives formal written sign-off** from Corporate Legal Counsel, the Data Protection Officer (DPO), and the Chief Information Security Officer (CISO).

---

## 2. Proposed Biometric Architecture (Phase Next)

```
+------------------------------------------------------------------------------------+
|                             PROPOSED BIOMETRIC PIPELINE                            |
+------------------------------------------------------------------------------------+
| 1. Enrollment Phase (One-Time Authorized Onboarding)                               |
|    - Employee captures 3 high-resolution baseline reference selfies under HR review |
|    - Facial feature vector (512-dim embedding) generated via On-Device ML Model     |
|    - Raw photos discarded or vaulted; encrypted biometric embedding stored in DB    |
+------------------------------------------------------------------------------------+
                                          |
                                          v (Daily Attendance Punch)
+------------------------------------------------------------------------------------+
| 2. Mobile Capture & Liveness Verification                                          |
|    - Hardware-enforced camera pipeline (Gallery picker strictly prohibited)        |
|    - Passive Liveness: Euler angle head-pose check + Eye-open probability (>=0.75) |
|    - Active Challenge (Optional): Randomized action (e.g. smile or blink prompt)   |
|    - Ephemeral capture sent over TLS 1.3 to Backend Gateway                        |
+------------------------------------------------------------------------------------+
                                          |
                                          v
+------------------------------------------------------------------------------------+
| 3. Backend Verification Gateway                                                    |
|    - Extract candidate embedding from submitted punch photo                        |
|    - Compute Cosine Similarity against enrolled reference embedding:               |
|      sim(A, B) = (A · B) / (||A|| * ||B||)                                         |
|    - If sim >= 0.82: Mark 'VERIFIED'                                               |
|    - If 0.65 <= sim < 0.82: Mark 'FLAGGED' and route to HR Review Queue             |
|    - If sim < 0.65: Mark 'REJECTED' with AUDIT_LOG entry                           |
+------------------------------------------------------------------------------------+
```

---

## 3. Liveness Detection Specifications

### 3.1 Presentation Attack Detection (PAD) Standards
The proposed liveness pipeline targets **ISO/IEC 30107-3 Level 1 and Level 2** compliance:
* **Level 1 (Basic Attacks)**: High-resolution printed color photos, curved paper cutouts, static digital screens (iPads/tablets).
* **Level 2 (Advanced Attacks)**: Silicone face masks, video loop replay, 3D papercraft models, mannequin heads.

### 3.2 Dual-Tier Verification Strategy
1. **Tier 1 — On-Device Passive Liveness**:
   - Analyzes micro-textures, reflections in pupils, and moiré patterns from digital screens.
   - Evaluates natural face depth using front-camera TrueDepth / ToF (Time of Flight) sensors where hardware supports it.
2. **Tier 2 — Server-Side Cryptographic Hash & Temporal Validation**:
   - Computes SHA-256 image hashes with a 90-day anti-replay table to reject identical replayed frames.
   - NTP drift analysis: Punches with time skews exceeding 180 seconds are flagged.

---

## 4. Privacy, Data Retention & Regulatory Safeguards

### 4.1 Strict No-Continuous-Tracking Policy
* WorkforcePro captures GPS coordinates and camera imagery **strictly on-demand at the instantaneous moment the employee triggers a punch**.
* **Continuous background tracking, geofence enter/exit listening, or persistent location polling is strictly forbidden** by system architecture and application permission models.

### 4.2 Non-Invertible Biometric Storage
* Raw biometric facial templates must never be stored as reversible images in relational databases.
* Feature vectors must be irreversibly hashed and salted per tenant (`HMAC-SHA512(embedding, tenantSalt)`), ensuring a data breach in Tenant A cannot compromise biometric vectors in Tenant B.

### 4.3 Photo Storage Security & Short-Lived Access
* All uploaded attendance selfies are stored in private object storage (non-public buckets).
* Access URLs are signed with HMAC-SHA256 and expire strictly within **15 minutes**.
* Multi-tenant segregation: Object keys are prefixed with `tenants/{companyId}/attendance/`. Cross-tenant retrieval requests return `404 Not Found`.

### 4.4 Retention and Automatic Deletion Rules
* **Daily Attendance Photos**: Retained for a maximum of **90 calendar days**, after which an automated cron task (`storageService.purgeExpiredPhotos()`) securely purges raw photo binaries from storage.
* **Audit Logs & Punch Telemetry**: Retained for **7 years** to satisfy statutory labor compliance, with coordinates rounded to 4 decimal places after 1 year for privacy minimization.

---

## 5. Global Legal & Regulatory Compliance Matrix

| Jurisdiction | Applicable Law | Compliance Requirement in WorkforcePro |
| :--- | :--- | :--- |
| **European Union** | GDPR (Art. 9) | Processing of biometric data requires explicit, freely given employee consent. Consent refusal cannot result in termination; an alternative non-biometric punch mechanism must be provided. |
| **United States (IL)** | BIPA (740 ILCS 14/) | Written notification, explicit written release, published retention schedule, and mandatory destruction upon employment termination. |
| **United States (CA)** | CCPA / CPRA | Classified as Sensitive Personal Information (SPI). Clear "Notice at Collection" and strict purpose limitation required. |
| **India** | DPDPA 2023 | Biometric data processing governed under clear notice and consent. Cross-border transfer restricted to approved geographies. |
| **United Kingdom** | UK GDPR / DPA 2018 | Data Protection Impact Assessment (DPIA) mandatory prior to deploying facial recognition in workplace management. |

---

## 6. Algorithmic Bias Mitigation & Human-in-the-Loop Safeguards

1. **No Automated Adverse Action**:
   - An employee's attendance must **never be marked absent or subject to payroll loss solely based on an automated biometric algorithm rejection**.
   - Any rejection automatically flags the record for manual review by the employee's assigned reporting manager or HR administrator (`attendance_punches.verificationOutcome = 'PENDING_REVIEW'`).
2. **Demographic Parity & Testing**:
   - The selected ML model must undergo rigorous testing across diverse demographic groups (skin tones 1-6 on Fitzpatrick scale, age brackets, genders, and corrective eyewear) to maintain a False Rejection Rate (FRR) under 0.5% uniformly.

---

## 7. Approval & Sign-Off Matrix

The implementation of automated facial matching or liveness detection remains **FROZEN** until all designated stakeholders complete written review:

| Stakeholder Role | Name / Title | Decision | Date | Signature |
| :--- | :--- | :--- | :--- | :--- |
| **Chief Information Security Officer** | Security Review Board | [ ] Approved [ ] Rejected | — | — |
| **Data Protection Officer (DPO)** | Global Privacy Council | [ ] Approved [ ] Rejected | — | — |
| **Corporate Legal Counsel** | Employment & Labor Compliance | [ ] Approved [ ] Rejected | — | — |
| **Chief Technology Officer** | Architecture & Monorepo Lead | [ ] Approved [ ] Rejected | — | — |
