import React, { useState } from 'react';
import { DepartmentDto, ShiftDto } from '@workforcepro/api-contracts';

interface OrganizationSettingsProps {
  departments: DepartmentDto[];
  shifts: ShiftDto[];
  onAddDepartment: (name: string, code: string) => void;
  onAddShift: (shift: {
    name: string;
    code: string;
    startTime: string;
    endTime: string;
    gracePeriodMinutes: number;
    weeklyOffs: number[];
  }) => void;
}

export const OrganizationSettings: React.FC<OrganizationSettingsProps> = ({
  departments,
  shifts,
  onAddDepartment,
  onAddShift
}) => {
  // Department Form State
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptError, setDeptError] = useState('');

  // Shift Form State
  const [shiftName, setShiftName] = useState('');
  const [shiftCode, setShiftCode] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [gracePeriod, setGracePeriod] = useState(15);
  const [weeklyOffs, setWeeklyOffs] = useState<number[]>([6, 7]);
  const [shiftError, setShiftError] = useState('');

  const handleCreateDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !deptCode.trim()) {
      setDeptError('Name and code are required.');
      return;
    }
    if (departments.some((d) => d.code.toUpperCase() === deptCode.trim().toUpperCase())) {
      setDeptError(`Department code '${deptCode.toUpperCase()}' already exists.`);
      return;
    }
    onAddDepartment(deptName.trim(), deptCode.trim().toUpperCase());
    setDeptName('');
    setDeptCode('');
    setDeptError('');
  };

  const handleCreateShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftName.trim() || !shiftCode.trim()) {
      setShiftError('Shift name and code are required.');
      return;
    }
    if (shifts.some((s) => s.code.toUpperCase() === shiftCode.trim().toUpperCase())) {
      setShiftError(`Shift code '${shiftCode.toUpperCase()}' already exists.`);
      return;
    }
    onAddShift({
      name: shiftName.trim(),
      code: shiftCode.trim().toUpperCase(),
      startTime,
      endTime,
      gracePeriodMinutes: Number(gracePeriod),
      weeklyOffs
    });
    setShiftName('');
    setShiftCode('');
    setShiftError('');
  };

  const toggleWeeklyOff = (day: number) => {
    setWeeklyOffs((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="section-header">
        <div>
          <h2 className="section-title">Departments & Shifts Management</h2>
          <p className="section-subtitle">
            Configure enterprise organizational units, shifts, grace periods, and weekly offs.
          </p>
        </div>
      </div>

      <div className="grid">
        {/* Department Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="metric-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              Add Department
            </h3>
            {deptError && (
              <div
                style={{
                  padding: '0.5rem',
                  background: 'var(--danger-bg)',
                  color: '#f87171',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  marginBottom: '0.75rem'
                }}
              >
                {deptError}
              </div>
            )}
            <form
              onSubmit={handleCreateDept}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            >
              <div className="form-group">
                <label className="form-label">Department Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="e.g. Finance & Accounting"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Unique Code</label>
                <input
                  type="text"
                  className="form-input"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                  placeholder="e.g. FIN"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-sm"
                style={{ alignSelf: 'flex-start', marginTop: '0.25rem' }}
              >
                + Create Department
              </button>
            </form>
          </div>

          <div className="table-container">
            <div
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid var(--border-color)',
                fontWeight: 700
              }}
            >
              Active Departments ({departments.length})
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <span className="badge-tag">{d.code}</span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</td>
                    <td>
                      <span className="badge badge-active">Active</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Shift Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="metric-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              Add Shift & Schedule
            </h3>
            {shiftError && (
              <div
                style={{
                  padding: '0.5rem',
                  background: 'var(--danger-bg)',
                  color: '#f87171',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  marginBottom: '0.75rem'
                }}
              >
                {shiftError}
              </div>
            )}
            <form
              onSubmit={handleCreateShift}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            >
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Shift Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={shiftName}
                    onChange={(e) => setShiftName(e.target.value)}
                    placeholder="e.g. Evening Operations"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Shift Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={shiftCode}
                    onChange={(e) => setShiftCode(e.target.value.toUpperCase())}
                    placeholder="e.g. EVE-01"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Start Time (24h)</label>
                  <input
                    type="time"
                    className="form-input"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Time (24h)</label>
                  <input
                    type="time"
                    className="form-input"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group col-span-2">
                  <label className="form-label">Grace Period (Minutes)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={gracePeriod}
                    onChange={(e) => setGracePeriod(Number(e.target.value))}
                    min="0"
                    max="120"
                    required
                  />
                </div>

                <div className="form-group col-span-2">
                  <label className="form-label">Configurable Weekly Offs</label>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                      const isOff = weeklyOffs.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          className={`btn btn-sm ${isOff ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ minWidth: 44 }}
                          onClick={() => toggleWeeklyOff(day)}
                        >
                          {dayNames[day - 1]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-sm"
                style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
              >
                + Create Shift Schedule
              </button>
            </form>
          </div>

          <div className="table-container">
            <div
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid var(--border-color)',
                fontWeight: 700
              }}
            >
              Configured Shifts ({shifts.length})
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Shift Name</th>
                  <th>Timings</th>
                  <th>Weekly Offs</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className="badge-tag">{s.code}</span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</td>
                    <td>
                      {s.startTime} - {s.endTime} ({s.gracePeriodMinutes}m grace)
                    </td>
                    <td>
                      <span className="badge badge-notice">
                        {s.weeklyOffs.map((d) => dayNames[d - 1]).join(', ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
