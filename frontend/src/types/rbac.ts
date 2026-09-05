export type PermissionScope = 'ALL' | 'OWN';

export interface Permission {
  permission_id: number;
  module: string;
  action: string;
}

export interface RolePermission extends Permission {
  scope: PermissionScope;
}

export interface Role {
  role_id: number;
  role_name: string;
  description: string | null;
  created_at?: string;
  permissions_count?: number;
}

export interface CreateRolePayload {
  role_name: string;
  description?: string;
}

export interface UpdateRolePayload {
  role_name?: string;
  description?: string;
}

export interface UpdateRolePermissionsPayload {
  permissions: {
    permission_id: number;
    scope: PermissionScope;
  }[];
}

export interface ModulePermissionsGroup {
  module: string;
  permissions: Permission[];
}
