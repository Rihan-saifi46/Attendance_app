# WorkforcePro — Payroll Calculation Specification

## 1. Payroll Engine Architecture & Mathematical Model

The WorkforcePro payroll engine operates as an automated, deterministic calculation pipeline that links employee attendance records, salary structures, statutory deduction formulas, and custom adjustments into verified payslips.

```mermaid
flowchart LR
    subgraph Inputs [Input Sources]
        Att[Aggregated Daily Attendance\n(Present, LOP, Half-Days, OT)]
        Struct[Assigned Salary Structure\n(Basic, HRA, Allowances)]
        Stats[Statutory Deduction Rules\n(Tax, PF/Social Security, Slabs)]
        Adj[Manual Variable Adjustments\n(Bonuses, Incentives, Advances)]
    end

    subgraph Engine [WorkforcePro Calculation Core]
        P1[1. Determine Payable & LOP Days]
        P2[2. Prorate Fixed Earnings Components]
        P3[3. Compute Overtime Premiums]
        P4[4. Calculate Gross Pay]
        P5[5. Compute Statutory & LOP Deductions]
        P6[6. Calculate Final Net Pay]
    end

    subgraph Outputs [Generated Deliverables]
        RunRecord[Locked Pay Run Summary]
        PayslipPDF[Branded PDF Payslips]
        BankCSV[Bank Disbursement CSV / NACHA]
    end

    Inputs --> P1
    P1 --> P2 --> P3 --> P4 --> P5 --> P6
    P6 --> Outputs
```

---

## 2. Mathematical Formulations

### 2.1 Basic Pay & Payable Days
Let:
* $D_{\text{total}}$: Total calendar days in the pay period month (e.g., 28, 30, or 31).
* $D_{\text{working}}$: Total scheduled working days in the month (excluding weekly off days and holidays).
* $D_{\text{present}}$: Total days verified as `PRESENT` or `ON_DUTY`.
* $D_{\text{half}}$: Total days verified as `HALF_DAY`.
* $D_{\text{leave\_paid}}$: Approved paid leaves (e.g., Casual, Sick, Annual).
* $D_{\text{unpaid\_absent}}$: Unexcused absences with no approved leave.

#### Payable Days ($D_{\text{payable}}$):
$$D_{\text{payable}} = D_{\text{present}} + D_{\text{leave\_paid}} + (0.5 \times D_{\text{half}}) + D_{\text{week\_off}} + D_{\text{holiday}}$$

#### Loss of Pay Days ($D_{\text{lop}}$):
$$D_{\text{lop}} = D_{\text{total}} - D_{\text{payable}} = D_{\text{unpaid\_absent}} + (0.5 \times D_{\text{half}})$$

### 2.2 Attendance-Linked Loss of Pay (LOP) Deduction
WorkforcePro supports two standard institutional LOP calculation bases (configured per tenant):

#### Model 1: Total Calendar Days Divisor (Default)
$$\text{Per-Day Wage Rate} = \frac{\text{Monthly Base Salary}}{D_{\text{total}}}$$

$$\text{LOP Deduction} = \text{Per-Day Wage Rate} \times D_{\text{lop}}$$

#### Model 2: Standard Fixed Working Days Divisor (e.g., 26 or 30 Days)
$$\text{Per-Day Wage Rate} = \frac{\text{Monthly Base Salary}}{D_{\text{standard\_working\_days}}}$$

$$\text{LOP Deduction} = \text{Per-Day Wage Rate} \times D_{\text{lop}}$$

### 2.3 Overtime (OT) Pay
For employees eligible for overtime compensation:
$$\text{Hourly Wage Rate} = \frac{\text{Monthly Base Salary}}{D_{\text{working}} \times 8.0}$$

$$\text{Overtime Pay} = \text{Overtime Hours} \times \text{Hourly Wage Rate} \times \text{OT Multiplier}$$
*(Where standard OT Multiplier is 1.5x on regular workdays, and 2.0x on weekly rest days or declared holidays).*

### 2.4 Gross Pay & Net Pay Aggregation
$$\text{Gross Pay} = \sum (\text{Base Earnings} - \text{Prorated LOP}) + \text{Overtime Pay} + \text{Variable Incentives}$$

$$\text{Total Deductions} = \sum \text{Statutory Deductions (Tax, PF, Ins)} + \text{Loan Repayments}$$

$$\text{Net Pay} = \text{Gross Pay} - \text{Total Deductions}$$

---

## 3. Parameterized Statutory Rules Engine

Rather than hardcoding national tax laws directly into core code (which causes severe vendor maintenance issues as documented in our repository audit), WorkforcePro provides a **parameterized statutory rules engine**:

### 3.1 Rule Types Supported
1. **Percentage of Component**:
   * E.g., `Employee PF = 12% of Basic` (with optional statutory monthly ceiling cap, e.g. max cap 1,800).
2. **Fixed Amount**:
   * E.g., Fixed health insurance premium of 500 per month.
3. **Progressive Slab Engine**:
   * E.g., Professional Tax or Income Tax brackets:
     - Income 0 to 15,000 $\rightarrow$ 0%
     - Income 15,001 to 25,000 $\rightarrow$ 150
     - Income > 25,000 $\rightarrow$ 200

---

## 4. Pay Run Lifecycle & State Controls

```
+-----------+       +-------------------+       +-------------+
|   DRAFT   | ----> | ATTENDANCE_LOCKED | ----> | CALCULATED  |
+-----------+       +-------------------+       +-------------+
                          |                           |
                          | (Reopen allowed)          | (Recalculate allowed)
                          v                           v
+-----------+       +-------------------+       +-------------+
| DISBURSED | <---- |     APPROVED      | <---- |  HR_REVIEW  |
+-----------+       +-------------------+       +-------------+
```

1. **`DRAFT`**:
   - HR Admin initiates pay run for Month $M$ and Year $Y$.
2. **`ATTENDANCE_LOCKED`**:
   - Freezes all attendance records, punches, and pending regularization requests for the period.
   - Prevents employees from retroactively submitting regularization requests to alter payroll numbers.
3. **`CALCULATED`**:
   - Backend batch processor calculates LOP, OT, statutory deductions, gross, and net pay for all active employees.
4. **`HR_REVIEW`**:
   - Interactive preview screen in Web Admin allows HR to inspect exceptions, add one-time bonuses or deductions, and inspect payroll variance versus the prior month.
5. **`APPROVED`**:
   - Senior Administrator approves the pay run with cryptographic signature / password re-entry.
   - Status becomes immutable.
6. **`DISBURSED`**:
   - Bank disbursement CSV/NACHA file exported.
   - PDF payslips queued for bulk generation and published to the employee mobile app.

---

## 5. Assumptions & Unresolved Business Rules

> [!WARNING]
> The following payroll business rules represent open institutional decisions that must be confirmed by the enterprise customer:

1. **LOP Divisor Standard**:
   - *Assumption*: Default calculation uses actual days in month ($D_{\text{total}}$).
   - *Unresolved*: Should the system support custom customer rules such as a fixed 26-day or 30-day divisor regardless of February / 31-day months?
2. **Statutory Tax Regime Selection**:
   - *Assumption*: The engine provides parameterized formula components.
   - *Unresolved*: Does WorkforcePro need pre-built localized country packs (e.g. India New/Old Tax Regime, US W-4 withholding) in Phase 2, or will tenant admins configure custom deduction formulas?
3. **Overtime Eligibility Threshold**:
   - *Assumption*: Salaried managerial staff are exempt from OT, while hourly/contract workers are eligible.
   - *Unresolved*: Which designation levels are designated FLSA exempt / non-exempt?
4. **Negative Net Pay Handling**:
   - *Assumption*: If LOP and deductions exceed gross earnings, Net Pay floors at 0.00.
   - *Unresolved*: Does the negative balance carry over into next month's payroll as a deduction receivable?
