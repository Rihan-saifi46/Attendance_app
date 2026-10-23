import React, { useState } from 'react';
import {
  EmployeeDetailDto,
  DepartmentDto,
  BranchDto,
  ShiftDto,
  EmploymentType,
  EmploymentStatus,
  SalaryType
} from '@workforcepro/api-contracts';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Partial<EmployeeDetailDto>, reason?: string) => void;
  initialData?: EmployeeDetailDto | null;
  departments: DepartmentDto[];
  branches: BranchDto[];
  shifts: ShiftDto[];
  managers: EmployeeDetailDto[];
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  departments,
  branches,
  shifts,
  managers
}) => {
  const isEditing = Boolean(initialData);

  const [employeeCode, setEmployeeCode] = useState(initialData?.employeeCode || '');
  const [firstName, setFirstName] = useState(initialData?.firstName || '');
  const [lastName, setLastName] = useState(initialData?.lastName || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [joiningDate, setJoiningDate] = useState(
    initialData?.joiningDate || new Date().toISOString().split('T')[0]
  );
  const [employmentType, setEmploymentType] = useState<EmploymentType>(
    initialData?.employmentType || 'FULL_TIME'
  );
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>(
    initialData?.employmentStatus || 'ACTIVE'
  );
  const [designation, setDesignation] = useState(initialData?.designation || '');
  const [departmentId, setDepartmentId] = useState(
    initialData?.departmentId || departments[0]?.id || ''
  );
  const [branchId, setBranchId] = useState(initialData?.branchId || branches[0]?.id || '');
  const [shiftId, setShiftId] = useState(initialData?.shiftId || shifts[0]?.id || '');
  const [managerId, setManagerId] = useState(initialData?.managerId || '');

  // Salary and Compensation
  const [salaryType, setSalaryType] = useState<SalaryType>(
    initialData?.salaryDetails?.salaryType || 'MONTHLY'
  );
  const [baseRate, setBaseRate] = useState<number>(initialData?.salaryDetails?.baseRate ?? 5000);
  const [bankName, setBankName] = useState(initialData?.salaryDetails?.bankName || '');
  const [accountNumber, setAccountNumber] = useState('');
  const [updateReason, setUpdateReason] = useState('');

  const [formError, setFormError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeCode.trim() || !firstName.trim() || !lastName.trim() || !email.trim()) {
      setFormError('Please fill in all required fields (Code, Name, Email).');
      return;
    }

    if (isEditing && initialData?.id && managerId === initialData.id) {
      setFormError('An employee cannot be designated as their own reporting manager.');
      return;
    }

    onSave(
      {
        id: initialData?.id,
        employeeCode: employeeCode.trim().toUpperCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || '+1-555-0100',
        joiningDate,
        employmentType,
        employmentStatus,
        designation: designation.trim() || 'Software Engineer',
        departmentId,
        branchId,
        shiftId,
        managerId: managerId || null,
        salaryDetails: {
          salaryType,
          baseRate: Number(baseRate),
          currency: 'USD',
          bankName: bankName || 'Silicon Valley Bank',
          accountNumberMasked: accountNumber
            ? `****${accountNumber.slice(-4)}`
            : initialData?.salaryDetails?.accountNumberMasked || '****8912'
        }
      },
      updateReason
    );
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
            {isEditing
              ? `Edit Profile: ${initialData?.firstName} ${initialData?.lastName}`
              : 'Add New Employee'}
          </h3>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ padding: '0.25rem 0.5rem' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {formError && (
              <div
                style={{
                  padding: '0.75rem',
                  background: 'var(--danger-bg)',
                  color: '#fca5a5',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem'
                }}
              >
                {formError}
              </div>
            )}

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Employee Code *</label>
                <input
                  type="text"
                  className="form-input"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                  placeholder="e.g. EMP-00101"
                  disabled={isEditing}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Joining Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Work Email *</label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane.doe@company.com"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone *</label>
                <input
                  type="text"
                  className="form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1-555-0144"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Designation *</label>
                <input
                  type="text"
                  className="form-input"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="Senior Software Engineer"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Department *</label>
                <select
                  className="form-input select-control"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  required
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Branch *</label>
                <select
                  className="form-input select-control"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  required
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Shift Schedule *</label>
                <select
                  className="form-input select-control"
                  value={shiftId}
                  onChange={(e) => setShiftId(e.target.value)}
                  required
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.startTime} - {s.endTime})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Employment Type</label>
                <select
                  className="form-input select-control"
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                >
                  <option value="FULL_TIME">FULL_TIME</option>
                  <option value="PART_TIME">PART_TIME</option>
                  <option value="CONTRACT">CONTRACT</option>
                  <option value="INTERN">INTERN</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Employment Status</label>
                <select
                  className="form-input select-control"
                  value={employmentStatus}
                  onChange={(e) => setEmploymentStatus(e.target.value as EmploymentStatus)}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PROBATION">PROBATION</option>
                  <option value="NOTICE_PERIOD">NOTICE_PERIOD</option>
                  <option value="RESIGNED">RESIGNED</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Reporting Manager</label>
                <select
                  className="form-input select-control"
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                >
                  <option value="">None (Top Level)</option>
                  {managers
                    .filter((m) => m.id !== initialData?.id)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.firstName} {m.lastName} ({m.employeeCode})
                      </option>
                    ))}
                </select>
              </div>

              <div
                className="form-group col-span-2"
                style={{
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '1rem',
                  marginTop: '0.5rem'
                }}
              >
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#a5b4fc' }}>
                  🔒 Compensation & Salary Type Selection
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Restricted to privileged roles. Never exposed to public employee directories.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Salary Type *</label>
                <select
                  className="form-input select-control"
                  value={salaryType}
                  onChange={(e) => setSalaryType(e.target.value as SalaryType)}
                >
                  <option value="MONTHLY">Monthly Fixed Salary</option>
                  <option value="DAILY">Daily Wage</option>
                  <option value="HOURLY">Hourly Rate</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Base Rate (
                  {salaryType === 'MONTHLY' ? '$/month' : salaryType === 'DAILY' ? '$/day' : '$/hr'}
                  ) *
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={baseRate}
                  onChange={(e) => setBaseRate(Number(e.target.value))}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Bank Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. Chase / Wells Fargo"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Bank Account Number</label>
                <input
                  type="password"
                  className="form-input"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder={
                    initialData?.salaryDetails?.accountNumberMasked || 'Enter account digits'
                  }
                />
              </div>

              {isEditing && (
                <div className="form-group col-span-2">
                  <label className="form-label">Change Reason (Audit Trail Log) *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={updateReason}
                    onChange={(e) => setUpdateReason(e.target.value)}
                    placeholder="e.g. Annual compensation increment & team transfer"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {isEditing ? 'Save Profile Changes' : 'Create Employee Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
