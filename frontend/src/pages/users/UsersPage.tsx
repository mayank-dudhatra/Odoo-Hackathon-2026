import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usersApi } from '../../api/users.api';
import { rolesApi } from '../../api/roles.api';
import type { User, UserStatus } from '../../types/users';
import type { Role } from '../../types/rbac';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { getStatusBadgeVariant } from '../../utils/status';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { TableSkeleton, EmptyState, ErrorAlert } from '../../components/common/States';
import { UserDetailsModal } from './UserDetailsModal';
import { UserFormModal } from './UserFormModal';
import {
  Search,
  UserPlus,
  Eye,
  Edit2,
  Power,
  Mail,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const UsersPage: React.FC = () => {
  const { user: currentUser, checkPermission, role: currentRole } = useAuth();
  const isAdmin = currentRole === 'Admin';
  const canCreate = isAdmin || checkPermission('USERS', 'CREATE');
  const canUpdate = isAdmin || checkPermission('USERS', 'UPDATE');

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  // Status Confirm Dialog
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [isStatusChanging, setIsStatusChanging] = useState(false);

  // Notification Banner
  const [notification, setNotification] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<number | null>(null);

  const handleResendCredentials = async (u: User) => {
    try {
      setResendingId(u.user_id);
      const res = await usersApi.resendInvitation(u.user_id);
      setNotification(res?.message || `Credentials sent successfully to ${u.email}`);
      setTimeout(() => setNotification(null), 5000);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj?.message || 'Failed to send credentials email.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setResendingId(null);
    }
  };

  const fetchUsers = useCallback(async () => {
    try {
      const [usersData, rolesData] = await Promise.all([
        usersApi.listUsers(),
        rolesApi.listRoles().catch(() => []),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj?.message || 'Unable to load company users.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [usersData, rolesData] = await Promise.all([
          usersApi.listUsers(),
          rolesApi.listRoles().catch(() => []),
        ]);
        if (mounted) {
          setUsers(usersData);
          setRoles(rolesData);
        }
      } catch (err: unknown) {
        const errorObj = err as { message?: string };
        if (mounted) setError(errorObj?.message || 'Unable to load company users.');
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

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search term
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesUsername = u.username.toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesEmployee = (u.employee_code || '').toLowerCase().includes(q);
        if (!matchesUsername && !matchesEmail && !matchesEmployee) return false;
      }

      // Role filter
      if (selectedRole !== 'ALL' && u.role_name !== selectedRole) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL' && u.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [users, search, selectedRole, selectedStatus]);

  // Paginated records
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const handleOpenDetails = (user: User) => {
    setSelectedUser(user);
    setIsDetailsOpen(true);
  };

  const handleOpenCreate = () => {
    setUserToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setUserToEdit(user);
    setIsFormOpen(true);
  };

  const handlePromptStatusChange = (user: User) => {
    setTargetUser(user);
    setStatusConfirmOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!targetUser) return;
    const newStatus: UserStatus = targetUser.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    setIsStatusChanging(true);

    try {
      await usersApi.setUserStatus(targetUser.user_id, newStatus);
      showNotification(
        `User ${targetUser.username} has been ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully.`
      );
      setStatusConfirmOpen(false);
      setTargetUser(null);
      await fetchUsers();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      showNotification(`Failed to change user status: ${errorObj?.message || 'Error occurred'}`);
    } finally {
      setIsStatusChanging(false);
    }
  };

  const roleFilterOptions = [
    { value: 'ALL', label: 'All Roles' },
    ...roles.map((r) => ({ value: r.role_name, label: r.role_name })),
  ];

  const statusFilterOptions = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INVITED', label: 'Invited' },
    { value: 'DISABLED', label: 'Disabled' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
            Users Management
          </h2>
          <p className="text-xs sm:text-sm text-[#475569] mt-0.5">
            Manage system users, corporate invitations, roles, and employee assignments
          </p>
        </div>

        {canCreate && (
          <Button
            variant="primary"
            onClick={handleOpenCreate}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Add New User
          </Button>
        )}
      </div>

      {/* Success Notification */}
      {notification && (
        <div className="p-3.5 bg-[#DCFCE7] border border-[#BBF7D0] rounded-lg text-xs font-medium text-[#16A34A] animate-in fade-in duration-200">
          {notification}
        </div>
      )}

      {/* Filter and Search Card */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="w-full md:flex-1">
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by username, email, employee..."
            leftIcon={<Search className="w-4 h-4 text-[#94A3B8]" />}
            className="h-9.5 text-xs"
          />
        </div>

        <div className="w-full md:w-auto flex items-center gap-2.5">
          <div className="w-1/2 md:w-44">
            <Select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setCurrentPage(1);
              }}
              options={roleFilterOptions}
              className="h-9.5 text-xs"
            />
          </div>

          <div className="w-1/2 md:w-40">
            <Select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              options={statusFilterOptions}
              className="h-9.5 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        {error && (
          <div className="p-4">
            <ErrorAlert message={error} onRetry={fetchUsers} />
          </div>
        )}

        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={6} cols={5} />
          </div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            title="No Users Found"
            description={
              search || selectedRole !== 'ALL' || selectedStatus !== 'ALL'
                ? 'No users match your applied search or filter criteria.'
                : 'There are currently no users in this organization.'
            }
            actionLabel={canCreate ? 'Add User' : undefined}
            onAction={canCreate ? handleOpenCreate : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                  <th className="py-3 px-4 sm:px-6">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Employee Link</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm text-[#0F172A]">
                {paginatedUsers.map((u) => {
                  const isSelf = currentUser?.user_id === u.user_id;

                  return (
                    <tr
                      key={u.user_id}
                      className="hover:bg-[#F8FAFC]/80 transition-colors"
                    >
                      {/* User Avatar + Name + Email */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] flex items-center justify-center font-semibold text-xs shrink-0">
                            {u.username.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs sm:text-sm text-[#0F172A] truncate">
                              {u.username} {isSelf && <span className="text-[10px] text-[#2563EB] font-normal">(You)</span>}
                            </div>
                            <div className="text-xs text-[#64748B] truncate">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-xs sm:text-sm text-[#334155]">
                          {u.role_name || 'No Role'}
                        </span>
                      </td>

                      {/* Employee Link */}
                      <td className="py-3.5 px-4">
                        {u.employee_code ? (
                          <span className="inline-flex items-center text-xs font-medium text-[#0F172A]">
                            {u.employee_code}
                          </span>
                        ) : (
                          <span className="text-xs text-[#94A3B8] italic">Unlinked</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        <Badge variant={getStatusBadgeVariant(u.status)}>
                          {u.status}
                        </Badge>
                      </td>

                      {/* Last Login */}
                      <td className="py-3.5 px-4 text-xs text-[#64748B]">
                        {u.last_login_at
                          ? new Date(u.last_login_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Never'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* View Details */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(u)}
                            className="p-1.5 rounded-md text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors cursor-pointer"
                            title="View user details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Role / Link */}
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(u)}
                              className="p-1.5 rounded-md text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors cursor-pointer"
                              title="Edit user role & assignment"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Send / Resend Credentials via Email */}
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => handleResendCredentials(u)}
                              disabled={resendingId === u.user_id || u.status === 'DISABLED'}
                              className="p-1.5 rounded-md text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors cursor-pointer disabled:opacity-40"
                              title="Send / Resend login credentials email"
                            >
                              <Mail className={`w-4 h-4 ${resendingId === u.user_id ? 'animate-pulse text-[#2563EB]' : ''}`} />
                            </button>
                          )}

                          {/* Toggle Active/Disabled status */}
                          {canUpdate && !isSelf && (
                            <button
                              type="button"
                              onClick={() => handlePromptStatusChange(u)}
                              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                u.status === 'ACTIVE'
                                  ? 'text-[#DC2626] hover:bg-[#FEE2E2]'
                                  : 'text-[#16A34A] hover:bg-[#DCFCE7]'
                              }`}
                              title={u.status === 'ACTIVE' ? 'Deactivate user' : 'Activate user'}
                            >
                              <Power className="w-4 h-4" />
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

        {/* Pagination Bar */}
        {!isLoading && filteredUsers.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-t border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="text-xs text-[#64748B]">
              Showing <strong className="text-[#0F172A]">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
              <strong className="text-[#0F172A]">
                {Math.min(currentPage * pageSize, filteredUsers.length)}
              </strong>{' '}
              of <strong className="text-[#0F172A]">{filteredUsers.length}</strong> users
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
              >
                Previous
              </Button>
              <span className="text-xs font-medium text-[#475569] px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      <UserDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        user={selectedUser}
      />

      {/* User Create / Edit Modal */}
      <UserFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => {
          showNotification(
            userToEdit
              ? `User ${userToEdit.username} was updated successfully.`
              : 'New user created successfully.'
          );
          fetchUsers();
        }}
        userToEdit={userToEdit}
      />

      {/* Deactivate/Activate Confirm Dialog */}
      <ConfirmDialog
        isOpen={statusConfirmOpen}
        onClose={() => setStatusConfirmOpen(false)}
        onConfirm={handleConfirmStatusChange}
        title={targetUser?.status === 'ACTIVE' ? 'Deactivate User' : 'Activate User'}
        message={
          targetUser?.status === 'ACTIVE'
            ? `Are you sure you want to deactivate user "${targetUser?.username}"? Their active sessions will be revoked and they will not be able to log in until reactivated.`
            : `Are you sure you want to activate user "${targetUser?.username}"? They will regain access to log in to PeoplePay360.`
        }
        confirmLabel={targetUser?.status === 'ACTIVE' ? 'Deactivate User' : 'Activate User'}
        isDestructive={targetUser?.status === 'ACTIVE'}
        isLoading={isStatusChanging}
      />
    </div>
  );
};
