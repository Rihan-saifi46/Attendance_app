# WorkforcePro — System Architecture Document

## 1. Architectural Overview & Design Principles

WorkforcePro is architected as an enterprise-grade, multi-tenant workforce management Software-as-a-Service (SaaS) platform. The system adheres to **Clean Architecture** principles to guarantee loose coupling, high testability, framework independence, and strict multi-tenant boundary isolation.

```mermaid
flowchart TB
    subgraph Clients [Client Layer]
        Mobile["Android Mobile Client\n(Flutter + Dart)"]
        Admin["Web Admin Portal\n(React + Vite + TypeScript)"]
    end

    subgraph Gateway [Ingress & Edge Security]
        ReverseProxy["Nginx / Cloudflare Ingress\n(TLS 1.3 Termination, WAF, Rate Limiting)"]
    end

    subgraph API [Backend Application (Node.js + Express + TypeScript)]
        subgraph Middlewares [Boundary Middlewares]
            CorsHelmet["Security Headers (Helmet, CORS)"]
            TenantResolver["Tenant Resolution Middleware\n(Subdomain / X-Tenant-ID / JWT)"]
            AuthGuard["Authentication Guard (JWT Verify)"]
            RBACGuard["RBAC Authorization Middleware"]
            ReqValidator["Schema Validation (Zod DTOs)"]
        end

        subgraph CleanArch [Clean Architecture Layers]
            Controllers["Interface Adapters / Controllers"]
            UseCases["Application Services / Use Cases\n(Punch, Regularize, Payroll Calc)"]
            Domain["Domain Models & Business Entities\n(Tenant, Employee, Shift, Attendance, Payroll)"]
            Repos["Infrastructure Adapters / Repositories\n(Mongoose Repositories, S3, Emailer)"]
        end
    end

    subgraph Data [Data & Storage Layer]
        MongoDB[("MongoDB 7.x Cluster\n(Tenant-Indexed Document Store)")]
        ObjectStore[("S3 Compatible Object Store\n(Selfie Audits, Payslip PDFs)")]
        RedisStore[("Redis Cache & Rate Limiting\n(Revocation Blacklist, Rate Limiting)")]
    end

    Mobile -->|HTTPS REST + JSON| ReverseProxy
    Admin -->|HTTPS REST + JSON| ReverseProxy
    ReverseProxy --> CorsHelmet
    CorsHelmet --> TenantResolver
    TenantResolver --> AuthGuard
    AuthGuard --> RBACGuard
    RBACGuard --> ReqValidator
    ReqValidator --> Controllers
    Controllers --> UseCases
    UseCases --> Domain
    UseCases --> Repos
    Repos --> MongoDB
    Repos --> ObjectStore
    Repos --> RedisStore
```

---

## 2. Monorepo Organization & Directory Topology

The codebase is organized as a unified, clean monorepo:

```
workforcepro/
├── apps/
│   ├── mobile/                    # Android Employee App (Flutter / Dart)
│   │   ├── android/               # Android Native Platform Shell & Manifests
│   │   ├── lib/                   # Flutter Application Source
│   │   │   ├── core/              # Theme, Network, Storage, Hardware Plugins
│   │   │   ├── features/          # Auth, Attendance, Leaves, Profile, Payslips
│   │   │   └── main.dart
│   │   └── pubspec.yaml
│   ├── admin/                     # Web Admin Portal (React / Vite / TypeScript)
│   │   ├── src/
│   │   │   ├── components/        # Reusable UI Components (DataTables, Modals)
│   │   │   ├── pages/             # Dashboard, Attendance, Employees, Payroll
│   │   │   ├── services/          # API Client Layer (Axios / TanStack Query)
│   │   │   ├── hooks/             # Custom React Hooks
│   │   │   └── App.tsx
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── api/                       # REST API (Node.js / Express / TypeScript)
│       ├── src/
│       │   ├── domain/            # Entities, Value Objects, Domain Exceptions
│       │   ├── application/       # Use Cases, DTOs, Service Interfaces
│       │   ├── interfaces/        # Express Controllers, Middlewares, Routes
│       │   ├── infrastructure/    # Mongoose Schemas, S3 Adapter, DB Connection
│       │   └── server.ts          # Server Entrypoint & Lifecycles
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   └── api-contracts/             # Shared Typed DTOs, Zod Schemas & Enums
│       ├── src/
│       │   ├── auth.contract.ts
│       │   ├── attendance.contract.ts
│       │   ├── payroll.contract.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── docs/                          # Architecture, Schemas, API Specs, Rules
├── .gitignore
├── .env.example
└── README.md
```

---

## 3. Backend Clean Architecture Specifications

The API follows strict dependency inversion rules. Inner layers never depend on outer layers.

```
       +-------------------------------------------------+
       | Frameworks & Drivers (Express, Mongoose, AWS)   |
       |    +---------------------------------------+    |
       |    | Interface Adapters (Controllers, DTOs)|    |
       |    |    +-----------------------------+    |    |
       |    |    | Application (Use Cases)     |    |    |
       |    |    |    +-------------------+    |    |    |
       |    |    |    | Domain (Entities) |    |    |    |
       |    |    |    +-------------------+    |    |    |
       |    |    +-----------------------------+    |    |
       |    +---------------------------------------+    |
       +-------------------------------------------------+
```

### 3.1 Domain Layer (`apps/api/src/domain`)
* **Responsibilities**: Contains core business rules, entity models, domain errors, and value objects. Completely decoupled from MongoDB, Express, or external frameworks.
* **Entities**:
  - `Tenant`: Organization identity, plan status, tenant settings.
  - `Employee`: Personal, employment, and device-binding data.
  - `AttendancePunch`: Punch timestamp, coordinate, verification status, geofence audit.
  - `Shift`: Shift windows, buffer times, late thresholds.
  - `SalaryStructure`: Formulas, allowance components, deduction components.
  - `PayRun`: Pay period, aggregated calculation, status transitions.

### 3.2 Application Layer (`apps/api/src/application`)
* **Responsibilities**: Orchestrates business use cases. Accepts DTO inputs, drives domain entities, interacts with repositories via abstraction interfaces, and produces output DTOs.
* **Use Cases**:
  - `RecordPunchUseCase`: Validates device binding, validates mock GPS status, checks server geofence, verifies selfie liveness, persists punch, adjusts daily attendance record.
  - `RegularizeAttendanceUseCase`: Handles requests and approvals with audit trail.
  - `ExecutePayRunUseCase`: Aggregates monthly attendance, computes LOP, calculates statutory deductions, issues payslips.

### 3.3 Interface Layer (`apps/api/src/interfaces`)
* **Responsibilities**: Handles HTTP transport, routing, serialization, parameter parsing, and maps exceptions to HTTP status codes.
* **Middlewares**:
  - `TenantContextMiddleware`: Extracts tenant identity from JWT claim or header, injects it into request context `req.tenantContext`.
  - `AuthMiddleware`: Validates asymmetric JWT or HMAC tokens.
  - `RolePermissionGuard`: Enforces RBAC permissions per route.
  - `ZodValidationMiddleware`: Validates request bodies, query parameters, and route parameters against schemas imported from `@workforcepro/api-contracts`.

### 3.4 Infrastructure Layer (`apps/api/src/infrastructure`)
* **Responsibilities**: Implements interfaces defined by the Application layer. Houses Mongoose database schemas, connection pooling, Redis caching, AWS S3 / MinIO storage drivers, and third-party notifications.
* **Tenant Isolation Pattern**:
  - Every Mongoose query automatically scopes by `tenantId`.
  - Schemas utilize compound indexes starting with `tenantId` (e.g., `{ tenantId: 1, employeeId: 1, punchDate: -1 }`).

---

## 4. Web Admin Architecture (React + Vite + TypeScript)

* **UI Framework**: React 18+ with TypeScript, bundled with Vite for fast build and HMR.
* **State Management**:
  - **Server State**: `@tanstack/react-query` for query caching, deduplication, optimistic updates, and background refetching.
  - **Client State**: Zustand for lightweight local authentication and UI preferences (e.g., sidebar state, theme).
* **UI Components**: Modern, responsive dashboard design utilizing Lucide icons, accessible primitives, and customized CSS modules/Tailwind for consistent theming.
* **Geofence Mapping**: Leaflet / Mapbox GL with interactive polygon and circle drawing tools to configure physical office perimeters.
* **Contracts Integration**: Consumes shared TypeScript types and validation schemas directly from `@workforcepro/api-contracts` to ensure type-safe forms and responses.

---

## 5. Mobile Application Architecture (Android Flutter + Dart)

* **Architecture Pattern**: BLoC (Business Logic Component) with clean separation:
  - `Presentation Layer`: Flutter widgets, reactive BLoC state listeners.
  - `Domain Layer`: Use cases, value objects, domain entities.
  - `Data Layer`: Repositories, REST API data providers, secure local database (Hive / Isar / SQLite).
* **Hardware & Native Integration**:
  - **Geolocator & Mock Location Detection**: Integrates native Android Location APIs (`Location.isFromMockProvider()` on API < 31, and `Location.isMock()` on API >= 31) plus checks for developer mode test providers.
  - **Camera & Liveness Capture**: Utilizes camera plugin with front-camera lock, capturing uncompressed selfie frames for liveness and facial audit.
  - **Hardware Device Binding**: Queries Android DRM / Device identifiers to generate a stable hardware fingerprint stored on device and verified on the backend.
  - **Offline Storage & Sync Engine**: Local encrypted punch queue with exponential backoff synchronization when network is restored.

---

## 6. Storage & Communication Protocol

1. **Protocol**: HTTP/2 over TLS 1.3 for all REST API endpoints. WebSockets reserved for real-time attendance monitor feeds on the admin dashboard.
2. **Binary Storage (Selfies & Payslips)**:
   - Selfies are not stored directly in MongoDB. They are uploaded to an S3-compatible private bucket under tenant-partitioned paths (`/tenants/{tenantId}/selfies/{year}/{month}/{punchId}.jpg`).
   - S3 presigned URLs with short TTL (15 minutes) are used by the Web Admin to view audit photos.
3. **Session & Token Management**:
   - Short-lived Access Token (JWT, 15 minutes TTL).
   - Long-lived Refresh Token (Stored in HTTP-only, Secure, SameSite=Strict cookie for Web, and flutter_secure_storage for Mobile).
   - Redis token revocation blacklist for immediate session revocation upon logout or password change.
