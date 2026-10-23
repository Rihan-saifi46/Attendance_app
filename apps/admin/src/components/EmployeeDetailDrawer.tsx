import React, { useState } from 'react';
import {
  EmployeeDetailDto,
  DepartmentDto,
  BranchDto,
  ShiftDto,
  EmployeeHistoryDto
} from '@workforcepro/api-contracts';

interface EmployeeDetailDrawerProps {
  employee: EmployeeDetailDto | null;
  onClose: () => void;
  onEdit: (employee: EmployeeDetailDto) => void;
  departments: DepartmentDto[];
  branches: BranchDto[];
  shifts: ShiftDto[];
  managers: EmployeeDetailDto[];
  histories: EmployeeHistoryDto[];
}

export const EmployeeDetailDrawer: React.FC<EmployeeDetailDrawerProps> = ({
  employee,
  onClose,
  onEdit,
  departments,
  branches,
  shifts,
  managers,
  histories
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'org' | 'salary' | 'history'>('overview');

  if (!employee) return null;

  const department = departments.find((d) => d.id === employee.departmentId);
  const branch = branches.find((b) => b.id === employee.branchId);
  const shift = shifts.find((s) => s.id === employee.shiftId);
  const manager = managers.find((m) => m.id === employee.managerId);

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="emp-avatar" style={{ width: 44, height: 44, fontSize: '1.1rem' }}>
              {employee.firstName[0]}
              {employee.lastName[0]}
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {employee.firstName} {employee.lastName}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '0.2rem'
                }}
              >
                <span className="badge-tag">{employee.employeeCode}</span>
                <span className="badge badge-active">{employee.employmentStatus}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onEdit(employee)}
            >
              Edit
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              style={{ padding: '0.25rem 0.5rem' }}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="drawer-tabs">
          <button
            type="button"
            className={`drawer-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            type="button"
            className={`drawer-tab-btn ${activeTab === 'org' ? 'active' : ''}`}
            onClick={() => setActiveTab('org')}
          >
            Organization
          </button>
          <button
            type="button"
            className={`drawer-tab-btn ${activeTab === 'salary' ? 'active' : ''}`}
            onClick={() => setActiveTab('salary')}
          >
            Compensation 🔒
          </button>
          <button
            type="button"
            className={`drawer-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Change History ({histories.length})
          </button>
        </div>

        <div className="drawer-content">
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="metric-card">
                <span className="metric-label">Designation</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 600 }}>{employee.designation}</span>
              </div>

              <div className="metric-card">
                <span className="metric-label">Contact Information</span>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    marginTop: '0.25rem'
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      Email:{' '}
                    </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {employee.email}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      Phone:{' '}
                    </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {employee.phone}
                    </span>
                  </div>
                </div>
              </div>

              <div className="metric-card">
                <span className="metric-label">Employment Information</span>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    marginTop: '0.25rem'
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      Joined:{' '}
                    </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {employee.joiningDate}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      Type:{' '}
                    </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {employee.employmentType}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'org' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="metric-card">
                <span className="metric-label">Department</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                  {department?.name || 'Assigned Department'} ({department?.code || 'N/A'})
                </span>
              </div>

              <div className="metric-card">
                <span className="metric-label">Branch Office</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                  {branch?.name || 'Main Branch'} — {branch?.city || 'HQ'}
                </span>
              </div>

              <div className="metric-card">
                <span className="metric-label">Work Shift & Schedule</span>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    marginTop: '0.25rem'
                  }}
                >
                  <span style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                    {shift?.name || 'General Shift'} ({shift?.startTime} - {shift?.endTime})
                  </span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Weekly Offs:{' '}
                    {shift?.weeklyOffs
                      ? shift.weeklyOffs
                          .map((d) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d - 1])
                          .join(', ')
                      : 'Sat, Sun'}
                  </span>
                </div>
              </div>

              <div className="metric-card">
                <span className="metric-label">Reporting Hierarchy</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                  {manager
                    ? `${manager.firstName} ${manager.lastName} (${manager.designation})`
                    : 'Reports to Executive Management'}
                </span>
              </div>
            </div>
          )}

          {activeTab === 'salary' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(99, 102, 241, 0.12)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem'
                }}
              >
                <span>🔒</span>
                <span style={{ fontSize: '0.8125rem', color: '#a5b4fc', fontWeight: 600 }}>
                  Field-Level Security Active: Excluded from public peer endpoints.
                </span>
              </div>

              <div className="metric-card">
                <span className="metric-label">Salary Type Selection</span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginTop: '0.25rem'
                  }}
                >
                  <span
                    className="badge"
                    style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}
                  >
                    {employee.salaryDetails?.salaryType || 'MONTHLY'}
                  </span>
                  <span style={{ fontSize: '1.35rem', fontWeight: 700, color: '#34d399' }}>
                    ${employee.salaryDetails?.baseRate?.toLocaleString() ?? 0}
                    <span
                      style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 400 }}
                    >
                      /
                      {employee.salaryDetails?.salaryType === 'MONTHLY'
                        ? 'mo'
                        : employee.salaryDetails?.salaryType === 'DAILY'
                          ? 'day'
                          : 'hr'}
                    </span>
                  </span>
                </div>
              </div>

              <div className="metric-card">
                <span className="metric-label">Bank Disbursement Details</span>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    marginTop: '0.25rem'
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      Bank Name:{' '}
                    </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {employee.salaryDetails?.bankName || 'Silicon Valley Bank'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      Account Number:{' '}
                    </span>
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {employee.salaryDetails?.accountNumberMasked || '****8912'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="timeline">
              {histories.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No historical updates recorded for this employee profile yet.
                </p>
              ) : (
                histories.map((h) => (
                  <div key={h.id} className="timeline-item">
                    <div className="timeline-dot" />
                    <div className="timeline-title">{h.changeType.replace('_', ' ')}</div>
                    <div className="timeline-time">
                      by {h.changedByEmail} • {new Date(h.createdAt).toLocaleString()}
                    </div>
                    {h.reason && (
                      <div style={{ fontSize: '0.8125rem', color: '#a5b4fc', fontStyle: 'italic' }}>
                        &ldquo;{h.reason}&rdquo;
                      </div>
                    )}
                    <div className="timeline-diff">
                      {h.diff.map((d, i) => (
                        <div key={i}>
                          <strong>{d.field}:</strong> {d.oldValue ? String(d.oldValue) : '(None)'} →{' '}
                          {String(d.newValue)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
