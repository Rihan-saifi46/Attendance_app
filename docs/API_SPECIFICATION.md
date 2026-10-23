# WorkforcePro — API Specification

## 1. REST API Standards & Conventions

* **Base URL**: `https://api.workforcepro.io/api/v1`
* **Transport**: HTTPS (TLS 1.3 enforced)
* **Format**: `application/json` (Multipart form-data for selfie punch uploads)
* **Authentication**: Bearer JWT (`Authorization: Bearer <jwt_access_token>`)
* **Tenant Identification**: Injected via JWT claim `tenantId` or header `X-Tenant-ID` (validated against user's tenant).

---

## 2. Standard Envelope Formats

### 2.1 Success Response Envelope
```json
{
  "success": true,
  "data": {},
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 120,
    "totalPages": 5
  },
  "timestamp": "2026-10-23T12:30:00.000Z"
}
```

### 2.2 Error Response Envelope
```json
{
  "success": false,
  "error": {
    "code": "GEOFENCE_VIOLATION",
    "message": "Punch location is 142 meters outside the authorized office boundary.",
    "details": {
      "distanceMeters": 142.4,
      "allowedRadiusMeters": 100.0,
      "geofenceName": "Headquarters Tech Park"
    }
  },
  "timestamp": "2026-10-23T12:30:00.000Z"
}
```

### 2.3 Common HTTP Status Codes
* `200 OK`: Successful read or update operation.
* `201 Created`: Resource successfully created.
* `400 Bad Request`: Validation failure or malformed payload.
* `401 Unauthorized`: Missing, expired, or invalid JWT token.
* `403 Forbidden`: Insufficient RBAC permission or cross-tenant access attempt.
* `409 Conflict`: Business rule collision (e.g. duplicate employee code, double punch-in).
* `422 Unprocessable Entity`: Business logic rejection (e.g. mock GPS detected, outside geofence).
* `429 Too Many Requests`: Rate limit exceeded.
* `500 Internal Server Error`: Unhandled server exception.

---

## 3. Core API Endpoint Catalog

### 3.1 Authentication & Device Binding (`/api/v1/auth`)

#### `POST /auth/login`
Authenticates a user via email and password. Returns JWT pair and tenant context.
* **Headers**: `X-Tenant-ID: <subdomain_or_id>`
* **Request**:
```json
{
  "email": "employee@acme.com",
  "password": "SecurePassword123!",
  "deviceId": "a4f89b72-3c11-4d18-912a-89a194bc0281",
  "deviceModel": "Pixel 8 Pro"
}
```
* **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "d82f710e...",
    "expiresIn": 900,
    "user": {
      "id": "6718d7...",
      "email": "employee@acme.com",
      "role": "EMPLOYEE",
      "tenantId": "6718c5...",
      "employeeId": "6718e2...",
      "deviceBound": true
    }
  }
}
```

#### `POST /auth/bind-device`
Enrolls the current physical device hardware ID to the employee record.
* **Auth**: Required (`EMPLOYEE`)
* **Request**:
```json
{
  "deviceId": "a4f89b72-3c11-4d18-912a-89a194bc0281",
  "deviceModel": "Pixel 8 Pro",
  "fingerprint": "google/husky/husky:14/AP2A.240805.005/12025142:user/release-keys"
}
```
* **Response `200 OK`**: Device successfully bound.

#### `POST /auth/refresh`
Refreshes an expired access token using the valid refresh token.

---

### 3.2 Attendance & Geofenced Punching (`/api/v1/attendance`)

#### `POST /attendance/punch`
Submits a geofence-validated attendance punch with camera selfie and device integrity checks.
* **Auth**: Required (`EMPLOYEE`)
* **Content-Type**: `multipart/form-data`
* **Form Fields**:
  - `punchType`: `"PUNCH_IN"` | `"PUNCH_OUT"`
  - `latitude`: `12.971598`
  - `longitude`: `77.594562`
  - `accuracy`: `12.5` (meters)
  - `clientTimestamp`: `"2026-10-23T09:05:00.000Z"`
  - `deviceId`: `"a4f89b72-3c11-4d18-912a-89a194bc0281"`
  - `isMockLocation`: `false` (Client-side native check)
  - `selfie`: Binary image file (JPEG, max 3MB)
* **Response `201 Created`**:
```json
{
  "success": true,
  "data": {
    "punchId": "6718fa10...",
    "punchType": "PUNCH_IN",
    "serverTimestamp": "2026-10-23T09:05:02.140Z",
    "status": "VERIFIED",
    "geofence": {
      "id": "6718c99...",
      "name": "Headquarters Tech Park",
      "distanceMeters": 28.4
    },
    "attendanceSummary": {
      "date": "2026-10-23",
      "status": "PRESENT",
      "lateMinutes": 5
    }
  }
}
```
* **Error `422 Unprocessable Entity` (Mock Location Triggered)**:
```json
{
  "success": false,
  "error": {
    "code": "MOCK_LOCATION_DETECTED",
    "message": "Punch rejected: Device is using mock location or developer test provider."
  }
}
```

#### `GET /attendance/today`
Returns the current day's punch events, shift schedule, and working hours accumulator for the logged-in employee.

#### `GET /attendance/history`
Query historical attendance logs.
* **Query Params**: `startDate=2026-10-01&endDate=2026-10-31&page=1&limit=31`

#### `POST /attendance/regularize`
Submits an attendance regularization request for missing or flagged punches.
* **Request**:
```json
{
  "date": "2026-10-22",
  "reasonType": "OUTDOOR_DUTY",
  "reasonText": "Client site deployment at Partner Office",
  "requestedInTime": "2026-10-22T09:00:00.000Z",
  "requestedOutTime": "2026-10-22T18:00:00.000Z"
}
```

#### `PATCH /attendance/regularize/:id/review`
Approves or rejects a regularization request.
* **Auth**: Required (`HR_MANAGER` or `SHIFT_SUPERVISOR`)

---

### 3.3 Geofence & Shift Configuration (`/api/v1/geofences`, `/api/v1/shifts`)

#### `POST /geofences`
Creates a new geofence site.
* **Auth**: Required (`TENANT_ADMIN`, `HR_MANAGER`)
* **Request**:
```json
{
  "branchId": "6718b10...",
  "name": "Downtown Development Center",
  "shapeType": "CIRCLE",
  "latitude": 12.971598,
  "longitude": 77.594562,
  "radiusMeters": 150,
  "wifiBssids": ["aa:bb:cc:dd:ee:ff"]
}
```

#### `POST /shifts`
Defines a shift schedule.
* **Request**:
```json
{
  "name": "Standard Morning Shift",
  "code": "SMS-01",
  "startTime": "09:00",
  "endTime": "18:00",
  "breakDurationMinutes": 60,
  "gracePeriodMinutes": 15,
  "halfDayThresholdHours": 4.5,
  "fullDayThresholdHours": 8.0,
  "workDays": [1, 2, 3, 4, 5]
}
```

---

### 3.4 Payroll Engine Endpoints (`/api/v1/payroll`)

#### `POST /payroll/structures`
Defines an earnings and deductions salary structure.

#### `POST /payroll/runs`
Initiates a monthly or bi-weekly pay run.
* **Request**:
```json
{
  "payPeriodMonth": 10,
  "payPeriodYear": 2026
}
```

#### `GET /payroll/runs/:id/preview`
Returns a calculated preview of employee earnings, Loss of Pay (LOP) deductions computed from unregularized absences, overtime bonuses, and tax withholdings.

#### `POST /payroll/runs/:id/approve`
Locks the pay run, triggers automated PDF payslip generation in background workers, and prevents any further attendance regularizations for that month.

#### `GET /payroll/payslips/:id/pdf`
Streams the verified payslip PDF or generates a short-lived S3 download URL.

---

### 3.5 Security Audit & Telemetry (`/api/v1/audit-logs`)

#### `GET /audit-logs`
Queries immutable tenant audit records.
* **Query Params**: `action=ATTENDANCE_OVERRIDE&startDate=2026-10-01&limit=50`
* **Auth**: Required (`TENANT_ADMIN`, `SUPER_ADMIN`)
