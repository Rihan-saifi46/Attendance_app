# WorkforcePro — Enterprise Workforce Management SaaS

WorkforcePro is an independent, multi-tenant B2B workforce management SaaS platform engineered for modern enterprises with hybrid, on-premise, and field workforces. It features geofence-verified, anti-tamper mobile attendance and an automated, attendance-integrated payroll calculation engine.

---

## 1. System Applications & Technology Stack

| Application | Platform | Technology Stack |
| :--- | :--- | :--- |
| **Mobile Employee Client** | Android (Mobile) | Flutter + Dart (BLoC, Native Platform Channels, ML Kit) |
| **Web Admin Portal** | Desktop Web | React 18 + Vite + TypeScript (TanStack Query, Zustand) |
| **Backend REST API** | Cloud Server | Node.js + Express + TypeScript (Clean Architecture) |
| **Database & Storage** | Document / Object | MongoDB 7.x + Mongoose, Redis, S3-Compatible Object Store |

---

## 2. Monorepo Structure

```
workforcepro/
├── apps/
│   ├── mobile/                    # Android Employee App (Flutter / Dart)
│   ├── admin/                     # Web Admin Portal (React / Vite / TypeScript)
│   └── api/                       # REST API (Node.js / Express / TypeScript)
├── packages/
│   └── api-contracts/             # Shared Typed DTOs, Enums & Zod Schemas
├── docs/                          # Comprehensive Architecture & System Specifications
│   ├── PRODUCT_REQUIREMENTS.md    # Product Requirements Document (PRD)
│   ├── FEATURE_MATRIX.md          # Multi-Platform Feature & RBAC Matrix
│   ├── ARCHITECTURE.md            # System Architecture & Clean Architecture Spec
│   ├── DATABASE_SCHEMA.md         # Multi-Tenant MongoDB Schemas & Indexes
│   ├── API_SPECIFICATION.md       # REST API Specifications & Error Envelopes
│   ├── SECURITY_MODEL.md          # Multi-Tenant Isolation & Anti-Tamper Model
│   ├── REPOSITORY_AUDIT.md        # Open Source Research & License Report
│   ├── ATTENDANCE_RULES.md        # GPS Geofence & Selfie Verification Rules
│   ├── PAYROLL_RULES.md           # Payroll Mathematical & Statutory Engine Spec
│   ├── TESTING_STRATEGY.md        # Quality Assurance & Testing Pyramid
│   └── IMPLEMENTATION_PHASES.md   # Phased Implementation Roadmap
├── .gitignore
├── .env.example
└── README.md
```

---

## 3. Core Architectural Highlights

* **Zero-Trust Multi-Tenancy**: Every database record is strictly partitioned with `tenantId` enforced at the Mongoose query layer.
* **Server-Authoritative Geofencing**: Client GPS coordinates are verified on the backend using the Haversine formula; client assertions are never trusted.
* **Anti-Spoofing & Device Integrity**: Mobile client blocks Android mock locations (`Location.isMock()`), detects root/emulators, and enforces single-device hardware binding.
* **Attendance-Linked Payroll Engine**: Automated Loss of Pay (LOP) deductions, overtime premiums, and parameterized statutory deductions calculated directly from immutable daily attendance records.
* **Clean Architecture & Typed Contracts**: Complete separation of Domain, Application, Interface, and Infrastructure layers, sharing compile-time typed Zod contracts across API, Web Admin, and Mobile clients.

---

## 4. Documentation Index

For detailed specifications, consult the documents in the `docs/` directory:

1. [Product Requirements Document](file:///d:/WORKFORCEPRO/docs/PRODUCT_REQUIREMENTS.md)
2. [Feature Matrix & RBAC](file:///d:/WORKFORCEPRO/docs/FEATURE_MATRIX.md)
3. [System Architecture](file:///d:/WORKFORCEPRO/docs/ARCHITECTURE.md)
4. [Database Schema & ERD](file:///d:/WORKFORCEPRO/docs/DATABASE_SCHEMA.md)
5. [API Specification](file:///d:/WORKFORCEPRO/docs/API_SPECIFICATION.md)
6. [Tenant Isolation & Security Model](file:///d:/WORKFORCEPRO/docs/SECURITY_MODEL.md)
7. [Repository Audit & Research Report](file:///d:/WORKFORCEPRO/docs/REPOSITORY_AUDIT.md)
8. [GPS & Selfie Attendance Rules](file:///d:/WORKFORCEPRO/docs/ATTENDANCE_RULES.md)
9. [Payroll Engine & Calculation Rules](file:///d:/WORKFORCEPRO/docs/PAYROLL_RULES.md)
10. [Testing Strategy & Quality Gates](file:///d:/WORKFORCEPRO/docs/TESTING_STRATEGY.md)
11. [Implementation Roadmap & Phases](file:///d:/WORKFORCEPRO/docs/IMPLEMENTATION_PHASES.md)

---

## 5. Current Status

* **Current Milestone**: Phase 0 (Project Discovery & Planning) — **COMPLETED**.
* **Next Milestone**: Phase 1 (Monorepo Foundation & API Contracts Package).
* Execution is currently halted awaiting stakeholder review and approval.
