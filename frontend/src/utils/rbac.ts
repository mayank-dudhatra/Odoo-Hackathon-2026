import type { RolePermission, PermissionScope } from '../types/rbac';

export const MODULES = {
  DASHBOARD: 'DASHBOARD',
  USERS: 'USERS',
  ROLES: 'ROLES',
  EMPLOYEES: 'EMPLOYEES',
  DEPARTMENTS: 'DEPARTMENTS',
  POSITIONS: 'POSITIONS',
  CONTRACTS: 'CONTRACTS',
  WORKING_SCHEDULES: 'WORKING_SCHEDULES',
  ATTENDANCE: 'ATTENDANCE',
  ATTENDANCE_POLICIES: 'ATTENDANCE_POLICIES',
  LEAVE_TYPES: 'LEAVE_TYPES',
  LEAVE_ALLOCATIONS: 'LEAVE_ALLOCATIONS',
  LEAVE_REQUESTS: 'LEAVE_REQUESTS',
  SALARY_STRUCTURES: 'SALARY_STRUCTURES',
  SALARY_RULES: 'SALARY_RULES',
  PAYRUNS: 'PAYRUNS',
  PAYSLIPS: 'PAYSLIPS',
  REPORTS: 'REPORTS',
  COMPANY_SETTINGS: 'COMPANY_SETTINGS',
  AUDIT_LOGS: 'AUDIT_LOGS',
} as const;

export const ACTIONS = {
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  APPROVE: 'APPROVE',
  REFUSE: 'REFUSE',
  PROCESS: 'PROCESS',
  VALIDATE: 'VALIDATE',
  PAY: 'PAY',
  EXPORT: 'EXPORT',
} as const;

export interface PermissionCheck {
  module: string;
  action: string;
  scope?: PermissionScope;
}

export function hasPermission(
  permissions: RolePermission[] | undefined | null,
  module: string,
  action: string,
  requiredScope?: PermissionScope,
  isAdmin = false
): boolean {
  if (isAdmin) {
    return true;
  }

  if (!permissions || permissions.length === 0) {
    return false;
  }

  const normalizedModule = module.toUpperCase();
  const normalizedAction = action.toUpperCase();

  const found = permissions.find(
    (p) => p.module.toUpperCase() === normalizedModule && p.action.toUpperCase() === normalizedAction
  );

  if (!found) {
    return false;
  }

  if (requiredScope && found.scope !== requiredScope && found.scope !== 'ALL') {
    return false;
  }

  return true;
}

export function hasAnyPermission(
  permissions: RolePermission[] | undefined | null,
  checks: PermissionCheck[],
  isAdmin = false
): boolean {
  if (isAdmin) {
    return true;
  }

  return checks.some((check) =>
    hasPermission(permissions, check.module, check.action, check.scope, isAdmin)
  );
}

export function hasAllPermissions(
  permissions: RolePermission[] | undefined | null,
  checks: PermissionCheck[],
  isAdmin = false
): boolean {
  if (isAdmin) {
    return true;
  }

  return checks.every((check) =>
    hasPermission(permissions, check.module, check.action, check.scope, isAdmin)
  );
}
