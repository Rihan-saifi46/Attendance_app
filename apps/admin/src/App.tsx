import React, { useState } from 'react';
import {
  EmployeeDetailDto,
  DepartmentDto,
  BranchDto,
  ShiftDto,
  EmployeeHistoryDto
} from '@workforcepro/api-contracts';
import { AdminTab } from './types.js';
import { Navbar } from './components/Navbar.js';
import { EmployeeDirectory } from './components/EmployeeDirectory.js';
import { EmployeeModal } from './components/EmployeeModal.js';
import { EmployeeDetailDrawer } from './components/EmployeeDetailDrawer.js';
import { BulkImportWizard } from './components/BulkImportWizard.js';
import { OrganizationSettings } from './components/OrganizationSettings.js';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<AdminTab>('employees');

  // Initial Seed Data
  const [departments, setDepartments] = useState<DepartmentDto[]>([
    {
      id: 'dept-1',
      companyId: 'comp-acme',
      name: 'Software Engineering',
      code: 'ENG',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'dept-2',
      companyId: 'comp-acme',
      name: 'Product Management',
      code: 'PROD',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'dept-3',
      companyId: 'comp-acme',
      name: 'Human Resources',
      code: 'HR',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'dept-4',
      companyId: 'comp-acme',
      name: 'Finance & Accounting',
      code: 'FIN',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    }
  ]);

  const [branches] = useState<BranchDto[]>([
    {
      id: 'branch-1',
      companyId: 'comp-acme',
      code: 'HQ-01',
      name: 'Headquarters Innovation Center',
      city: 'San Francisco',
      country: 'US',
      timezone: 'America/Los_Angeles',
      isHeadquarters: true,
      createdAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'branch-2',
      companyId: 'comp-acme',
      code: 'NYC-01',
      name: 'East Coast Operations',
      city: 'New York',
      country: 'US',
      timezone: 'America/New_York',
      isHeadquarters: false,
      createdAt: '2026-01-01T00:00:00.000Z'
    }
  ]);

  const [shifts, setShifts] = useState<ShiftDto[]>([
    {
      id: 'shift-1',
      companyId: 'comp-acme',
      name: 'Morning General Shift',
      code: 'MGS-01',
      startTime: '09:00',
      endTime: '18:00',
      breakDurationMinutes: 60,
      gracePeriodMinutes: 15,
      halfDayThresholdHours: 4.5,
      fullDayThresholdHours: 8.0,
      isNightShift: false,
      workDays: [1, 2, 3, 4, 5],
      weeklyOffs: [6, 7],
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'shift-2',
      companyId: 'comp-acme',
      name: 'Flexible Core Hours',
      code: 'FLX-01',
      startTime: '10:00',
      endTime: '19:00',
      breakDurationMinutes: 60,
      gracePeriodMinutes: 30,
      halfDayThresholdHours: 4.0,
      fullDayThresholdHours: 8.0,
      isNightShift: false,
      workDays: [1, 2, 3, 4, 5],
      weeklyOffs: [6, 7],
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    }
  ]);

  const [employees, setEmployees] = useState<EmployeeDetailDto[]>([
    {
      id: 'emp-1',
      companyId: 'comp-acme',
      employeeCode: 'EMP-00101',
      firstName: 'Samantha',
      lastName: 'Chen',
      email: 'samantha.chen@acme.test',
      phone: '+1-555-0101',
      joiningDate: '2025-06-15',
      employmentType: 'FULL_TIME',
      employmentStatus: 'ACTIVE',
      designation: 'VP of Engineering',
      departmentId: 'dept-1',
      branchId: 'branch-1',
      shiftId: 'shift-1',
      managerId: null,
      salaryDetails: {
        salaryType: 'MONTHLY',
        baseRate: 16500,
        currency: 'USD',
        bankName: 'Silicon Valley Bank',
        accountNumberMasked: '****4491'
      },
      createdAt: '2025-06-15T09:00:00.000Z',
      updatedAt: '2025-06-15T09:00:00.000Z'
    },
    {
      id: 'emp-2',
      companyId: 'comp-acme',
      employeeCode: 'EMP-00102',
      firstName: 'David',
      lastName: 'Miller',
      email: 'david.miller@acme.test',
      phone: '+1-555-0102',
      joiningDate: '2025-09-01',
      employmentType: 'FULL_TIME',
      employmentStatus: 'ACTIVE',
      designation: 'Principal Architect',
      departmentId: 'dept-1',
      branchId: 'branch-1',
      shiftId: 'shift-1',
      managerId: 'emp-1',
      salaryDetails: {
        salaryType: 'MONTHLY',
        baseRate: 14000,
        currency: 'USD',
        bankName: 'Chase Bank',
        accountNumberMasked: '****8120'
      },
      createdAt: '2025-09-01T09:00:00.000Z',
      updatedAt: '2025-09-01T09:00:00.000Z'
    },
    {
      id: 'emp-3',
      companyId: 'comp-acme',
      employeeCode: 'EMP-00103',
      firstName: 'Chloe',
      lastName: 'Zhao',
      email: 'chloe.zhao@acme.test',
      phone: '+1-555-0103',
      joiningDate: '2026-01-10',
      employmentType: 'FULL_TIME',
      employmentStatus: 'PROBATION',
      designation: 'Senior Frontend Engineer',
      departmentId: 'dept-1',
      branchId: 'branch-2',
      shiftId: 'shift-2',
      managerId: 'emp-2',
      salaryDetails: {
        salaryType: 'MONTHLY',
        baseRate: 9800,
        currency: 'USD',
        bankName: 'Citibank',
        accountNumberMasked: '****1903'
      },
      createdAt: '2026-01-10T09:00:00.000Z',
      updatedAt: '2026-01-10T09:00:00.000Z'
    },
    {
      id: 'emp-4',
      companyId: 'comp-acme',
      employeeCode: 'EMP-00104',
      firstName: 'Lucas',
      lastName: 'Scott',
      email: 'lucas.scott@acme.test',
      phone: '+1-555-0104',
      joiningDate: '2026-02-01',
      employmentType: 'CONTRACT',
      employmentStatus: 'ACTIVE',
      designation: 'Product Designer',
      departmentId: 'dept-2',
      branchId: 'branch-1',
      shiftId: 'shift-1',
      managerId: 'emp-1',
      salaryDetails: {
        salaryType: 'HOURLY',
        baseRate: 65,
        currency: 'USD',
        bankName: 'Wells Fargo',
        accountNumberMasked: '****5521'
      },
      createdAt: '2026-02-01T09:00:00.000Z',
      updatedAt: '2026-02-01T09:00:00.000Z'
    },
    {
      id: 'emp-5',
      companyId: 'comp-acme',
      employeeCode: 'EMP-00105',
      firstName: 'Maya',
      lastName: 'Patel',
      email: 'maya.patel@acme.test',
      phone: '+1-555-0105',
      joiningDate: '2025-11-15',
      employmentType: 'FULL_TIME',
      employmentStatus: 'ACTIVE',
      designation: 'Senior Financial Analyst',
      departmentId: 'dept-4',
      branchId: 'branch-2',
      shiftId: 'shift-1',
      managerId: null,
      salaryDetails: {
        salaryType: 'MONTHLY',
        baseRate: 8800,
        currency: 'USD',
        bankName: 'Bank of America',
        accountNumberMasked: '****7732'
      },
      createdAt: '2025-11-15T09:00:00.000Z',
      updatedAt: '2025-11-15T09:00:00.000Z'
    }
  ]);

  const [histories, setHistories] = useState<Record<string, EmployeeHistoryDto[]>>({
    'emp-1': [
      {
        id: 'hist-1',
        employeeId: 'emp-1',
        companyId: 'comp-acme',
        changedByUserId: 'usr-admin',
        changedByEmail: 'sarah.jenkins@acme.test',
        changeType: 'SALARY_UPDATE',
        diff: [{ field: 'salary', oldValue: 'MONTHLY: 15000', newValue: 'MONTHLY: 16500' }],
        reason: 'Leadership compensation review',
        createdAt: '2026-01-01T10:00:00.000Z'
      },
      {
        id: 'hist-0',
        employeeId: 'emp-1',
        companyId: 'comp-acme',
        changedByUserId: 'usr-admin',
        changedByEmail: 'sarah.jenkins@acme.test',
        changeType: 'PROFILE_UPDATE',
        diff: [{ field: 'profile', oldValue: null, newValue: 'CREATED' }],
        reason: 'Initial onboarding',
        createdAt: '2025-06-15T09:00:00.000Z'
      }
    ]
  });

  // Modal / Drawer States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeDetailDto | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<EmployeeDetailDto | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenAddModal = () => {
    setEditingEmployee(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (emp: EmployeeDetailDto) => {
    setEditingEmployee(emp);
    setIsModalOpen(true);
  };

  const handleSaveEmployee = (data: Partial<EmployeeDetailDto>, reason?: string) => {
    if (editingEmployee) {
      // Update existing employee
      const updated: EmployeeDetailDto = {
        ...editingEmployee,
        ...data,
        updatedAt: new Date().toISOString()
      } as EmployeeDetailDto;

      setEmployees((prev) => prev.map((e) => (e.id === editingEmployee.id ? updated : e)));

      // Record History
      const newHistory: EmployeeHistoryDto = {
        id: `hist-${Date.now()}`,
        employeeId: editingEmployee.id,
        companyId: editingEmployee.companyId,
        changedByUserId: 'usr-admin',
        changedByEmail: 'sarah.jenkins@acme.test',
        changeType: 'PROFILE_UPDATE',
        diff: [
          {
            field: 'designation',
            oldValue: editingEmployee.designation,
            newValue: data.designation
          },
          {
            field: 'department',
            oldValue: editingEmployee.departmentId,
            newValue: data.departmentId
          }
        ],
        reason: reason || 'Profile update via admin portal',
        createdAt: new Date().toISOString()
      };

      setHistories((prev) => ({
        ...prev,
        [editingEmployee.id]: [newHistory, ...(prev[editingEmployee.id] || [])]
      }));

      showToast(`Updated profile for ${updated.firstName} ${updated.lastName}`);
    } else {
      // Create new employee
      const newEmpId = `emp-${Date.now()}`;
      const newEmp: EmployeeDetailDto = {
        id: newEmpId,
        companyId: 'comp-acme',
        employeeCode: data.employeeCode || `EMP-${Date.now().toString().slice(-4)}`,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        phone: data.phone || '',
        joiningDate: data.joiningDate || (new Date().toISOString().split('T')[0] ?? ''),
        employmentType: data.employmentType || 'FULL_TIME',
        employmentStatus: data.employmentStatus || 'ACTIVE',
        designation: data.designation || 'Staff',
        departmentId: data.departmentId || departments[0]?.id || '',
        branchId: data.branchId || branches[0]?.id || '',
        shiftId: data.shiftId || shifts[0]?.id || '',
        managerId: data.managerId || null,
        salaryDetails: data.salaryDetails,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setEmployees((prev) => [newEmp, ...prev]);

      const initialHistory: EmployeeHistoryDto = {
        id: `hist-${Date.now()}`,
        employeeId: newEmpId,
        companyId: 'comp-acme',
        changedByUserId: 'usr-admin',
        changedByEmail: 'sarah.jenkins@acme.test',
        changeType: 'PROFILE_UPDATE',
        diff: [{ field: 'profile', oldValue: null, newValue: 'CREATED' }],
        reason: 'New employee onboarding profile',
        createdAt: new Date().toISOString()
      };

      setHistories((prev) => ({
        ...prev,
        [newEmpId]: [initialHistory]
      }));

      showToast(
        `Created employee profile for ${newEmp.firstName} ${newEmp.lastName} (${newEmp.employeeCode})`
      );
    }
  };

  const handleAddDepartment = (name: string, code: string) => {
    const newDept: DepartmentDto = {
      id: `dept-${Date.now()}`,
      companyId: 'comp-acme',
      name,
      code,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setDepartments((prev) => [...prev, newDept]);
    showToast(`Created department: ${name} (${code})`);
  };

  const handleAddShift = (shiftData: {
    name: string;
    code: string;
    startTime: string;
    endTime: string;
    gracePeriodMinutes: number;
    weeklyOffs: number[];
  }) => {
    const newShift: ShiftDto = {
      id: `shift-${Date.now()}`,
      companyId: 'comp-acme',
      name: shiftData.name,
      code: shiftData.code,
      startTime: shiftData.startTime,
      endTime: shiftData.endTime,
      breakDurationMinutes: 60,
      gracePeriodMinutes: shiftData.gracePeriodMinutes,
      halfDayThresholdHours: 4.5,
      fullDayThresholdHours: 8.0,
      isNightShift: false,
      workDays: [1, 2, 3, 4, 5],
      weeklyOffs: shiftData.weeklyOffs,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setShifts((prev) => [...prev, newShift]);
    showToast(`Created shift: ${shiftData.name} (${shiftData.startTime} - ${shiftData.endTime})`);
  };

  const handleImportComplete = (
    created: Array<{ id: string; employeeCode: string; name: string; email: string }>
  ) => {
    const newBatch: EmployeeDetailDto[] = created.map((c) => ({
      id: c.id,
      companyId: 'comp-acme',
      employeeCode: c.employeeCode,
      firstName: c.name.split(' ')[0] || c.name,
      lastName: c.name.split(' ').slice(1).join(' ') || 'Employee',
      email: c.email,
      phone: '+1-555-0999',
      joiningDate: new Date().toISOString().split('T')[0] ?? '',
      employmentType: 'FULL_TIME',
      employmentStatus: 'ACTIVE',
      designation: 'Operations Specialist',
      departmentId: departments[0]?.id || '',
      branchId: branches[0]?.id || '',
      shiftId: shifts[0]?.id || '',
      managerId: null,
      salaryDetails: {
        salaryType: 'MONTHLY',
        baseRate: 6500,
        currency: 'USD',
        bankName: 'Chase',
        accountNumberMasked: '****7788'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    setEmployees((prev) => [...newBatch, ...prev]);
    showToast(`Successfully imported and provisioned ${created.length} employees!`);
  };

  return (
    <div className="app-layout">
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        companyName="Acme Technologies"
        totalEmployees={employees.length}
      />

      <main className="main-content">
        {toastMessage && (
          <div
            style={{
              padding: '0.875rem 1.25rem',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: 'var(--radius-md)',
              color: '#34d399',
              fontWeight: 600,
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              animation: 'fadeIn 200ms ease'
            }}
          >
            <span>✓</span>
            <span>{toastMessage}</span>
          </div>
        )}

        {currentTab === 'employees' && (
          <EmployeeDirectory
            employees={employees}
            departments={departments}
            branches={branches}
            shifts={shifts}
            onOpenAddModal={handleOpenAddModal}
            onOpenEditModal={handleOpenEditModal}
            onOpenDetailDrawer={setViewingEmployee}
          />
        )}

        {currentTab === 'organization' && (
          <OrganizationSettings
            departments={departments}
            shifts={shifts}
            onAddDepartment={handleAddDepartment}
            onAddShift={handleAddShift}
          />
        )}

        {currentTab === 'import' && (
          <BulkImportWizard
            departments={departments}
            branches={branches}
            shifts={shifts}
            onImportComplete={handleImportComplete}
          />
        )}
      </main>

      <EmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEmployee}
        initialData={editingEmployee}
        departments={departments}
        branches={branches}
        shifts={shifts}
        managers={employees}
      />

      <EmployeeDetailDrawer
        employee={viewingEmployee}
        onClose={() => setViewingEmployee(null)}
        onEdit={(emp) => {
          setViewingEmployee(null);
          handleOpenEditModal(emp);
        }}
        departments={departments}
        branches={branches}
        shifts={shifts}
        managers={employees}
        histories={viewingEmployee ? histories[viewingEmployee.id] || [] : []}
      />
    </div>
  );
};

export default App;
