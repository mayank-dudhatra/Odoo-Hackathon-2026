import React, { useState, useEffect, useCallback } from 'react';
import { rolesApi } from '../../api/roles.api';
import type { Role } from '../../types/rbac';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/common/Button';
import { TableSkeleton, EmptyState, ErrorAlert } from '../../components/common/States';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { RolePermissionsModal } from './RolePermissionsModal';
import { RoleFormModal } from './RoleFormModal';
import { Shield, Plus, Edit2, Trash2, KeyRound } from 'lucide-react';

export const RolesPage: React.FC = () => {
  const { role: currentRole, checkPermission } = useAuth();
  const isAdmin = currentRole === 'Admin';
  const canManage = isAdmin || checkPermission('ROLES', 'UPDATE');
  const canCreate = isAdmin || checkPermission('ROLES', 'CREATE');
  const canDelete = isAdmin || checkPermission('ROLES', 'DELETE');

  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Modals state
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<Role | null>(null);

  // Delete Confirm Dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [targetRoleToDelete, setTargetRoleToDelete] = useState<Role | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRoles = useCallback(async () => {
    try {
      const data = await rolesApi.listRoles();
      setRoles(data);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj?.message || 'Unable to load security roles.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await rolesApi.listRoles();
        if (mounted) setRoles(data);
      } catch (err: unknown) {
        const errorObj = err as { message?: string };
        if (mounted) setError(errorObj?.message || 'Unable to load security roles.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleOpenPermissions = (r: Role) => {
    setSelectedRole(r);
    setIsPermissionsOpen(true);
  };

  const handleOpenCreate = () => {
    setRoleToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (r: Role) => {
    setRoleToEdit(r);
    setIsFormOpen(true);
  };

  const handlePromptDelete = (r: Role) => {
    setTargetRoleToDelete(r);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!targetRoleToDelete) return;
    setIsDeleting(true);

    try {
      await rolesApi.deleteRole(targetRoleToDelete.role_id);
      showNotification(`Role "${targetRoleToDelete.role_name}" deleted successfully.`);
      setDeleteConfirmOpen(false);
      setTargetRoleToDelete(null);
      await fetchRoles();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      showNotification(`Failed to delete role: ${errorObj?.message || 'Error occurred'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
            Roles & Permissions
          </h2>
          <p className="text-xs sm:text-sm text-[#475569] mt-0.5">
            Configure enterprise security roles and module permissions across PeoplePay360
          </p>
        </div>

        {canCreate && (
          <Button
            variant="primary"
            onClick={handleOpenCreate}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Role
          </Button>
        )}
      </div>

      {/* Success Notification */}
      {notification && (
        <div className="p-3.5 bg-[#DCFCE7] border border-[#BBF7D0] rounded-lg text-xs font-medium text-[#16A34A] animate-in fade-in duration-200">
          {notification}
        </div>
      )}

      {/* Roles Grid / Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        {error && (
          <div className="p-4">
            <ErrorAlert message={error} onRetry={fetchRoles} />
          </div>
        )}

        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={5} cols={4} />
          </div>
        ) : roles.length === 0 ? (
          <EmptyState
            title="No Roles Found"
            description="No roles are defined in the system."
            actionLabel={canCreate ? 'Create Role' : undefined}
            onAction={canCreate ? handleOpenCreate : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                  <th className="py-3 px-4 sm:px-6">Role Name</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Permissions</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm text-[#0F172A]">
                {roles.map((r) => {
                  const isSystemAdmin = r.role_name === 'Admin';

                  return (
                    <tr key={r.role_id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                      {/* Role Name */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-semibold text-xs shrink-0">
                            <Shield className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-xs sm:text-sm text-[#0F172A]">
                              {r.role_name}
                            </span>
                            {isSystemAdmin && (
                              <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                                System
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="py-4 px-4 max-w-xs text-xs text-[#475569]">
                        {r.description || <span className="italic text-[#94A3B8]">No description provided</span>}
                      </td>

                      {/* Permissions Summary / Manager */}
                      <td className="py-4 px-4">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenPermissions(r)}
                          leftIcon={<KeyRound className="w-3.5 h-3.5 text-[#2563EB]" />}
                          className="text-xs"
                        >
                          Manage Permissions
                        </Button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="inline-flex items-center gap-1">
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(r)}
                              className="p-1.5 rounded-md text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors cursor-pointer"
                              title="Edit role metadata"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {canDelete && !isSystemAdmin && (
                            <button
                              type="button"
                              onClick={() => handlePromptDelete(r)}
                              className="p-1.5 rounded-md text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-colors cursor-pointer"
                              title="Delete role"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Permissions Modal */}
      <RolePermissionsModal
        isOpen={isPermissionsOpen}
        onClose={() => setIsPermissionsOpen(false)}
        role={selectedRole}
        onSuccess={() => {
          showNotification(`Permissions updated for role ${selectedRole?.role_name}.`);
        }}
      />

      {/* Role Create / Edit Modal */}
      <RoleFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        roleToEdit={roleToEdit}
        onSuccess={() => {
          showNotification(
            roleToEdit ? `Role "${roleToEdit.role_name}" updated.` : 'New role created.'
          );
          fetchRoles();
        }}
      />

      {/* Delete Role Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Role"
        message={`Are you sure you want to permanently delete role "${targetRoleToDelete?.role_name}"? Users currently assigned to this role will lose their granted access.`}
        confirmLabel="Delete Role"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
};
