import mongoose from 'mongoose';
import {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  EmployeeQueryInput,
  EmployeeDetailDto,
  EmployeePublicDto,
  EmployeeHistoryDto,
  EmployeeHistoryType,
  EmployeeImportRow,
  ImportPreviewResponse,
  ImportCommitResponse,
  UserRole,
  UserRoleType,
  EmploymentType,
  EmploymentStatus,
  SalaryType,
  ErrorCode,
  AuditAction
} from '@workforcepro/api-contracts';
import { AppError } from '../../interfaces/http/middlewares/errorHandler.js';
import { EmployeeModel, IEmployee } from '../../infrastructure/database/models/employee.model.js';
import { DepartmentModel } from '../../infrastructure/database/models/department.model.js';
import { BranchModel } from '../../infrastructure/database/models/branch.model.js';
import { ShiftModel } from '../../infrastructure/database/models/shift.model.js';
import { EmployeeHistoryModel } from '../../infrastructure/database/models/employeeHistory.model.js';
import { logAuditEvent } from '../../infrastructure/security/audit.service.js';

export class EmployeeService {
  async createEmployee(
    companyId: string,
    dto: CreateEmployeeInput,
    requestingUser: { userId: string; role: UserRoleType; email: string },
    ip?: string
  ): Promise<EmployeeDetailDto> {
    // 1. Check duplicate employeeCode within company
    const existingCode = await EmployeeModel.findOne({
      companyId,
      employeeCode: dto.employeeCode.toUpperCase(),
      isDeleted: false
    });
    if (existingCode) {
      throw new AppError(
        409,
        ErrorCode.DUPLICATE_EMPLOYEE_CODE,
        `Employee code '${dto.employeeCode}' already exists in this company`
      );
    }

    // 2. Check duplicate email within company
    const existingEmail = await EmployeeModel.findOne({
      companyId,
      email: dto.email.toLowerCase(),
      isDeleted: false
    });
    if (existingEmail) {
      throw new AppError(
        409,
        ErrorCode.USER_ALREADY_EXISTS,
        `Employee with email '${dto.email}' already exists in this company`
      );
    }

    // 3. Verify Branch existence in authorized company
    if (!mongoose.Types.ObjectId.isValid(dto.branchId)) {
      throw new AppError(400, ErrorCode.BAD_REQUEST, 'Invalid branch ID');
    }
    const branch = await BranchModel.findOne({
      _id: dto.branchId,
      companyId,
      isDeleted: false
    });
    if (!branch) {
      throw new AppError(
        404,
        ErrorCode.BRANCH_NOT_FOUND,
        'Branch not found in authorized company scope'
      );
    }

    // 4. Verify Department existence in authorized company
    if (!mongoose.Types.ObjectId.isValid(dto.departmentId)) {
      throw new AppError(400, ErrorCode.BAD_REQUEST, 'Invalid department ID');
    }
    const department = await DepartmentModel.findOne({
      _id: dto.departmentId,
      companyId,
      isDeleted: false
    });
    if (!department) {
      throw new AppError(
        404,
        ErrorCode.DEPARTMENT_NOT_FOUND,
        'Department not found in authorized company scope'
      );
    }

    // 5. Verify Shift schedule in authorized company
    if (!mongoose.Types.ObjectId.isValid(dto.shiftId)) {
      throw new AppError(400, ErrorCode.BAD_REQUEST, 'Invalid shift ID');
    }
    const shift = await ShiftModel.findOne({
      _id: dto.shiftId,
      companyId,
      isDeleted: false
    });
    if (!shift) {
      throw new AppError(
        404,
        ErrorCode.SHIFT_NOT_FOUND,
        'Shift not found in authorized company scope'
      );
    }

    // 6. Verify Reporting Manager if specified
    if (dto.managerId) {
      if (!mongoose.Types.ObjectId.isValid(dto.managerId)) {
        throw new AppError(400, ErrorCode.BAD_REQUEST, 'Invalid manager ID');
      }
      const manager = await EmployeeModel.findOne({
        _id: dto.managerId,
        companyId,
        isDeleted: false
      });
      if (!manager) {
        throw new AppError(
          404,
          ErrorCode.EMPLOYEE_NOT_FOUND,
          'Reporting manager not found in authorized company scope'
        );
      }
    }

    // 7. Mask sensitive financial data
    const salaryDetails = dto.salaryDetails
      ? {
          salaryType: dto.salaryDetails.salaryType,
          baseRate: dto.salaryDetails.baseRate,
          currency: dto.salaryDetails.currency || 'USD',
          bankName: dto.salaryDetails.bankName,
          accountNumberMasked: dto.salaryDetails.accountNumber
            ? `****${dto.salaryDetails.accountNumber.slice(-4)}`
            : undefined,
          routingCode: dto.salaryDetails.routingCode,
          taxIdMasked: dto.salaryDetails.taxId
            ? `***-**-${dto.salaryDetails.taxId.slice(-4)}`
            : undefined
        }
      : undefined;

    const employee = new EmployeeModel({
      companyId,
      employeeCode: dto.employeeCode.toUpperCase(),
      userId: dto.userId ? new mongoose.Types.ObjectId(dto.userId) : null,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase(),
      phone: dto.phone,
      gender: dto.gender,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
      joiningDate: new Date(dto.joiningDate),
      employmentType: dto.employmentType || 'FULL_TIME',
      employmentStatus: dto.employmentStatus || 'ACTIVE',
      designation: dto.designation,
      departmentId: new mongoose.Types.ObjectId(dto.departmentId),
      branchId: new mongoose.Types.ObjectId(dto.branchId),
      shiftId: new mongoose.Types.ObjectId(dto.shiftId),
      managerId: dto.managerId ? new mongoose.Types.ObjectId(dto.managerId) : null,
      address: dto.address,
      emergencyContact: dto.emergencyContact,
      salaryDetails
    });

    await employee.save();

    // 8. Record initial history
    const history = new EmployeeHistoryModel({
      companyId,
      employeeId: employee._id,
      changedByUserId: new mongoose.Types.ObjectId(requestingUser.userId),
      changedByEmail: requestingUser.email,
      changeType: 'PROFILE_UPDATE',
      diff: [{ field: 'profile', oldValue: null, newValue: 'CREATED' }],
      reason: 'Initial employee profile creation'
    });
    await history.save();

    // 9. Log audit event
    await logAuditEvent({
      companyId,
      userId: requestingUser.userId,
      userEmail: requestingUser.email,
      userRole: requestingUser.role,
      action: AuditAction.EMPLOYEE_CREATED,
      resourceType: 'Employee',
      resourceId: employee._id.toString(),
      details: {
        employeeCode: employee.employeeCode,
        name: `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
        departmentId: dto.departmentId,
        branchId: dto.branchId
      },
      ip
    });

    return this.mapToDetailDto(employee, true);
  }

  async getEmployees(
    companyId: string,
    query: EmployeeQueryInput,
    requestingUser: { userId: string; role: UserRoleType; companyId: string }
  ): Promise<{
    data: (EmployeeDetailDto | EmployeePublicDto)[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    if (requestingUser.role !== UserRole.PLATFORM_ADMIN && requestingUser.companyId !== companyId) {
      throw new AppError(
        403,
        ErrorCode.CROSS_TENANT_ACCESS_DENIED,
        'Cross-tenant access prohibited'
      );
    }

    const filter: Record<string, unknown> = {
      companyId,
      isDeleted: false
    };

    if (query.departmentId) filter.departmentId = query.departmentId;
    if (query.branchId) filter.branchId = query.branchId;
    if (query.shiftId) filter.shiftId = query.shiftId;
    if (query.employmentStatus) filter.employmentStatus = query.employmentStatus;
    if (query.employmentType) filter.employmentType = query.employmentType;

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { employeeCode: searchRegex },
        { email: searchRegex },
        { designation: searchRegex }
      ];
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const sortField = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [totalItems, employees] = await Promise.all([
      EmployeeModel.countDocuments(filter),
      EmployeeModel.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
    ]);

    const isPrivileged = (
      [UserRole.PLATFORM_ADMIN, UserRole.COMPANY_OWNER, UserRole.HR_ADMIN] as readonly string[]
    ).includes(requestingUser.role);

    const data = employees.map((emp) => {
      const canViewSensitive = Boolean(
        isPrivileged || (emp.userId && emp.userId.toString() === requestingUser.userId)
      );
      return this.mapToDetailDto(emp, canViewSensitive);
    });

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      data,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  async getEmployeeById(
    companyId: string,
    employeeId: string,
    requestingUser: { userId: string; role: UserRoleType; companyId: string }
  ): Promise<EmployeeDetailDto> {
    if (requestingUser.role !== UserRole.PLATFORM_ADMIN && requestingUser.companyId !== companyId) {
      throw new AppError(
        403,
        ErrorCode.CROSS_TENANT_ACCESS_DENIED,
        'Cross-tenant access prohibited'
      );
    }

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      throw new AppError(400, ErrorCode.BAD_REQUEST, 'Invalid employee ID');
    }

    const employee = await EmployeeModel.findOne({
      _id: employeeId,
      companyId,
      isDeleted: false
    });

    if (!employee) {
      throw new AppError(
        404,
        ErrorCode.EMPLOYEE_NOT_FOUND,
        'Employee not found in authorized company scope'
      );
    }

    const isPrivileged = (
      [UserRole.PLATFORM_ADMIN, UserRole.COMPANY_OWNER, UserRole.HR_ADMIN] as readonly string[]
    ).includes(requestingUser.role);

    const isSelf = employee.userId && employee.userId.toString() === requestingUser.userId;

    return this.mapToDetailDto(employee, isPrivileged || !!isSelf);
  }

  async updateEmployee(
    companyId: string,
    employeeId: string,
    dto: UpdateEmployeeInput,
    requestingUser: { userId: string; role: UserRoleType; email: string },
    ip?: string
  ): Promise<EmployeeDetailDto> {
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      throw new AppError(400, ErrorCode.BAD_REQUEST, 'Invalid employee ID');
    }

    const employee = await EmployeeModel.findOne({
      _id: employeeId,
      companyId,
      isDeleted: false
    });

    if (!employee) {
      throw new AppError(
        404,
        ErrorCode.EMPLOYEE_NOT_FOUND,
        'Employee not found in authorized company scope'
      );
    }

    // Circular reporting manager check: cannot report to self
    if (dto.managerId !== undefined) {
      if (dto.managerId === employeeId) {
        throw new AppError(
          400,
          ErrorCode.CIRCULAR_REPORTING_MANAGER,
          'An employee cannot be designated as their own reporting manager'
        );
      }
      if (dto.managerId) {
        if (!mongoose.Types.ObjectId.isValid(dto.managerId)) {
          throw new AppError(400, ErrorCode.BAD_REQUEST, 'Invalid manager ID');
        }
        const manager = await EmployeeModel.findOne({
          _id: dto.managerId,
          companyId,
          isDeleted: false
        });
        if (!manager) {
          throw new AppError(
            404,
            ErrorCode.EMPLOYEE_NOT_FOUND,
            'Reporting manager not found in authorized company scope'
          );
        }
      }
    }

    // Verify foreign keys if updating
    if (dto.branchId) {
      const branch = await BranchModel.findOne({ _id: dto.branchId, companyId, isDeleted: false });
      if (!branch) {
        throw new AppError(404, ErrorCode.BRANCH_NOT_FOUND, 'Branch not found in company scope');
      }
    }
    if (dto.departmentId) {
      const dept = await DepartmentModel.findOne({
        _id: dto.departmentId,
        companyId,
        isDeleted: false
      });
      if (!dept) {
        throw new AppError(
          404,
          ErrorCode.DEPARTMENT_NOT_FOUND,
          'Department not found in company scope'
        );
      }
    }
    if (dto.shiftId) {
      const shift = await ShiftModel.findOne({ _id: dto.shiftId, companyId, isDeleted: false });
      if (!shift) {
        throw new AppError(404, ErrorCode.SHIFT_NOT_FOUND, 'Shift not found in company scope');
      }
    }

    // Track diffs for audit trail
    const diffs: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];
    let changeType: EmployeeHistoryType = 'PROFILE_UPDATE';

    if (dto.firstName !== undefined && dto.firstName !== employee.firstName) {
      diffs.push({ field: 'firstName', oldValue: employee.firstName, newValue: dto.firstName });
      employee.firstName = dto.firstName;
    }
    if (dto.lastName !== undefined && dto.lastName !== employee.lastName) {
      diffs.push({ field: 'lastName', oldValue: employee.lastName, newValue: dto.lastName });
      employee.lastName = dto.lastName;
    }
    if (dto.phone !== undefined && dto.phone !== employee.phone) {
      diffs.push({ field: 'phone', oldValue: employee.phone, newValue: dto.phone });
      employee.phone = dto.phone;
    }
    if (dto.gender !== undefined) employee.gender = dto.gender;
    if (dto.dateOfBirth !== undefined) {
      employee.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    }
    if (dto.joiningDate !== undefined) {
      employee.joiningDate = new Date(dto.joiningDate);
    }
    if (dto.exitDate !== undefined) {
      employee.exitDate = dto.exitDate ? new Date(dto.exitDate) : null;
    }
    if (dto.employmentType !== undefined && dto.employmentType !== employee.employmentType) {
      diffs.push({
        field: 'employmentType',
        oldValue: employee.employmentType,
        newValue: dto.employmentType
      });
      employee.employmentType = dto.employmentType;
      changeType = 'STATUS_CHANGE';
    }
    if (dto.employmentStatus !== undefined && dto.employmentStatus !== employee.employmentStatus) {
      diffs.push({
        field: 'employmentStatus',
        oldValue: employee.employmentStatus,
        newValue: dto.employmentStatus
      });
      employee.employmentStatus = dto.employmentStatus;
      changeType = 'STATUS_CHANGE';
    }
    if (dto.designation !== undefined && dto.designation !== employee.designation) {
      diffs.push({
        field: 'designation',
        oldValue: employee.designation,
        newValue: dto.designation
      });
      employee.designation = dto.designation;
      changeType = 'ROLE_CHANGE';
    }
    if (dto.departmentId !== undefined && dto.departmentId !== employee.departmentId.toString()) {
      diffs.push({
        field: 'departmentId',
        oldValue: employee.departmentId.toString(),
        newValue: dto.departmentId
      });
      employee.departmentId = new mongoose.Types.ObjectId(dto.departmentId);
      changeType = 'DEPARTMENT_TRANSFER';
    }
    if (dto.branchId !== undefined && dto.branchId !== employee.branchId.toString()) {
      diffs.push({
        field: 'branchId',
        oldValue: employee.branchId.toString(),
        newValue: dto.branchId
      });
      employee.branchId = new mongoose.Types.ObjectId(dto.branchId);
      changeType = 'BRANCH_TRANSFER';
    }
    if (dto.shiftId !== undefined && dto.shiftId !== employee.shiftId.toString()) {
      diffs.push({
        field: 'shiftId',
        oldValue: employee.shiftId.toString(),
        newValue: dto.shiftId
      });
      employee.shiftId = new mongoose.Types.ObjectId(dto.shiftId);
      changeType = 'SHIFT_ASSIGNMENT';
    }
    if (dto.managerId !== undefined) {
      const oldMgr = employee.managerId ? employee.managerId.toString() : null;
      if (dto.managerId !== oldMgr) {
        diffs.push({ field: 'managerId', oldValue: oldMgr, newValue: dto.managerId });
        employee.managerId = dto.managerId ? new mongoose.Types.ObjectId(dto.managerId) : null;
      }
    }
    if (dto.address !== undefined) employee.address = dto.address;
    if (dto.emergencyContact !== undefined) employee.emergencyContact = dto.emergencyContact;

    if (dto.salaryDetails) {
      const curSal = employee.salaryDetails || {
        salaryType: 'MONTHLY',
        baseRate: 0,
        currency: 'USD'
      };
      if (
        dto.salaryDetails.salaryType !== curSal.salaryType ||
        dto.salaryDetails.baseRate !== curSal.baseRate
      ) {
        diffs.push({
          field: 'salary',
          oldValue: `${curSal.salaryType}: ${curSal.baseRate}`,
          newValue: `${dto.salaryDetails.salaryType || curSal.salaryType}: ${dto.salaryDetails.baseRate ?? curSal.baseRate}`
        });
        changeType = 'SALARY_UPDATE';
      }

      employee.salaryDetails = {
        salaryType: dto.salaryDetails.salaryType || curSal.salaryType,
        baseRate: dto.salaryDetails.baseRate ?? curSal.baseRate,
        currency: dto.salaryDetails.currency || curSal.currency,
        bankName: dto.salaryDetails.bankName || curSal.bankName,
        accountNumberMasked: dto.salaryDetails.accountNumber
          ? `****${dto.salaryDetails.accountNumber.slice(-4)}`
          : curSal.accountNumberMasked,
        routingCode: dto.salaryDetails.routingCode || curSal.routingCode,
        taxIdMasked: dto.salaryDetails.taxId
          ? `***-**-${dto.salaryDetails.taxId.slice(-4)}`
          : curSal.taxIdMasked
      };
    }

    await employee.save();

    if (diffs.length > 0) {
      const history = new EmployeeHistoryModel({
        companyId,
        employeeId: employee._id,
        changedByUserId: new mongoose.Types.ObjectId(requestingUser.userId),
        changedByEmail: requestingUser.email,
        changeType,
        diff: diffs,
        reason: dto.updateReason || 'Authorized profile update'
      });
      await history.save();
    }

    await logAuditEvent({
      companyId,
      userId: requestingUser.userId,
      userEmail: requestingUser.email,
      userRole: requestingUser.role,
      action: AuditAction.EMPLOYEE_UPDATED,
      resourceType: 'Employee',
      resourceId: employee._id.toString(),
      details: {
        changeType,
        diffCount: diffs.length,
        reason: dto.updateReason
      },
      ip
    });

    return this.mapToDetailDto(employee, true);
  }

  async getEmployeeHistory(
    companyId: string,
    employeeId: string,
    requestingUser: { userId: string; role: UserRoleType; companyId: string }
  ): Promise<EmployeeHistoryDto[]> {
    if (requestingUser.role !== UserRole.PLATFORM_ADMIN && requestingUser.companyId !== companyId) {
      throw new AppError(
        403,
        ErrorCode.CROSS_TENANT_ACCESS_DENIED,
        'Cross-tenant access prohibited'
      );
    }

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      throw new AppError(400, ErrorCode.BAD_REQUEST, 'Invalid employee ID');
    }

    const employee = await EmployeeModel.findOne({
      _id: employeeId,
      companyId,
      isDeleted: false
    });

    if (!employee) {
      throw new AppError(
        404,
        ErrorCode.EMPLOYEE_NOT_FOUND,
        'Employee not found in authorized company scope'
      );
    }

    const isPrivileged = (
      [
        UserRole.PLATFORM_ADMIN,
        UserRole.COMPANY_OWNER,
        UserRole.HR_ADMIN,
        UserRole.MANAGER
      ] as readonly string[]
    ).includes(requestingUser.role);

    const isSelf = employee.userId && employee.userId.toString() === requestingUser.userId;

    if (!isPrivileged && !isSelf) {
      throw new AppError(403, ErrorCode.FORBIDDEN, 'Unauthorized to view employee change history');
    }

    const histories = await EmployeeHistoryModel.find({
      companyId,
      employeeId
    }).sort({ createdAt: -1 });

    return histories.map((h) => ({
      id: h._id.toString(),
      employeeId: h.employeeId.toString(),
      companyId: h.companyId.toString(),
      changedByUserId: h.changedByUserId.toString(),
      changedByEmail: h.changedByEmail,
      changeType: h.changeType as EmployeeHistoryType,
      diff: h.diff,
      reason: h.reason,
      createdAt: h.createdAt.toISOString()
    }));
  }

  async previewBulkImport(
    companyId: string,
    rawRows: Array<Record<string, unknown>>
  ): Promise<ImportPreviewResponse> {
    const errors: Array<{
      rowNumber: number;
      employeeCode?: string;
      email?: string;
      field?: string;
      message: string;
    }> = [];
    const validRows: EmployeeImportRow[] = [];

    // Pre-fetch company branches, departments, and shifts for quick lookup
    const [branches, departments, shifts, existingEmployees] = await Promise.all([
      BranchModel.find({ companyId, isDeleted: false }),
      DepartmentModel.find({ companyId, isDeleted: false }),
      ShiftModel.find({ companyId, isDeleted: false }),
      EmployeeModel.find({ companyId, isDeleted: false }).select('employeeCode email')
    ]);

    const branchCodes = new Set(branches.map((b) => b.code.toUpperCase()));
    const departmentCodes = new Set(departments.map((d) => d.code.toUpperCase()));
    const shiftCodes = new Set(shifts.map((s) => s.code.toUpperCase()));
    const dbCodes = new Set(existingEmployees.map((e) => e.employeeCode.toUpperCase()));
    const dbEmails = new Set(existingEmployees.map((e) => e.email.toLowerCase()));

    const seenCodesInBatch = new Set<string>();
    const seenEmailsInBatch = new Set<string>();

    for (let i = 0; i < rawRows.length; i++) {
      const rowNumber = i + 1;
      const raw = rawRows[i];
      if (!raw) continue;

      const empCode = raw.employeeCode ? String(raw.employeeCode).trim().toUpperCase() : '';
      const email = raw.email ? String(raw.email).trim().toLowerCase() : '';

      // Check required fields
      if (!empCode) {
        errors.push({ rowNumber, field: 'employeeCode', message: 'Employee code is required' });
        continue;
      }
      if (!email) {
        errors.push({
          rowNumber,
          employeeCode: empCode,
          field: 'email',
          message: 'Email is required'
        });
        continue;
      }
      if (!raw.firstName || !raw.lastName) {
        errors.push({
          rowNumber,
          employeeCode: empCode,
          field: 'name',
          message: 'First and last name are required'
        });
        continue;
      }

      // Check batch duplicate codes
      if (seenCodesInBatch.has(empCode)) {
        errors.push({
          rowNumber,
          employeeCode: empCode,
          field: 'employeeCode',
          message: `Duplicate employee code '${empCode}' found within import file`
        });
        continue;
      }
      seenCodesInBatch.add(empCode);

      // Check batch duplicate emails
      if (seenEmailsInBatch.has(email)) {
        errors.push({
          rowNumber,
          employeeCode: empCode,
          email,
          field: 'email',
          message: `Duplicate email '${email}' found within import file`
        });
        continue;
      }
      seenEmailsInBatch.add(email);

      // Check DB duplicate codes
      if (dbCodes.has(empCode)) {
        errors.push({
          rowNumber,
          employeeCode: empCode,
          field: 'employeeCode',
          message: `Employee code '${empCode}' already exists in company database`
        });
        continue;
      }

      // Check DB duplicate emails
      if (dbEmails.has(email)) {
        errors.push({
          rowNumber,
          employeeCode: empCode,
          email,
          field: 'email',
          message: `Email '${email}' already exists in company database`
        });
        continue;
      }

      const deptCode = raw.departmentCode ? String(raw.departmentCode).trim().toUpperCase() : '';
      if (!deptCode || !departmentCodes.has(deptCode)) {
        errors.push({
          rowNumber,
          employeeCode: empCode,
          field: 'departmentCode',
          message: `Department code '${deptCode}' not found in company`
        });
        continue;
      }

      const branchCode = raw.branchCode ? String(raw.branchCode).trim().toUpperCase() : '';
      if (!branchCode || !branchCodes.has(branchCode)) {
        errors.push({
          rowNumber,
          employeeCode: empCode,
          field: 'branchCode',
          message: `Branch code '${branchCode}' not found in company`
        });
        continue;
      }

      const shiftCode = raw.shiftCode ? String(raw.shiftCode).trim().toUpperCase() : '';
      if (!shiftCode || !shiftCodes.has(shiftCode)) {
        errors.push({
          rowNumber,
          employeeCode: empCode,
          field: 'shiftCode',
          message: `Shift schedule code '${shiftCode}' not found in company`
        });
        continue;
      }

      validRows.push({
        employeeCode: empCode,
        firstName: String(raw.firstName).trim(),
        lastName: String(raw.lastName).trim(),
        email,
        phone: String(raw.phone || '0000000000').trim(),
        designation: String(raw.designation || 'Staff').trim(),
        departmentCode: deptCode,
        branchCode,
        shiftCode,
        joiningDate: String(raw.joiningDate || new Date().toISOString().split('T')[0]),
        employmentType: (raw.employmentType as EmploymentType) || 'FULL_TIME',
        employmentStatus: (raw.employmentStatus as EmploymentStatus) || 'ACTIVE',
        salaryType: (raw.salaryType as SalaryType) || 'MONTHLY',
        baseRate: Number(raw.baseRate) || 0
      });
    }

    return {
      totalRows: rawRows.length,
      validCount: validRows.length,
      errorCount: errors.length,
      canCommit: errors.length === 0 && validRows.length > 0,
      errors,
      previewRows: validRows
    };
  }

  async commitBulkImport(
    companyId: string,
    rows: EmployeeImportRow[],
    requestingUser: { userId: string; role: UserRoleType; email: string },
    ip?: string
  ): Promise<ImportCommitResponse> {
    const preview = await this.previewBulkImport(companyId, rows);
    if (!preview.canCommit) {
      throw new AppError(
        400,
        ErrorCode.INVALID_IMPORT_DATA,
        `Cannot commit import: ${preview.errorCount} validation errors found`
      );
    }

    const [branches, departments, shifts] = await Promise.all([
      BranchModel.find({ companyId, isDeleted: false }),
      DepartmentModel.find({ companyId, isDeleted: false }),
      ShiftModel.find({ companyId, isDeleted: false })
    ]);

    const branchMap = new Map(branches.map((b) => [b.code.toUpperCase(), b._id]));
    const departmentMap = new Map(departments.map((d) => [d.code.toUpperCase(), d._id]));
    const shiftMap = new Map(shifts.map((s) => [s.code.toUpperCase(), s._id]));

    const createdEmployees: Array<{
      id: string;
      employeeCode: string;
      name: string;
      email: string;
    }> = [];

    for (const row of preview.previewRows) {
      const branchId = branchMap.get(row.branchCode.toUpperCase())!;
      const departmentId = departmentMap.get(row.departmentCode.toUpperCase())!;
      const shiftId = shiftMap.get(row.shiftCode.toUpperCase())!;

      const employee = new EmployeeModel({
        companyId,
        employeeCode: row.employeeCode.toUpperCase(),
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email.toLowerCase(),
        phone: row.phone,
        joiningDate: new Date(row.joiningDate),
        employmentType: row.employmentType,
        employmentStatus: row.employmentStatus,
        designation: row.designation,
        departmentId,
        branchId,
        shiftId,
        salaryDetails: {
          salaryType: row.salaryType,
          baseRate: row.baseRate,
          currency: 'USD'
        }
      });

      await employee.save();

      const history = new EmployeeHistoryModel({
        companyId,
        employeeId: employee._id,
        changedByUserId: new mongoose.Types.ObjectId(requestingUser.userId),
        changedByEmail: requestingUser.email,
        changeType: 'PROFILE_UPDATE',
        diff: [{ field: 'profile', oldValue: null, newValue: 'BULK_IMPORT' }],
        reason: 'Bulk employee import commit'
      });
      await history.save();

      createdEmployees.push({
        id: employee._id.toString(),
        employeeCode: employee.employeeCode,
        name: `${employee.firstName} ${employee.lastName}`,
        email: employee.email
      });
    }

    await logAuditEvent({
      companyId,
      userId: requestingUser.userId,
      userEmail: requestingUser.email,
      userRole: requestingUser.role,
      action: AuditAction.EMPLOYEES_IMPORTED,
      resourceType: 'Employee',
      details: {
        importedCount: createdEmployees.length
      },
      ip
    });

    return {
      importedCount: createdEmployees.length,
      createdEmployees
    };
  }

  private mapToDetailDto(employee: IEmployee, includeSensitiveSalary: boolean): EmployeeDetailDto {
    const dto: EmployeeDetailDto = {
      id: employee._id.toString(),
      companyId: employee.companyId.toString(),
      employeeCode: employee.employeeCode,
      userId: employee.userId ? employee.userId.toString() : null,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      gender: employee.gender,
      dateOfBirth: employee.dateOfBirth
        ? (employee.dateOfBirth.toISOString().split('T')[0] ?? null)
        : null,
      joiningDate: employee.joiningDate.toISOString().split('T')[0] ?? '',
      exitDate: employee.exitDate ? (employee.exitDate.toISOString().split('T')[0] ?? null) : null,
      employmentType: employee.employmentType,
      employmentStatus: employee.employmentStatus,
      designation: employee.designation,
      departmentId: employee.departmentId.toString(),
      branchId: employee.branchId.toString(),
      shiftId: employee.shiftId.toString(),
      managerId: employee.managerId ? employee.managerId.toString() : null,
      address: employee.address,
      emergencyContact: employee.emergencyContact,
      avatarUrl: employee.avatarUrl,
      createdAt: employee.createdAt.toISOString(),
      updatedAt: employee.updatedAt.toISOString()
    };

    if (includeSensitiveSalary && employee.salaryDetails) {
      dto.salaryDetails = {
        salaryType: employee.salaryDetails.salaryType,
        baseRate: employee.salaryDetails.baseRate,
        currency: employee.salaryDetails.currency,
        bankName: employee.salaryDetails.bankName,
        accountNumberMasked: employee.salaryDetails.accountNumberMasked,
        routingCode: employee.salaryDetails.routingCode,
        taxIdMasked: employee.salaryDetails.taxIdMasked
      };
    }

    return dto;
  }
}

export const employeeService = new EmployeeService();
