import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { rolesApi } from '../../api/roles.api';
import { permissionsApi } from '../../api/permissions.api';
import type { Role, RolePermission, Permission, PermissionScope } from '../../types/rbac';
import { TableSkeleton, ErrorAlert } from '../../components/common/States';
import { Shield, Search } from 'lucide-react';

interface RolePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  onSuccess?: () => void;
}

export const RolePermissionsModal: React.FC<RolePermissionsModalProps> = ({
  isOpen,
  onClose,
  role,
  onSuccess,
}) => {
  const [assigned, setAssigned] = useState<Map<number, { scope: PermissionScope }>>(new Map());
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen || !role) return;

    let active = true;
    const fetchData = async () => {
      try {
        const [rolePerms, allPerms] = await Promise.all([
          rolesApi.getRolePermissions(role.role_id),
          permissionsApi.listPermissions(),
        ]);

        if (active) {
          setAllPermissions(allPerms);
          const assignedMap = new Map<number, { scope: PermissionScope }>();
          rolePerms.forEach((p: RolePermission) => {
            assignedMap.set(p.permission_id, { scope: p.scope || 'ALL' });
          });
          setAssigned(assignedMap);
        }
      } catch (err: unknown) {
        const errorObj = err as { message?: string };
        if (active) {
          setError(errorObj?.message || 'Failed to load permissions for this role.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, [isOpen, role]);

  // Group permissions by module
  const groupedPermissions = useMemo(() => {
    const map = new Map<string, Permission[]>();

    allPermissions.forEach((p) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.module.toLowerCase().includes(q) ||
        p.action.toLowerCase().includes(q);

      if (matchesSearch) {
        const list = map.get(p.module) || [];
        list.push(p);
        map.set(p.module, list);
      }
    });

    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [allPermissions, search]);

  const togglePermission = (permissionId: number, defaultScope: PermissionScope = 'ALL') => {
    setAssigned((prev) => {
      const next = new Map(prev);
      if (next.has(permissionId)) {
        next.delete(permissionId);
      } else {
        next.set(permissionId, { scope: defaultScope });
      }
      return next;
    });
  };

  const changeScope = (permissionId: number, scope: PermissionScope) => {
    setAssigned((prev) => {
      const next = new Map(prev);
      if (next.has(permissionId)) {
        next.set(permissionId, { scope });
      }
      return next;
    });
  };

  const toggleModuleAll = (permissions: Permission[]) => {
    setAssigned((prev) => {
      const next = new Map(prev);
      const allSelected = permissions.every((p) => next.has(p.permission_id));

      if (allSelected) {
        permissions.forEach((p) => next.delete(p.permission_id));
      } else {
        permissions.forEach((p) => next.set(p.permission_id, { scope: 'ALL' }));
      }

      return next;
    });
  };

  const handleSave = async () => {
    if (!role) return;
    setIsSaving(true);
    setError(null);

    const payload = Array.from(assigned.entries()).map(([permission_id, { scope }]) => ({
      permission_id,
      scope,
    }));

    try {
      await rolesApi.updateRolePermissions(role.role_id, payload);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj?.message || 'Failed to update permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!role) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSaving ? () => {} : onClose}
      title={`Permissions: ${role.role_name}`}
      description="Configure granular module permissions and access scope for this role"
      maxWidth="2xl"
      footer={
        <>
          <div className="mr-auto text-xs text-[#64748B]">
            Granted: <strong className="text-[#0F172A]">{assigned.size}</strong> of{' '}
            {allPermissions.length} permissions
          </div>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
            Save Permissions
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <ErrorAlert message={error} />}

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search module or action (e.g. USERS, CREATE, EXPORT)..."
            className="w-full h-9.5 px-3 pl-9 text-xs bg-white text-[#0F172A] placeholder-[#94A3B8] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          />
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
        </div>

        {isLoading ? (
          <TableSkeleton rows={8} cols={4} />
        ) : groupedPermissions.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#64748B]">
            No permissions match your search query.
          </div>
        ) : (
          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            {groupedPermissions.map(([moduleName, permissions]) => {
              const allSelected = permissions.every((p) => assigned.has(p.permission_id));
              const someSelected =
                !allSelected && permissions.some((p) => assigned.has(p.permission_id));

              return (
                <div
                  key={moduleName}
                  className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden"
                >
                  {/* Module Group Header */}
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span className="font-semibold text-xs text-[#0F172A]">
                        {moduleName}
                      </span>
                      <span className="text-[11px] text-[#64748B]">
                        ({permissions.filter((p) => assigned.has(p.permission_id)).length}/{permissions.length})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleModuleAll(permissions)}
                      className="text-[11px] font-medium text-[#2563EB] hover:text-[#1D4ED8] cursor-pointer"
                    >
                      {allSelected ? 'Deselect All' : someSelected ? 'Select All' : 'Select All'}
                    </button>
                  </div>

                  {/* Actions List */}
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {permissions.map((p) => {
                      const isGranted = assigned.has(p.permission_id);
                      const currentScope = assigned.get(p.permission_id)?.scope || 'ALL';

                      return (
                        <div
                          key={p.permission_id}
                          className={`flex items-center justify-between p-2 rounded-md border text-xs transition-colors ${
                            isGranted
                              ? 'bg-[#EFF6FF]/60 border-[#BFDBFE]'
                              : 'bg-white border-[#E2E8F0] opacity-80'
                          }`}
                        >
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isGranted}
                              onChange={() => togglePermission(p.permission_id)}
                              className="w-4 h-4 text-[#2563EB] border-[#CBD5E1] rounded focus:ring-[#2563EB] cursor-pointer"
                            />
                            <span
                              className={`font-medium ${
                                isGranted ? 'text-[#0F172A]' : 'text-[#64748B]'
                              }`}
                            >
                              {p.action}
                            </span>
                          </label>

                          {/* Scope Selector */}
                          {isGranted && (
                            <select
                              value={currentScope}
                              onChange={(e) =>
                                changeScope(p.permission_id, e.target.value as PermissionScope)
                              }
                              className="text-[11px] py-0.5 px-1.5 bg-white border border-[#CBD5E1] rounded font-medium text-[#334155] focus:outline-none focus:border-[#2563EB] cursor-pointer"
                            >
                              <option value="ALL">ALL</option>
                              <option value="OWN">OWN</option>
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};
