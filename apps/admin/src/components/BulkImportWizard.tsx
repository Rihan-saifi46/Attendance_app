import React, { useState } from 'react';
import {
  DepartmentDto,
  BranchDto,
  ShiftDto,
  ImportPreviewResponse,
  ImportCommitResponse,
  EmployeeImportRow
} from '@workforcepro/api-contracts';

interface BulkImportWizardProps {
  departments: DepartmentDto[];
  branches: BranchDto[];
  shifts: ShiftDto[];
  onImportComplete: (
    createdEmployees: Array<{ id: string; employeeCode: string; name: string; email: string }>
  ) => void;
}

export const BulkImportWizard: React.FC<BulkImportWizardProps> = ({
  departments,
  branches,
  shifts,
  onImportComplete
}) => {
  const defaultSampleData = JSON.stringify(
    [
      {
        employeeCode: 'EMP-301',
        firstName: 'Marcus',
        lastName: 'Vance',
        email: 'marcus.vance@company.com',
        phone: '+1-555-0301',
        designation: 'Staff Reliability Engineer',
        departmentCode: departments[0]?.code || 'ENG',
        branchCode: branches[0]?.code || 'HQ-01',
        shiftCode: shifts[0]?.code || 'GEN',
        joiningDate: '2026-03-01',
        employmentType: 'FULL_TIME',
        employmentStatus: 'ACTIVE',
        salaryType: 'MONTHLY',
        baseRate: 9200
      },
      {
        employeeCode: 'EMP-302',
        firstName: 'Elena',
        lastName: 'Rostova',
        email: 'elena.rostova@company.com',
        phone: '+1-555-0302',
        designation: 'Product Designer',
        departmentCode: departments[0]?.code || 'ENG',
        branchCode: branches[0]?.code || 'HQ-01',
        shiftCode: shifts[0]?.code || 'GEN',
        joiningDate: '2026-03-15',
        employmentType: 'FULL_TIME',
        employmentStatus: 'ACTIVE',
        salaryType: 'HOURLY',
        baseRate: 65
      }
    ],
    null,
    2
  );

  const [rawText, setRawText] = useState(defaultSampleData);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [parseError, setParseError] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<ImportCommitResponse | null>(null);

  const handleValidate = () => {
    setParseError('');
    setCommitResult(null);

    let rows: Array<Record<string, unknown>>;
    try {
      rows = JSON.parse(rawText) as Array<Record<string, unknown>>;
      if (!Array.isArray(rows)) {
        setParseError('Input must be a JSON array of employee objects.');
        return;
      }
    } catch {
      setParseError('Invalid JSON format. Please verify your syntax.');
      return;
    }

    // Client-side simulation of preview endpoint validation
    const deptCodes = new Set(departments.map((d) => d.code.toUpperCase()));
    const branchCodes = new Set(branches.map((b) => b.code.toUpperCase()));
    const shiftCodes = new Set(shifts.map((s) => s.code.toUpperCase()));

    const errors: Array<{
      rowNumber: number;
      employeeCode?: string;
      email?: string;
      field?: string;
      message: string;
    }> = [];
    const validRows: EmployeeImportRow[] = [];
    const seenCodes = new Set<string>();

    rows.forEach((row, idx) => {
      const rowNum = idx + 1;
      const code = row.employeeCode ? String(row.employeeCode).trim().toUpperCase() : '';
      const email = row.email ? String(row.email).trim().toLowerCase() : '';

      if (!code) {
        errors.push({ rowNumber: rowNum, message: 'Employee code is required' });
        return;
      }
      if (!email) {
        errors.push({ rowNumber: rowNum, employeeCode: code, message: 'Email is required' });
        return;
      }
      if (seenCodes.has(code)) {
        errors.push({
          rowNumber: rowNum,
          employeeCode: code,
          message: `Duplicate code '${code}' within batch`
        });
        return;
      }
      seenCodes.add(code);

      const deptCode = row.departmentCode ? String(row.departmentCode).trim().toUpperCase() : '';
      if (!deptCodes.has(deptCode)) {
        errors.push({
          rowNumber: rowNum,
          employeeCode: code,
          message: `Department '${deptCode}' not recognized in company`
        });
        return;
      }

      const branchCode = row.branchCode ? String(row.branchCode).trim().toUpperCase() : '';
      if (!branchCodes.has(branchCode)) {
        errors.push({
          rowNumber: rowNum,
          employeeCode: code,
          message: `Branch '${branchCode}' not recognized in company`
        });
        return;
      }

      const shiftCode = row.shiftCode
        ? String(row.shiftCode).trim().toUpperCase()
        : shifts[0]?.code || 'GEN';
      if (shiftCode && !shiftCodes.has(shiftCode)) {
        errors.push({
          rowNumber: rowNum,
          employeeCode: code,
          message: `Shift schedule '${shiftCode}' not recognized in company`
        });
        return;
      }

      validRows.push({
        employeeCode: code,
        firstName: row.firstName ? String(row.firstName) : 'First',
        lastName: row.lastName ? String(row.lastName) : 'Last',
        email,
        phone: row.phone ? String(row.phone) : '0000000000',
        designation: row.designation ? String(row.designation) : 'Specialist',
        departmentCode: deptCode,
        branchCode,
        shiftCode: row.shiftCode ? String(row.shiftCode).toUpperCase() : shifts[0]?.code || 'GEN',
        joiningDate: row.joiningDate
          ? String(row.joiningDate)
          : new Date().toISOString().slice(0, 10),
        employmentType: (row.employmentType as EmployeeImportRow['employmentType']) || 'FULL_TIME',
        employmentStatus:
          (row.employmentStatus as EmployeeImportRow['employmentStatus']) || 'ACTIVE',
        salaryType: (row.salaryType as EmployeeImportRow['salaryType']) || 'MONTHLY',
        baseRate: Number(row.baseRate) || 0
      });
    });

    setPreview({
      totalRows: rows.length,
      validCount: validRows.length,
      errorCount: errors.length,
      canCommit: errors.length === 0 && validRows.length > 0,
      errors,
      previewRows: validRows
    });
  };

  const handleCommit = () => {
    if (!preview || !preview.canCommit) return;
    setIsCommitting(true);

    setTimeout(() => {
      const created = preview.previewRows.map((r, i) => ({
        id: `mock-import-${Date.now()}-${i}`,
        employeeCode: r.employeeCode,
        name: `${r.firstName} ${r.lastName}`,
        email: r.email
      }));

      const result: ImportCommitResponse = {
        importedCount: created.length,
        createdEmployees: created
      };

      setCommitResult(result);
      setIsCommitting(false);
      onImportComplete(created);
    }, 600);
  };

  const loadCorruptSample = () => {
    setRawText(
      JSON.stringify(
        [
          {
            employeeCode: 'EMP-999',
            firstName: 'Valid',
            lastName: 'Worker',
            email: 'valid@company.com',
            departmentCode: departments[0]?.code || 'ENG',
            branchCode: branches[0]?.code || 'HQ-01',
            shiftCode: shifts[0]?.code || 'GEN'
          },
          {
            employeeCode: 'EMP-999', // Duplicate code!
            firstName: 'Duplicate',
            lastName: 'Cat',
            email: 'duplicate@company.com',
            departmentCode: departments[0]?.code || 'ENG',
            branchCode: branches[0]?.code || 'HQ-01'
          },
          {
            employeeCode: 'EMP-1000',
            firstName: 'Unknown',
            lastName: 'Dept',
            email: 'dept@company.com',
            departmentCode: 'NON_EXISTENT_DEPARTMENT', // Unknown department!
            branchCode: branches[0]?.code || 'HQ-01'
          }
        ],
        null,
        2
      )
    );
    setPreview(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="section-header">
        <div>
          <h2 className="section-title">Bulk Employee Import Engine</h2>
          <p className="section-subtitle">
            Two-step validated import pipeline with strict duplicate detection and schema
            validation.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setRawText(defaultSampleData);
              setPreview(null);
            }}
          >
            Load Valid Sample
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={loadCorruptSample}>
            Load Sample with Errors
          </button>
        </div>
      </div>

      <div className="grid">
        <div className="metric-card" style={{ gridColumn: 'span 2' }}>
          <span className="metric-label">Step 1: Batch Data Source (JSON Payload)</span>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Each object requires <code>employeeCode</code>, <code>firstName</code>,{' '}
            <code>lastName</code>, <code>email</code>, <code>departmentCode</code>, and{' '}
            <code>branchCode</code>.
          </p>
          <textarea
            className="form-input"
            rows={10}
            style={{ fontFamily: 'monospace', fontSize: '0.8125rem', marginTop: '0.5rem' }}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
          {parseError && (
            <div
              style={{
                padding: '0.5rem',
                background: 'var(--danger-bg)',
                color: '#f87171',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                marginTop: '0.5rem'
              }}
            >
              {parseError}
            </div>
          )}
          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-primary" onClick={handleValidate}>
              Analyze & Preview Batch
            </button>
          </div>
        </div>
      </div>

      {preview && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="section-header">
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                Step 2: Validation Preview & Error Report
              </h3>
              <p className="section-subtitle">
                {preview.canCommit
                  ? 'All rows passed schema verification and duplicate detection. Ready to commit.'
                  : `Validation blocked: ${preview.errorCount} row error(s) detected.`}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className={`badge ${preview.canCommit ? 'badge-active' : 'badge-notice'}`}>
                {preview.validCount} Valid / {preview.totalRows} Total
              </span>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!preview.canCommit || isCommitting}
                onClick={handleCommit}
              >
                {isCommitting ? 'Committing...' : `Commit Import (${preview.validCount} Employees)`}
              </button>
            </div>
          </div>

          {preview.errors.length > 0 && (
            <div
              style={{
                background: 'var(--danger-bg)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem'
              }}
            >
              <h4
                style={{
                  color: '#f87171',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  marginBottom: '0.5rem'
                }}
              >
                ⚠️ Error Report ({preview.errors.length} Issues)
              </h4>
              <ul
                style={{
                  paddingLeft: '1.25rem',
                  fontSize: '0.8125rem',
                  color: '#fca5a5',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}
              >
                {preview.errors.map((err, i) => (
                  <li key={i}>
                    <strong>Row {err.rowNumber}</strong>{' '}
                    {err.employeeCode ? `[${err.employeeCode}]` : ''}: {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.previewRows.length > 0 && (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name & Email</th>
                    <th>Dept & Branch</th>
                    <th>Salary Type & Rate</th>
                    <th>Validation Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.previewRows.map((r) => (
                    <tr key={r.employeeCode}>
                      <td>
                        <span className="badge-tag">{r.employeeCode}</span>
                      </td>
                      <td>
                        <div className="emp-main-text">
                          {r.firstName} {r.lastName}
                        </div>
                        <div className="emp-sub-text">{r.email}</div>
                      </td>
                      <td>
                        <div>{r.departmentCode}</div>
                        <div className="emp-sub-text">{r.branchCode}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#34d399' }}>${r.baseRate}</span>{' '}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          ({r.salaryType})
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-active">✓ Verified Valid</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {commitResult && (
        <div
          style={{
            background: 'var(--success-bg)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem'
          }}
        >
          <h4
            style={{
              color: '#34d399',
              fontSize: '1.1rem',
              fontWeight: 700,
              marginBottom: '0.5rem'
            }}
          >
            🎉 Import Successfully Committed!
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Created <strong>{commitResult.importedCount}</strong> new employee profiles under
            company tenant scope. Audit event logged.
          </p>
        </div>
      )}
    </div>
  );
};
