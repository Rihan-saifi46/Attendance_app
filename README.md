# WorkforcePro — Enterprise Workforce Management SaaS

WorkforcePro is an independent, multi-tenant B2B workforce management SaaS platform engineered for modern enterprises with hybrid, on-premise, and field workforces. It features geofence-verified, anti-tamper mobile attendance and an automated, attendance-integrated payroll calculation engine.

---

## 1. System Applications & Technology Stack

| Application | Platform | Directory | Technology Stack |
| :--- | :--- | :--- | :--- |
| **Shared Contracts** | Shared Library | `packages/api-contracts` | TypeScript, Zod |
| **Backend REST API** | Cloud Server | `apps/api` | Node.js (v22+) + Express + TypeScript + Mongoose |
| **Web Admin Portal** | Desktop Web | `apps/admin` | React 18 + Vite + TypeScript |
| **Mobile Employee Client** | Android (Mobile) | `apps/mobile` | Flutter 3.47+ & Dart 3.13+ |

---

## 2. Monorepo Organization

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
├── package.json                   # Root monorepo workspace configuration
├── tsconfig.base.json             # Shared strict TypeScript compiler configuration
├── .gitignore
├── .env.example                   # Environment configuration template
└── README.md
```

---

## 3. Getting Started & Setup Guide

### 3.1 Prerequisites
* **Node.js**: `v20.x` or `v22.x` (Recommended: `v22.12.0`)
* **npm**: `v10.x` or `v11.x` (Recommended: `v11.6.1`)
* **Flutter SDK**: `v3.24.x` or higher (Tested: `v3.47.4`) with Dart `3.x`
* **MongoDB**: `v7.x` (local or hosted MongoDB Atlas instance)

### 3.2 Environment Setup
1. Clone the repository and navigate to the project directory:
   ```bash
   cd WorkforcePro
   ```

2. Copy the environment configuration template:
   ```bash
   cp .env.example .env
   ```
   *(Update variables in `.env` as appropriate for your local MongoDB instance. Never commit `.env` or production secrets).*

3. Install monorepo dependencies:
   ```bash
   npm install
   ```

4. Resolve Flutter mobile dependencies:
   ```bash
   cd apps/mobile && flutter pub get && cd ../..
   ```

---

## 4. Build, Test & Development Commands

### 4.1 Build
* **Build Shared Contracts**:
  ```bash
  npm run build:contracts
  ```
* **Build Backend API**:
  ```bash
  npm run build:api
  ```
* **Build Web Admin Portal**:
  ```bash
  npm run build:admin
  ```
* **Build All (Full Workspace)**:
  ```bash
  npm run build
  ```

### 4.2 Type-Check & Lint
* **Type-check all workspaces**:
  ```bash
  npm run typecheck
  ```
* **Analyze Flutter code**:
  ```bash
  npm run mobile:analyze
  ```

### 4.3 Automated Testing
* **Test Shared Contracts** (Vitest):
  ```bash
  npm run test:contracts
  ```
* **Test Backend API** (Vitest + Supertest integration):
  ```bash
  npm run test:api
  ```
* **Test Web Admin Portal** (Vitest):
  ```bash
  npm run test:admin
  ```
* **Test Mobile Client** (Flutter Test):
  ```bash
  npm run test:mobile
  ```
* **Run All Web/Node Tests**:
  ```bash
  npm test
  ```

### 4.4 Independent Local Development
Each application can be run independently in watch/dev mode:

* **Backend API** (Runs on port `5000` with live reload):
  ```bash
  npm run dev:api
  ```
* **Web Admin Portal** (Runs on port `3000` via Vite HMR):
  ```bash
  npm run dev:admin
  ```
* **Shared Contracts Watcher** (Auto-compiles contracts on change):
  ```bash
  npm run dev:contracts
  ```
* **Mobile Client** (Android emulator / device):
  ```bash
  cd apps/mobile && flutter run
  ```

---

## 5. Architectural Invariants

* **Strict Multi-Tenant Isolation**: Data isolation enforced at both the application and Mongoose schema query middleware layer.
* **Shared Strongly-Typed Contracts**: All HTTP endpoints, standard error envelopes, and DTOs are declared in `@workforcepro/api-contracts` using Zod schemas and inferred TypeScript types.
* **Zero Production Secrets**: Environment variables are validated on startup using Zod schemas in `apps/api/src/config/env.ts`.

---

## 6. Implementation Status

* **Phase 0 (Discovery & Planning)**: Completed.
* **Phase 1 (Monorepo Foundation & API Contracts)**: Completed & Verified.
* **Phase 2 (Multi-Tenant Architecture & Auth)**: Pending Review & Approval.
