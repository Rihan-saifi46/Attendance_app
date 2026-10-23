# WorkforcePro — Quality Assurance & Testing Strategy

## 1. Testing Pyramid & Verification Philosophy

WorkforcePro enforces a strict, multi-tiered testing strategy designed to validate domain correctness, tenant isolation, anti-spoofing defense mechanisms, and calculation accuracy.

```
                  / \
                 /   \
                / E2E \       <-- Playwright (Admin UI), Flutter Driver (Mobile)
               /-------\
              / Security\     <-- Cross-Tenant Leak Tests, GPS Spoof Injection
             /-----------\
            / Integration \   <-- Supertest API, In-Memory Mongo, Express Routes
           /---------------\
          /   Unit Tests    \ <-- Vitest (Domain Math, Haversine, Payroll Formulas)
         +-------------------+
```

---

## 2. Testing Tiers & Scope

### 2.1 Unit Tests (Domain & Application Layers)
* **Scope**: Pure business logic, value objects, mathematical algorithms, and validation rules. Zero database or network dependencies.
* **Key Test Suites**:
  - `HaversineDistanceTest`: Validates exact meter calculations across known global coordinate pairs, boundary conditions ($d = \text{radius}$), and accuracy buffer caps.
  - `PayrollCalculationTest`: Validates LOP deductions across 28, 29, 30, and 31-day months, half-day deductions, overtime multipliers, and statutory progressive slab computations.
  - `AttendanceStateMachineTest`: Validates state transitions (`Scheduled` $\rightarrow$ `Present`, `Late`, `HalfDay`, `Absent`) under various shift configurations.
  - `ApiContractValidationTest`: Validates Zod schema parsing and rejection of invalid payloads before hitting controllers.
* **Tooling**: `vitest` (fast execution with native TypeScript and ESM support).

### 2.2 Integration Tests (Interface & Infrastructure Layers)
* **Scope**: Express routers, controllers, middlewares, Mongoose repositories, and database queries.
* **Database Strategy**: Isolated ephemeral database per test suite using `mongodb-memory-server` to guarantee deterministic state without cross-test side effects.
* **Key Test Suites**:
  - `AuthFlowTest`: Registration, login, JWT issuance, refresh token rotation, and invalidation.
  - `PunchControllerTest`: Multipart upload parsing, file validation, coordinate extraction, and persistence.
  - `ShiftRosterTest`: Employee schedule assignment and shift lookup queries.
  - `PayRunIntegrationTest`: Full end-to-end batch processing from daily attendance records to locked pay run and generated payslip records.

### 2.3 Dedicated Multi-Tenant Isolation Test Suite
A dedicated security test suite specifically attempts cross-tenant unauthorized data access:
1. **Tenant Isolation Fixture**: Spawns two distinct tenants (`Tenant_A` and `Tenant_B`) with distinct users, employees, shifts, and punches.
2. **Cross-Tenant Breach Scenarios Tested**:
   - `Tenant_A` user attempting to fetch `Tenant_B` employee profile via direct ID (`GET /api/v1/employees/:tenantB_empId`) $\rightarrow$ Must return `404 Not Found` or `403 Forbidden`.
   - `Tenant_A` punch submission with `X-Tenant-ID: Tenant_B` $\rightarrow$ Must be rejected at middleware layer.
   - Malicious MongoDB query injection attempting to omit `tenantId` $\rightarrow$ Must trigger Mongoose tenant plugin error and abort.

### 2.4 Mobile & Anti-Spoofing Security Tests
* **Mock Location Rejection**: Validates that when `isMock: true` is passed or mock provider flags are detected, the API rejects the punch with HTTP 422 and logs a security event.
* **Clock Skew Rejection**: Simulates a client timestamp forged into the future or past; verifies that the server ignores client time and enforces server NTP time.
* **Device Binding Test**: Attempts a punch using a mismatched `deviceId`; verifies immediate rejection with `DEVICE_MISMATCH`.

### 2.5 End-to-End (E2E) UI Testing
* **Web Admin Portal**: Playwright tests covering:
  - Admin login and dashboard telemetry rendering.
  - Geofence polygon/circle configuration on interactive map.
  - Employee onboarding and shift assignment.
  - Pay run execution, preview inspection, and approval.
* **Mobile App (Flutter)**:
  - Widget tests for punch button states, offline indicators, and camera preview canvas.
  - Integration tests using Flutter Driver on Android emulator.

---

## 3. Test Automation & CI Quality Gates

Every code phase and pull request must satisfy the following automated quality gates before approval:

| Gate | Tool | Threshold / Criteria |
| :--- | :--- | :--- |
| **Code Formatting** | Prettier / `dart format` | 100% compliant |
| **Static Linting** | ESLint / `dart analyze` | 0 errors, 0 warnings |
| **Type Check** | `tsc --noEmit` | 0 compile errors |
| **Contract Consistency** | API Contract Vitest | 100% passing schemas |
| **Unit Test Coverage** | Vitest Coverage | $\ge 85\%$ on Domain & Calculation engines |
| **Tenant Isolation Suite**| Vitest Integration | 100% passing (0 cross-tenant leaks) |
| **Dependency Audit** | `npm audit` / Dependabot | 0 Critical or High CVEs |

---

## 4. Test Directory Layout

```
workforcepro/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   └── tests/
│   │       ├── unit/
│   │       │   ├── domain/
│   │       │   ├── algorithms/
│   │       │   └── calculations/
│   │       ├── integration/
│   │       │   ├── auth/
│   │       │   ├── attendance/
│   │       │   └── payroll/
│   │       ├── security/
│   │       │   ├── tenant-isolation.spec.ts
│   │       │   └── anti-spoofing.spec.ts
│   │       └── setup.ts
│   ├── admin/
│   │   └── src/
│   │       └── __tests__/
│   └── mobile/
│       └── test/
└── packages/
    └── api-contracts/
        └── src/
            └── __tests__/
```
