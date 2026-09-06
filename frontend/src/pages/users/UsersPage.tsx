import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../../api/users.api';
import { rolesApi } from '../../api/roles.api';
import type { User, UserStatus, UserSummary } from '../../types/users';
import type { Role } from '../../types/rbac';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { getStatusBadgeVariant } from '../../utils/status';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { TableSkeleton, EmptyState, ErrorAlert } from '../../components/common/States';
import { UserFormModal } from './UserFormModal';
import {
  Search,
  UserPlus,
  Eye,
  Edit2,
  Power,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Users as UsersIcon,
  UserCheck,
  UserX,
  Mail,
  Briefcase,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser, checkPermission, role: currentRole } = useAuth();
  const isAdmin = currentRole === 'Admin';
  const canCreate = isAdmin || checkPermission('USERS', 'CREATE');
  const canUpdate = isAdmin || checkPermission('USERS', 'UPDATE');

  const [users, setUsers] = useState<User[]>([]);
  const [summary, setSummary] = useState<UserSummary>({
    total_users: 0,
    active_users: 0,
    invited_users: 0,
    disabled_users: 0,
  });
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedVerification, setSelectedVerification] = useState<string>('ALL');
  const [selectedLinkage, setSelectedLinkage] = useState<string>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  // Status Confirm Dialog
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [isStatusChanging, setIsStatusChanging] = useState(false);

  // Notification Banner
  const [notification, setNotification] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<number | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchUsersAndSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const isVerifiedParam =
        selectedVerification === 'VERIFIED'
          ? 'true'
          : selectedVerification === 'UNVERIFIED'
          ? 'false'
          : undefined;

      const isLinkedParam =
        selectedLinkage === 'LINKED'
          ? 'true'
          : selectedLinkage === 'UNLINKED'
          ? 'false'
          : undefined;

      const [usersData, summaryData, rolesData] = await Promise.all([
        usersApi.listUsers({
          search: search.trim() || undefined,
          status: selectedStatus !== 'ALL' ? (selectedStatus as UserStatus) : undefined,
          role_id: selectedRole !== 'ALL' ? selectedRole : undefined,
          is_verified: isVerifiedParam,
          is_linked: isLinkedParam,
        }),
        usersApi.getUsersSummary().catch(() => ({
          total_users: 0,
          active_users: 0,
          invited_users: 0,
          disabled_users: 0,
        })),
        rolesApi.listRoles().catch(() => []),
      ]);

      setUsers(usersData);
      setSummary(summaryData);
      setRoles(rolesData);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj?.message || 'Unable to load company users.');
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedRole, selectedStatus, selectedVerification, selectedLinkage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsersAndSummary();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchUsersAndSummary]);

  const handleResendCredentials = async (u: User) => {
    try {
      setResendingId(u.user_id);
      const res = await usersApi.resendInvitation(u.user_id);
      showNotification(res?.message || `Invitation sent successfully to ${u.email}`);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      showNotification(`Failed to resend invitation: ${errorObj?.message || 'Error'}`);
    } finally {
      setResendingId(null);
    }
  };

  const handlePromptStatusChange = (u: User) => {
    setTargetUser(u);
    setStatusConfirmOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!targetUser) return;
    const newStatus: UserStatus = targetUser.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    setIsStatusChanging(true);

    try {
      await usersApi.setUserStatus(targetUser.user_id, newStatus);
      showNotification(
        `User ${targetUser.username} has been ${newStatus === 'ACTIVE' ? 'activated' : 'disabled'} successfully.`
      );
      setStatusConfirmOpen(false);
      setTargetUser(null);
      await fetchUsersAndSummary();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      showNotification(`Failed to change user status: ${errorObj?.message || 'Error occurred'}`);
    } finally {
      setIsStatusChanging(false);
    }
  };

  const handleOpenCreate = () => {
    setUserToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setUserToEdit(u);
    setIsFormOpen(true);
  };

  // Paginated records
  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
  const paginatedUsers = users.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Users</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Manage user accounts, roles, access, and account status.
          </p>
        </div>

        {canCreate && (
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              onClick={handleOpenCreate}
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              + Quick Invite User
            </Button>

            <Button
              variant="primary"
              onClick={() => navigate('/employees/new')}
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              + Create Employee & Account
            </Button>
          </div>
        )}
      </div>

      {/* Real Backend KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-[#2563EB] flex items-center justify-center shrink-0">
            <UsersIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#64748B]">Total Users</div>
            <div className="text-xl font-bold text-[#0F172A]">{summary.total_users}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#64748B]">Active Users</div>
            <div className="text-xl font-bold text-[#0F172A]">{summary.active_users}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#64748B]">Pending Invitations</div>
            <div className="text-xl font-bold text-[#0F172A]">{summary.invited_users}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center shrink-0">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#64748B]">Disabled Users</div>
            <div className="text-xl font-bold text-[#0F172A]">{summary.disabled_users}</div>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="flex-1">
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by username, email, employee code, name..."
              leftIcon={<Search className="w-4 h-4 text-[#94A3B8]" />}
              className="text-xs"
            />
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by role"
              className="px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="ALL">All Roles</option>
              {roles.map((r) => (
                <option key={r.role_id} value={String(r.role_id)}>
                  {r.role_name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by account status"
              className="px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INVITED">INVITED</option>
              <option value="DISABLED">DISABLED</option>
            </select>

            {/* Verification Filter */}
            <select
              value={selectedVerification}
              onChange={(e) => {
                setSelectedVerification(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by email verification"
              className="px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="ALL">Verification: All</option>
              <option value="VERIFIED">Verified</option>
              <option value="UNVERIFIED">Not Verified</option>
            </select>

            {/* Employee Linkage Filter */}
            <select
              value={selectedLinkage}
              onChange={(e) => {
                setSelectedLinkage(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by employee linkage"
              className="px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="ALL">Employee: All</option>
              <option value="LINKED">Linked</option>
              <option value="UNLINKED">Unlinked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        {error && (
          <div className="p-4">
            <ErrorAlert message={error} onRetry={fetchUsersAndSummary} />
          </div>
        )}

        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={6} cols={6} />
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            title="No Users Found"
            description={
              search || selectedRole !== 'ALL' || selectedStatus !== 'ALL' || selectedVerification !== 'ALL' || selectedLinkage !== 'ALL'
                ? 'No users match your applied search or filter criteria.'
                : 'There are currently no users registered in this organization.'
            }
            actionLabel={canCreate ? '+ Invite User' : undefined}
            onAction={canCreate ? handleOpenCreate : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                  <th className="py-3 px-4 sm:px-6">User</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Linked Employee</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Email Verification</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm text-[#0F172A]">
                {paginatedUsers.map((u) => {
                  const isSelf = currentUser?.user_id === u.user_id;
                  const displayName = u.employee_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;

                  return (
                    <tr
                      key={u.user_id}
                      className="hover:bg-[#F8FAFC]/80 transition-colors"
                    >
                      {/* User Avatar + Display Name */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] flex items-center justify-center font-bold text-xs shrink-0">
                            {displayName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-[#0F172A] truncate flex items-center gap-1.5">
                              <span>{displayName}</span>
                              {isSelf && (
                                <span className="text-[10px] bg-blue-50 text-[#2563EB] px-1.5 py-0.2 rounded font-medium border border-blue-200">
                                  You
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs text-[#334155]">
                          @{u.username}
                        </span>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4">
                        <span className="text-xs text-[#64748B]">
                          {u.email}
                        </span>
                      </td>

                      {/* Linked Employee */}
                      <td className="py-3.5 px-4">
                        {u.employee_code ? (
                          <span className="inline-flex items-center gap-1 text-xs font-mono font-medium text-[#0F172A]">
                            <Briefcase className="w-3.5 h-3.5 text-[#2563EB]" />
                            {u.employee_code}
                          </span>
                        ) : (
                          <span className="text-xs text-[#94A3B8] italic">Unlinked</span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <Badge variant="info">
                          {u.role_name || 'No Role'}
                        </Badge>
                      </td>

                      {/* Account Status Badge */}
                      <td className="py-3.5 px-4">
                        <Badge variant={getStatusBadgeVariant(u.status)}>
                          {u.status}
                        </Badge>
                      </td>

                      {/* Email Verification */}
                      <td className="py-3.5 px-4">
                        {u.email_verified_at ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                            <XCircle className="w-3.5 h-3.5 text-amber-500" />
                            Not Verified
                          </span>
                        )}
                      </td>

                      {/* Last Login */}
                      <td className="py-3.5 px-4 text-xs text-[#64748B]">
                        {formatDate(u.last_login_at)}
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-xs text-[#64748B]">
                        {formatDate(u.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* View Full Profile / Details */}
                          <button
                            type="button"
                            onClick={() =>
                              u.employee_id
                                ? navigate(`/employees/${u.employee_id}`)
                                : navigate(`/users/${u.user_id}`)
                            }
                            className="p-1.5 rounded-md text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors cursor-pointer"
                            title={u.employee_id ? 'View Employee Profile & Details' : 'View User Account Details'}
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Full Edit Employee, Contract, Policy, Schedule & Role */}
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() =>
                                u.employee_id
                                  ? navigate(`/employees/${u.employee_id}/edit`)
                                  : handleOpenEdit(u)
                              }
                              className="p-1.5 rounded-md text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors cursor-pointer"
                              title={
                                u.employee_id
                                  ? 'Edit Full Employee Record, Contract, Schedule, Attendance Policy & Role'
                                  : 'Quick Edit User Role / Employee Link'
                              }
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Quick Role / Employee Link modal trigger */}
                          {canUpdate && u.employee_id && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(u)}
                              className="p-1.5 rounded-md text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors cursor-pointer"
                              title="Quick Role Assignment / Link Modal"
                            >
                              <UserPlus className="w-4 h-4" />
                            </button>
                          )}

                          {/* Resend Invitation */}
                          {canUpdate && u.status === 'INVITED' && (
                            <button
                              type="button"
                              onClick={() => handleResendCredentials(u)}
                              disabled={resendingId === u.user_id}
                              className="p-1.5 rounded-md text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors cursor-pointer"
                              title="Resend Invitation"
                            >
                              <RefreshCw
                                className={`w-4 h-4 ${resendingId === u.user_id ? 'animate-spin text-[#2563EB]' : ''}`}
                              />
                            </button>
                          )}

                          {/* Enable / Disable User */}
                          {canUpdate && !isSelf && (
                            <button
                              type="button"
                              onClick={() => handlePromptStatusChange(u)}
                              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                u.status === 'ACTIVE'
                                  ? 'text-[#64748B] hover:text-red-600 hover:bg-red-50'
                                  : 'text-[#64748B] hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={u.status === 'ACTIVE' ? 'Disable User' : 'Enable User'}
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] text-xs">
            <span className="text-[#64748B]">
              Page <strong className="text-[#0F172A]">{currentPage}</strong> of{' '}
              <strong className="text-[#0F172A]">{totalPages}</strong> ({users.length} users)
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit User Modal */}
      <UserFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setUserToEdit(null);
        }}
        userToEdit={userToEdit}
        onSuccess={() => {
          setIsFormOpen(false);
          setUserToEdit(null);
          showNotification(
            userToEdit ? 'User updated successfully.' : 'User invited successfully.'
          );
          fetchUsersAndSummary();
        }}
      />

      {/* Confirm Status Dialog */}
      <ConfirmDialog
        isOpen={statusConfirmOpen}
        title={targetUser?.status === 'ACTIVE' ? 'Disable this user?' : 'Enable this user?'}
        message={
          targetUser?.status === 'ACTIVE'
            ? `Are you sure you want to disable ${targetUser?.username}? The user will no longer be able to access the application.`
            : `Are you sure you want to enable ${targetUser?.username}? The user will regain access to the application.`
        }
        confirmLabel={targetUser?.status === 'ACTIVE' ? 'Disable User' : 'Enable User'}
        isDestructive={targetUser?.status === 'ACTIVE'}
        isLoading={isStatusChanging}
        onConfirm={handleConfirmStatusChange}
        onClose={() => {
          setStatusConfirmOpen(false);
          setTargetUser(null);
        }}
      />
    </div>
  );
};
