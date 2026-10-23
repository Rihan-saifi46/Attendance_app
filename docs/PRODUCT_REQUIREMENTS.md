# WorkforcePro — Product Requirements Document (PRD)

## 1. Document Overview
* **Product Name**: WorkforcePro
* **Document Version**: 1.0.0
* **Status**: Planning & Architecture Baseline
* **System Type**: Multi-Tenant B2B Workforce Management SaaS
* **Target Platforms**: 
  - Android Employee Mobile App (Flutter / Dart)
  - Web Admin Portal (React / Vite / TypeScript)
  - Backend API (Node.js / Express / TypeScript / MongoDB)

---

## 2. Executive Summary & Problem Statement
Modern businesses with hybrid, field, and on-premise workforces struggle with accurate time tracking, buddy punching, time theft, fragmented shift scheduling, and error-prone payroll processing. Most existing commercial solutions either lack reliable anti-spoofing field attendance (GPS mock location spoofing and static photo hacks) or lack tightly integrated multi-tenant payroll engines that adjust automatically for attendance violations (Loss of Pay, tardiness, overtime).

**WorkforcePro** provides a unified, secure, enterprise-ready multi-tenant SaaS platform where:
1. Field and office employees log geofence-verified, selfie-authenticated attendance via an Android app equipped with anti-tamper safeguards.
2. Managers and HR administrators configure geofences, shifts, attendance policies, leave quotas, and review daily punches in real-time.
3. Payroll administrators execute customizable, automated payroll runs tied directly to attendance records, overtime multipliers, and statutory deduction components.

---

## 3. User Personas & Workflows

### 3.1 Super Admin (SaaS Platform Operator)
* **Goal**: Manage tenant accounts, view system health, monitor platform resource consumption, configure global feature flags.
* **Key Tasks**:
  - Provision and onboard new enterprise tenants (`Tenant` registration).
  - Suspend or activate tenant subscriptions.
  - Review platform audit logs and security telemetry.

### 3.2 Tenant Admin / HR Manager (Enterprise Customer)
* **Goal**: Manage enterprise structure, employees, shifts, geofences, and attendance rules.
* **Key Tasks**:
  - Configure company organizational hierarchy (departments, designations, branches/offices).
  - Define geofenced sites (coordinates, radius in meters, Wi-Fi BSSID allowlists).
  - Set shift timings, grace periods, half-day thresholds, and overtime criteria.
  - Manage leave types, holiday calendars, and approval workflows.
  - Review, dispute, and regularize employee attendance logs.
  - Execute monthly/bi-weekly payroll runs, approve salary slips, and generate bank disbursement sheets.

### 3.3 Shift Supervisor / Line Manager
* **Goal**: Monitor team attendance, approve leave requests, review anomaly flags.
* **Key Tasks**:
  - Approve or reject subordinate leave and regularization requests.
  - View real-time team attendance dashboard (present, late, absent, on-duty).
  - Receive automated notifications on geofence violations or attendance misses.

### 3.4 Employee (Mobile App User)
* **Goal**: Punch in/out reliably, verify assigned shifts, check leave balances, download payslips.
* **Key Tasks**:
  - Authenticate using company credentials with optional biometric unlock (fingerprint/face).
  - Punch in/out within assigned geofence, capturing verified live selfie.
  - Request leaves and regularizations with justification.
  - View monthly work calendars, shift timings, punch logs, and verified payslips.

---

## 4. Functional Scope

### 4.1 Multi-Tenant Core & Organization Management
* Tenant isolation at all data and operational layers.
* Custom company profiles (logo, branding, timezone, base currency, fiscal year definition).
* Hierarchical organizational structure: Branches/Locations -> Departments -> Designations -> Employees.
* Role-Based Access Control (RBAC) with granular permissions (Admin, HR, Manager, Employee, Custom Roles).

### 4.2 Geofenced & Biometric Attendance
* **Mobile Punch-In/Out**:
  - Geofence enforcement: Circular radius validation (latitude/longitude + allowable radius in meters) and polygon boundaries.
  - Server-side Haversine calculation to prevent client-side GPS manipulation.
  - Live selfie capture with passive/active liveness validation to stop photo and screen playback attacks.
  - Mock GPS / Fake Location detection (checks for Android test providers, developer options, Magisk root masking).
  - Single-device hardware binding: Device IMEI/UUID bound to user account to stop credential sharing.
  - Server-verified network timestamp to stop local device clock manipulation.
* **Punch Regularization & Shift Management**:
  - Fixed, rotational, and flexible shift schedules.
  - Configurable grace periods (e.g., 15 minutes grace before marked "Late").
  - Automated status tagging: `PRESENT`, `LATE`, `HALF_DAY`, `ABSENT`, `ON_DUTY`, `HOLIDAY`, `WEEK_OFF`.
  - Regularization request and approval workflow.

### 4.3 Leave & Holiday Management
* Configurable leave categories: Paid Leave (PL), Casual Leave (CL), Sick Leave (SL), Maternity/Paternity, Unpaid Leave (LOP).
* Accrual engines: Monthly, quarterly, annual, or lump-sum allocations.
* Multi-tier approval workflows (Supervisor -> HR).
* Custom holiday calendars mapped by branch/location.

### 4.4 Automated Payroll Engine
* Flexible Salary Structure Builder:
  - Base earnings: Basic, HRA, Conveyance, Special Allowance, Performance Bonus.
  - Deductions: Tax Deductions, Provident Fund / Social Security, Health Insurance, Loan Repayment.
  - Attendance deductions: Formula-driven Loss of Pay (LOP) calculated from unregularized absences.
  - Overtime calculations: Configurable hourly/daily multipliers (e.g., 1.5x regular wage).
* Payroll Run Stages:
  `DRAFT` -> `ATTENDANCE_LOCKED` -> `CALCULATED` -> `HR_REVIEW` -> `APPROVED` -> `DISBURSED`.
* Dynamic PDF payslip generator with company branding.
* Bulk bank disbursement export format (CSV/Excel).

### 4.5 Reporting & Audit
* Real-time attendance dashboards and drill-down exports (CSV, Excel, PDF).
* Immutable security audit logs recording every login, permission change, attendance punch, and payroll modification.

---

## 5. Non-Functional Requirements (NFR)

| Category | Requirement | Target Metric |
| :--- | :--- | :--- |
| **Performance** | API response latency (p95) for attendance punch | < 250ms (excluding ML image inference) |
| **Performance** | Web Admin Dashboard initial load | < 1.5s on broadband connection |
| **Scalability** | Tenant support | Horizontally scalable; capable of supporting 10,000+ tenants |
| **Availability** | Core API uptime | 99.9% monthly availability |
| **Data Isolation** | Multi-tenant segregation | Absolute logical isolation; tenantId mandatory filter on all MongoDB operations |
| **Data Protection** | Encryption at rest and in transit | TLS 1.3 in transit; AES-256 for sensitive DB fields (passwords, bank details) |
| **Regulatory & Compliance** | Data retention & auditability | Minimum 7-year audit trail for payroll & tax data; GDPR/Data privacy compliance |
| **Mobile Reliability** | Offline resilience | Queued offline punches with tamper-proof device encryption & server sync validation |

---

## 6. Assumptions & Unresolved Business Rules

> [!WARNING]
> The following items represent domain assumptions and open business rules that must be finalized with product stakeholders prior to implementing production payroll and attendance calculators:

1. **Tax Jurisdictions**:
   - *Assumption*: Initial baseline structure supports parameterized earnings and deductions configurable per tenant.
   - *Unresolved*: Does WorkforcePro need built-in country-specific tax engines (e.g., India Indian Income Tax & PF/ESI slabs, US W-4/FICA withholding, UK PAYE) or a configurable formula engine where administrators enter regional slab rules?
2. **Device Hardware Binding Release Policy**:
   - *Assumption*: Employees are bound to one primary Android device.
   - *Unresolved*: When an employee replaces their smartphone, is re-binding strictly an HR Admin override, or can a self-service OTP verification flow trigger a re-bind?
3. **Grace Period Accumulation**:
   - *Assumption*: Lateness incurs warnings or deduction points.
   - *Unresolved*: Does 3 late marks in a month automatically trigger a half-day Loss of Pay (LOP), or does it remain at the manager's discretion?
4. **Offline Punch Window**:
   - *Assumption*: Punches taken during cellular dead-zones are stored in encrypted local storage and uploaded once back online.
   - *Unresolved*: What is the maximum acceptable age for an offline punch before it requires mandatory HR manual approval (e.g., 24 hours)?
