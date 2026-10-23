# WorkforcePro — Enterprise Workforce Management SaaS

WorkforcePro is an independent, multi-tenant B2B workforce management SaaS platform engineered for modern enterprises with hybrid, on-premise, and field workforces. It features geofence-verified, anti-tamper mobile attendance and an automated, attendance-integrated payroll calculation engine.

---

## 1. System Applications & Technology Stack

| Application | Platform | Directory | Technology Stack |
| :--- | :--- | :--- | :--- |
| **Shared Contracts** | Shared Library | `packages/api-contracts` | TypeScript (Strict), Zod |
| **Backend REST API** | Cloud Server | `apps/api` | Node.js (v22+) + Express + TypeScript (Strict) + Mongoose |
| **Web Admin Portal** | Desktop Web | `apps/admin` | React 18 + Vite + TypeScript (Strict) |
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
│   └── api-contracts/             # Shared Typed DTOs, Enums, v1 Versioned Zod Schemas
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
├── eslint.config.mjs              # ESLint 9 Flat Config with TypeScript support
├── .prettierrc                    # Code formatting standard configuration
├── .gitignore                     # Git exclusion rules for secrets, builds, IDE & logs
├── .env.example                   # Environment configuration template (placeholders only)
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

## 4. Build, Lint, Format & Automated Test Commands

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

### 4.2 Type-Checking & Linting
* **Type-check all TypeScript workspaces**:
  ```bash
  npm run typecheck
  ```
* **Lint all TypeScript workspaces (ESLint)**:
  ```bash
  npm run lint
  ```
* **Analyze Flutter code**:
  ```bash
  npm run mobile:analyze
  ```

### 4.3 Code Formatting (Prettier)
* **Check formatting**:
  ```bash
  npm run format:check
  ```
* **Auto-format source files**:
  ```bash
  npm run format
  ```

### 4.4 Automated Testing
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

---

## 5. Independent Application Execution

Each application is decoupled and can be installed, configured, and run independently:

### 5.1 Backend REST API (`apps/api`)
```bash
# Navigate to the API application
cd apps/api

# Install dependencies (or install at root)
npm install

# Build TypeScript
npm run build

# Start in development mode with live-reload
npm run dev

# Or start compiled production server
npm start
```
* The API runs by default on `http://localhost:5000`.
* Verify health check:
  ```bash
  curl http://localhost:5000/health
  # Or versioned endpoint:
  curl http://localhost:5000/api/v1/health
  ```
* Returns `200 OK` (with `status: "ok"` when MongoDB is connected, or `status: "degraded"` when running without active DB).

### 5.2 Web Admin Portal (`apps/admin`)
```bash
# Navigate to the Admin application
cd apps/admin

# Install dependencies
npm install

# Start Vite development server with HMR
npm run dev

# Or build and preview production distribution
npm run build
npm run preview
```
* Accessible by default on `http://localhost:5173` (dev) or `http://localhost:4173` (preview).

### 5.3 Android Mobile Employee Client (`apps/mobile`)
```bash
# Navigate to the Mobile application
cd apps/mobile

# Get dependencies
flutter pub get

# Run static analysis
flutter analyze

# Run unit and widget tests
flutter test

# Launch mobile application on connected emulator or device
flutter run
```

---

## 6. Architectural Invariants

* **Strict TypeScript Strict Mode**: Enforced across API and Web Admin with `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`, and `noUncheckedIndexedAccess: true`.
* **Shared, Versioned API Contracts**: Standard error envelopes, pagination metadata, and DTOs are defined in `@workforcepro/api-contracts` under the `v1` namespace using Zod schemas.
* **Sensitive Data Redaction**: Pino structured logging redacts passwords, tokens, authorization headers, cookies, banking details, and secrets across top-level and nested properties.
* **Resilient MongoDB Connection Management**: Implements connection pooling (`maxPoolSize: 20`, `minPoolSize: 5`), reconnection event handling, graceful shutdown (`SIGTERM`/`SIGINT`), and non-crashing degraded operation during startup when the database is temporarily unreachable.
* **Separation of Environments**: Dedicated test configuration (`workforcepro_test` database, silent logging during tests) isolated from development and production configs.

---

## 7. Implementation Status

* **Phase 0 (Discovery & Planning)**: Completed.
* **Phase 1 (Monorepo Foundation & API Contracts)**: Completed & Verified.
* **Phase 2 (Fresh Project Foundation Review)**: Verified and ready for review.
