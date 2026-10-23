import {
  EmployeeDetailDto,
  DepartmentDto,
  BranchDto,
  ShiftDto,
  EmployeeHistoryDto
} from '@workforcepro/api-contracts';

export type AdminTab = 'employees' | 'organization' | 'import';

export interface AdminState {
  employees: EmployeeDetailDto[];
  departments: DepartmentDto[];
  branches: BranchDto[];
  shifts: ShiftDto[];
  histories: Record<string, EmployeeHistoryDto[]>;
}
