import React, { useState, useMemo } from 'react';
import { EmployeeDetailDto, DepartmentDto, BranchDto, ShiftDto } from '@workforcepro/api-contracts';

interface EmployeeDirectoryProps {
  employees: EmployeeDetailDto[];
  departments: DepartmentDto[];
  branches: BranchDto[];
  shifts: ShiftDto[];
  onOpenAddModal: () => void;
  onOpenEditModal: (emp: EmployeeDetailDto) => void;
  onOpenDetailDrawer: (emp: EmployeeDetailDto) => void;
}

export const EmployeeDirectory: React.FC<EmployeeDirectoryProps> = ({
  employees,
  departments,
  branches,
  shifts,
  onOpenAddModal,
  onOpenEditModal,
  onOpenDetailDrawer
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        !searchTerm ||
        emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.designation.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDept = !selectedDept || emp.departmentId === selectedDept;
      const matchesBranch = !selectedBranch || emp.branchId === selectedBranch;
      const matchesStatus = !selectedStatus || emp.employmentStatus === selectedStatus;

      return matchesSearch && matchesDept && matchesBranch && matchesStatus;
    });
  }, [employees, searchTerm, selectedDept, selectedBranch, selectedStatus]);

  // Pagination slice
  const totalPages = Math.ceil(filteredEmployees.length / pageSize) || 1;
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, currentPage, pageSize]);

  // Metrics
  const activeCount = employees.filter((e) => e.employmentStatus === 'ACTIVE').length;
  const probationCount = employees.filter((e) => e.employmentStatus === 'PROBATION').length;
  const totalMonthlyBase = employees.reduce((acc, curr) => {
    if (curr.salaryDetails?.salaryType === 'MONTHLY') {
      return acc + (curr.salaryDetails.baseRate || 0);
    }
    return acc;
  }, 0);

  const getDepartmentName = (id: string) => departments.find((d) => d.id === id)?.name || 'General';
  const getBranchCity = (id: string) => branches.find((b) => b.id === id)?.city || 'HQ';
  const getShiftName = (id: string) => shifts.find((s) => s.id === id)?.name || 'Standard';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Total Headcount</span>
          <span className="metric-value">{employees.length}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Active Employees</span>
          <span className="metric-value" style={{ color: '#34d399' }}>
            {activeCount}
          </span>
        </div>
        <div className="metric-card">
          <span className="metric-label">On Probation</span>
          <span className="metric-value" style={{ color: '#fbbf24' }}>
            {probationCount}
          </span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Monthly Payroll Base</span>
          <span className="metric-value" style={{ color: '#818cf8' }}>
            ${totalMonthlyBase.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Section Header & Add Action */}
      <div className="section-header">
        <div>
          <h2 className="section-title">Employee Directory</h2>
          <p className="section-subtitle">
            Manage profiles, reporting hierarchies, departments, shifts, and compensation
            structures.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onOpenAddModal}>
          <span>+ Add Employee</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by name, code, designation, or email..."
          />
        </div>

        <select
          className="select-control"
          value={selectedDept}
          onChange={(e) => {
            setSelectedDept(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <select
          className="select-control"
          value={selectedBranch}
          onChange={(e) => {
            setSelectedBranch(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">All Branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.city})
            </option>
          ))}
        </select>

        <select
          className="select-control"
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="PROBATION">PROBATION</option>
          <option value="NOTICE_PERIOD">NOTICE_PERIOD</option>
          <option value="RESIGNED">RESIGNED</option>
        </select>
      </div>

      {/* Data Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Code</th>
              <th>Department & Branch</th>
              <th>Designation</th>
              <th>Shift</th>
              <th>Status</th>
              <th>Salary (Privileged)</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedEmployees.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}
                >
                  No employee profiles match the current filter criteria.
                </td>
              </tr>
            ) : (
              paginatedEmployees.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <div className="emp-name-cell">
                      <div className="emp-avatar">
                        {emp.firstName[0]}
                        {emp.lastName[0]}
                      </div>
                      <div>
                        <div className="emp-main-text">
                          {emp.firstName} {emp.lastName}
                        </div>
                        <div className="emp-sub-text">{emp.email}</div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span className="badge-tag">{emp.employeeCode}</span>
                  </td>

                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {getDepartmentName(emp.departmentId)}
                    </div>
                    <div className="emp-sub-text">{getBranchCity(emp.branchId)}</div>
                  </td>

                  <td>{emp.designation}</td>

                  <td>
                    <span style={{ fontSize: '0.8125rem' }}>{getShiftName(emp.shiftId)}</span>
                  </td>

                  <td>
                    <span
                      className={`badge ${
                        emp.employmentStatus === 'ACTIVE'
                          ? 'badge-active'
                          : emp.employmentStatus === 'PROBATION'
                            ? 'badge-probation'
                            : 'badge-notice'
                      }`}
                    >
                      {emp.employmentStatus}
                    </span>
                  </td>

                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ fontWeight: 600, color: '#34d399' }}>
                        ${emp.salaryDetails?.baseRate?.toLocaleString() || 0}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        /
                        {emp.salaryDetails?.salaryType === 'MONTHLY'
                          ? 'mo'
                          : emp.salaryDetails?.salaryType === 'DAILY'
                            ? 'day'
                            : 'hr'}
                      </span>
                    </div>
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => onOpenDetailDrawer(emp)}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => onOpenEditModal(emp)}
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        <div className="pagination-bar">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredEmployees.length)} of{' '}
            {filteredEmployees.length} employees
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span style={{ padding: '0.375rem 0.5rem', fontWeight: 600 }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
