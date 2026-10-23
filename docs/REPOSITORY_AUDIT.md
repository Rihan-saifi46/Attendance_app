# WorkforcePro — Repository Audit & Open-Source Research Report

## 1. Executive Summary

As part of the project discovery and architecture planning for WorkforcePro, a thorough technical and legal audit was conducted across prominent publicly available open-source attendance, Human Resource Management Systems (HRMS), and payroll repositories. 

The primary goals of this audit were to:
1. Examine real-world domain models for attendance tracking, geofencing, shift rostering, and payroll calculations.
2. Analyze licensing constraints to ensure zero legal contamination of WorkforcePro.
3. Identify security vulnerabilities, anti-patterns, and architectural weaknesses in existing implementations to ensure WorkforcePro is built resiliently from day one.

> [!CAUTION]
> **Zero Code Contamination Notice**:
> Under no circumstances may code from GPL, AGPL, or LGPL licensed repositories be copied, imported, or adapted into WorkforcePro. WorkforcePro is an independent, proprietary SaaS product built strictly from original specifications using TypeScript, Node.js, React, and Flutter.

---

## 2. Detailed Repository Audits

### 2.1 Frappe HR (`frappe/hrms`)
* **Repository**: `github.com/frappe/hrms`
* **License**: **GNU General Public License v3.0 (GPL-3.0)**
* **Primary Tech Stack**: Python (Frappe Framework), Vue.js, MariaDB / PostgreSQL
* **Architecture & Code Structure**:
  - Modular DocType pattern characteristic of the Frappe ecosystem.
  - Tightly coupled to the Frappe framework's ORM, user session model, and background worker infrastructure.
  - Domain coverage includes Shift Types, Shift Assignments, Attendance Requests, Employee Checkin, and Salary Structures.
* **Test Coverage**:
  - Moderate to good unit test coverage for salary slip calculations and leave ledger balance updates using Python `unittest`.
  - Minimal end-to-end mobile simulation tests.
* **Security & Vulnerability Analysis**:
  - **License Risk**: GPL-3.0 is a strong copyleft license. If any portion of Frappe HR code is incorporated into a proprietary product, the entire codebase must be disclosed under GPL-3.0.
  - **Attendance Anti-Spoofing Deficits**: The mobile check-in relies on standard browser/client-reported coordinates. There is no native hardware mock-location detection, no selfie liveness detection, and no device hardware binding.
  - **Clock Manipulation**: Relies heavily on local time conversions rather than strict server-enforced monotonic time.

---

### 2.2 Horilla (`horilla-org/horilla`)
* **Repository**: `github.com/horilla-org/horilla`
* **License**: **GNU Affero General Public License v3.0 (AGPL-3.0)**
* **Primary Tech Stack**: Python (Django), PostgreSQL, HTML/Tailwind CSS
* **Architecture & Code Structure**:
  - Classic Django Model-View-Template (MVT) architecture with app-level separation (employee, attendance, leave, payroll).
  - Modern UI styling, but tightly coupled frontend templates within Django apps.
* **Test Coverage**:
  - Sparse test coverage across payroll formula calculation edge cases.
  - Very few automated security or penetration tests.
* **Security & Vulnerability Analysis**:
  - **License Risk**: AGPL-3.0 contains a network-use copyleft clause. Hosting modified AGPL software over a network requires offering the complete source code to all network users.
  - **Concurrency Pitfalls**: The attendance check-in/out logic exhibits race conditions where rapid double-clicking by an employee can create duplicate check-in records for the same minute.
  - **Absence of Anti-Spoofing**: Geofence checks, where present in community plugins, are evaluated on the client before submission, allowing trivial bypass via tools like Postman or HTTP proxies.

---

### 2.3 Odoo HR & OCA Payroll (`odoo/odoo` + `OCA/payroll`)
* **Repository**: `github.com/odoo/odoo` & `github.com/OCA/payroll`
* **License**: **LGPL-3.0** (Core Odoo) / **AGPL-3.0** (OCA modules)
* **Primary Tech Stack**: Python, PostgreSQL, JavaScript (OWL framework)
* **Architecture & Code Structure**:
  - Highly generic, dynamic metadata-driven ERP model.
  - Extremely powerful salary rule calculation engine evaluating Python expressions (e.g., `result = contract.wage * 0.10`).
* **Test Coverage**:
  - High coverage on core accounting journal entries and payroll batch calculations.
* **Security & Vulnerability Analysis**:
  - **License Risk**: LGPL/AGPL licensing prohibits proprietary bundling without strict dynamic linking isolation.
  - **Arbitrary Code Execution Risk**: Evaluating dynamic Python code strings for salary rules introduces remote code execution (RCE) risks if an administrative account is compromised.
  - **Over-Engineering**: Extreme schema complexity and relational table overhead create significant performance bottlenecks when scaling to millions of daily attendance punches.

---

### 2.4 OrangeHRM Open Source (`orangehrm/orangehrm`)
* **Repository**: `github.com/orangehrm/orangehrm`
* **License**: **GNU General Public License v2.0 (GPL-2.0)**
* **Primary Tech Stack**: PHP, Symfony framework, MySQL
* **Architecture & Code Structure**:
  - Monolithic PHP application with substantial legacy codebase remnants dating back over a decade.
  - Attendance module is functional for traditional desktop browser check-ins, but lacks modern mobile geofencing workflows.
* **Test Coverage**:
  - Mixed; legacy components have low test coverage, while Symfony API routes have standard PHPUnit coverage.
* **Security & Vulnerability Analysis**:
  - Historical CVEs related to SQL injection in custom search queries and insecure direct object references (IDOR) across employee profile documents.
  - Payroll functionality is intentionally omitted from the open-source edition to drive upgrades to their proprietary enterprise cloud offering.

---

### 2.5 Payroll Engine (`Payroll-Engine/PayrollEngine`)
* **Repository**: `github.com/Payroll-Engine/PayrollEngine`
* **License**: **MIT License** (Permissive)
* **Primary Tech Stack**: C#, .NET 8, Blazor, SQL Server / PostgreSQL
* **Architecture & Code Structure**:
  - Headless, API-first microservice strictly dedicated to multi-jurisdiction payroll rule evaluation.
  - Domain-Driven Design (DDD) with clear boundaries separating wage types, collectors, payrun jobs, and statutory regulations.
* **Test Coverage**:
  - High unit and integration test coverage across complex tax brackets and retroactive wage adjustments.
* **Security & Vulnerability Analysis**:
  - Strong architectural isolation and permissive MIT license.
  - **Limitations**: Completely lacks workforce management, attendance tracking, mobile applications, and geofencing. Built for .NET rather than the Node.js/TypeScript ecosystem chosen for WorkforcePro.

---

## 3. License Compatibility Matrix

| Project | License Type | Permitted for SaaS? | Viral Copyleft? | WorkforcePro Action |
| :--- | :---: | :---: | :---: | :--- |
| **Frappe HR** | GPL-3.0 | Yes (Internal) / No (Proprietary SaaS) | **Yes** (Strict) | **Do Not Copy / Reference Patterns Only** |
| **Horilla** | AGPL-3.0 | No (Network copyleft triggers disclosure) | **Yes** (Extreme) | **Do Not Copy / Reference Patterns Only** |
| **Odoo / OCA** | LGPL-3.0 / AGPL-3.0 | Risky (Requires legal separation) | **Yes** (Module level) | **Do Not Copy / Reference Patterns Only** |
| **OrangeHRM** | GPL-2.0 | No (Proprietary SaaS distribution) | **Yes** (Strict) | **Do Not Copy / Reference Patterns Only** |
| **Payroll Engine**| MIT | **Yes** (Permissive commercial use) | **No** (Safe) | **Design Inspiration for Payroll Math** |

---

## 4. Architectural Lessons & Anti-Patterns to Avoid

From our audit of existing solutions, WorkforcePro explicitly adopts the following defensive design decisions:

1. **Never Evaluate Dynamic Unsanitized Expressions**:
   * *Anti-pattern in Odoo/Frappe*: Evaluating raw Python/JS strings for salary rules (`eval(formula)`).
   * *WorkforcePro approach*: A sandboxed, deterministic math parser (e.g. mathjs with disabled execution scopes) for user-defined salary formulas.
2. **Never Trust Client Location Calculations**:
   * *Anti-pattern in Horilla/Frappe*: Mobile app determines whether the user is inside the geofence and merely sends a boolean `is_inside: true`.
   * *WorkforcePro approach*: Mobile app sends raw coordinates and accuracy; Node.js backend calculates distance using the Haversine formula against authorized geofences.
3. **Prevent Concurrency Race Conditions on Check-Ins**:
   * *Anti-pattern*: Rapid concurrent requests create multiple simultaneous punch records.
   * *WorkforcePro approach*: Distributed locking via Redis or MongoDB unique partial indexes preventing duplicate punches within a 60-second window.
4. **Strict Server NTP Monotonic Time**:
   * *Anti-pattern*: Relying on device clock timestamps for daily attendance records.
   * *WorkforcePro approach*: Server-side timestamping `serverTimestamp = new Date()` serves as the immutable single source of truth.
