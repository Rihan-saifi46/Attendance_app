import { z } from 'zod';

export const UserRole = {
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  COMPANY_OWNER: 'COMPANY_OWNER',
  HR_ADMIN: 'HR_ADMIN',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE'
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

export const userRoleSchema = z.enum([
  UserRole.PLATFORM_ADMIN,
  UserRole.COMPANY_OWNER,
  UserRole.HR_ADMIN,
  UserRole.MANAGER,
  UserRole.EMPLOYEE
]);

export const RoleHierarchy: Record<UserRoleType, number> = {
  [UserRole.PLATFORM_ADMIN]: 100,
  [UserRole.COMPANY_OWNER]: 80,
  [UserRole.HR_ADMIN]: 60,
  [UserRole.MANAGER]: 40,
  [UserRole.EMPLOYEE]: 20
};

/**
 * Returns true if actorRole has strictly greater or equal authority to targetRole.
 */
export function hasAuthorityOver(actorRole: UserRoleType, targetRole: UserRoleType): boolean {
  return RoleHierarchy[actorRole] >= RoleHierarchy[targetRole];
}

/**
 * Determines if actor can assign targetRole to a new/existing user.
 * Rule: Actors can only assign roles strictly lower in privilege than their own.
 * Only PLATFORM_ADMIN can assign PLATFORM_ADMIN.
 */
export function canAssignRole(actorRole: UserRoleType, roleToAssign: UserRoleType): boolean {
  if (actorRole === UserRole.PLATFORM_ADMIN) {
    return true;
  }
  // COMPANY_OWNER can assign HR_ADMIN, MANAGER, EMPLOYEE, or transfer to COMPANY_OWNER
  if (actorRole === UserRole.COMPANY_OWNER) {
    return roleToAssign !== UserRole.PLATFORM_ADMIN;
  }
  // HR_ADMIN can assign MANAGER or EMPLOYEE
  if (actorRole === UserRole.HR_ADMIN) {
    return roleToAssign === UserRole.MANAGER || roleToAssign === UserRole.EMPLOYEE;
  }
  return false;
}
