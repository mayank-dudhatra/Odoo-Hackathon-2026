import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User as UserIcon,
  Mail,
  Shield,
  Briefcase,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Power,
  Link2,
} from 'lucide-react';
import { usersApi } from '../../api/users.api';
import { rolesApi } from '../../api/roles.api';
import { employeesApi } from '../../api/employees.api';
import type { User, UserStatus } from '../../types/users';
import type { Role, RolePermission } from '../../types/rbac';
import type { Employee } from '../../types/organization';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { TableSkeleton, ErrorAlert } from '../../components/common/States';
import { getStatusBadgeVariant } from '../../utils/status';

export const UserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role: currentRole, checkPermission } = useAuth();
  const isAdmin = currentRole === 'Admin';
  const canManage = isAdmin || checkPermission('USERS', 'UPDATE');

  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Status Change Dialog
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Role Change Modal
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedRoleName, setSelectedRoleName] = useState('');
  const [isSavingRole, setIsSavingRole] = useState(false);

  // Link Employee Modal
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [isSavingLink, setIsSavingLink] = useState(false);

  const fetchUserData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [userData, rolesData, empRes] = await Promise.all([
        usersApi.getUserById(Number(id)),
        rolesApi.listRoles().catch(() => []),
        employeesApi.getEmployees({ limit: 100 }).catch(() => ({ rows: [] })),
      ]);
      setUser(userData);
      setRoles(rolesData);
      setEmployees(empRes.rows || []);
      setSelectedRoleName(userData.role_name);
      setSelectedEmployeeId(userData.employee_id ? String(userData.employee_id) : '');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load user details';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleStatusToggle = async () => {
    if (!user) return;
    setIsUpdatingStatus(true);
    const nextStatus: UserStatus = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      await usersApi.setUserStatus(user.user_id, nextStatus);
      setIsStatusDialogOpen(false);
      setNotification(`User has been ${nextStatus === 'ACTIVE' ? 'activated' : 'disabled'} successfully.`);
      setTimeout(() => setNotification(null), 4000);
      fetchUserData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update account status';
      alert(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleRoleSave = async () => {
    if (!user || !selectedRoleName) return;
    setIsSavingRole(true);
    try {
      await usersApi.updateUser(user.user_id, { role_name: selectedRoleName });
      setIsRoleModalOpen(false);
      setNotification(`Role updated to ${selectedRoleName}.`);
      setTimeout(() => setNotification(null), 4000);
      fetchUserData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update role';
      alert(msg);
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleLinkSave = async () => {
    if (!user) return;
    setIsSavingLink(true);
    try {
      await usersApi.updateUser(user.user_id, {
        employee_id: selectedEmployeeId ? Number(selectedEmployeeId) : null,
      });
      setIsLinkModalOpen(false);
      setNotification('Employee link updated successfully.');
      setTimeout(() => setNotification(null), 4000);
      fetchUserData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to link employee';
      alert(msg);
    } finally {
      setIsSavingLink(false);
    }
  };

  const handleResendInvitation = async () => {
    if (!user) return;
    try {
      const res = await usersApi.resendInvitation(user.user_id);
      setNotification(res.message || 'Invitation sent successfully.');
      setTimeout(() => setNotification(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend invitation';
      alert(msg);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <TableSkeleton rows={8} cols={4} />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-6 max-w-5xl">
        <Button
          variant="secondary"
          onClick={() => navigate('/users')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Users
        </Button>
        <ErrorAlert
          message={error || 'User not found or access restricted.'}
          onRetry={fetchUserData}
        />
      </div>
    );
  }

  // Group permissions by module for the ACCESS tab
  const groupedPermissions: Record<string, RolePermission[]> = {};
  if (user.permissions && Array.isArray(user.permissions)) {
    for (const perm of user.permissions) {
      if (!groupedPermissions[perm.module]) {
        groupedPermissions[perm.module] = [];
      }
      groupedPermissions[perm.module].push(perm);
    }
  }

  const displayName = user.employee_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;

  return (
    <div className="space-y-6 max-w-5xl pb-12">
      {/* Top Banner / Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button
          variant="secondary"
          onClick={() => navigate('/users')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Users
        </Button>

        {canManage && (
          <div className="flex items-center gap-2.5">
            {user.status === 'INVITED' && (
              <Button
                variant="outline"
                onClick={handleResendInvitation}
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Resend Invitation
              </Button>
            )}

            {user.employee_id && (
              <Button
                variant="outline"
                onClick={() => navigate(`/employees/${user.employee_id}/edit`)}
                leftIcon={<Briefcase className="w-4 h-4" />}
              >
                Edit Employee & Account Details
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => setIsRoleModalOpen(true)}
              leftIcon={<Shield className="w-4 h-4" />}
            >
              Change Role
            </Button>

            <Button
              variant="outline"
              onClick={() => setIsLinkModalOpen(true)}
              leftIcon={<Link2 className="w-4 h-4" />}
            >
              {user.employee_id ? 'Relink Employee' : 'Link Employee'}
            </Button>

            <Button
              variant={user.status === 'ACTIVE' ? 'destructive' : 'primary'}
              onClick={() => setIsStatusDialogOpen(true)}
              leftIcon={<Power className="w-4 h-4" />}
            >
              {user.status === 'ACTIVE' ? 'Disable User' : 'Enable User'}
            </Button>
          </div>
        )}
      </div>

      {/* Header Profile Summary Card */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#EFF6FF] text-[#2563EB] font-bold text-xl flex items-center justify-center border border-blue-200 shadow-2xs shrink-0">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
                  {displayName}
                </h1>
                <Badge variant={getStatusBadgeVariant(user.status)}>
                  {user.status}
                </Badge>
                <Badge variant="info">
                  {user.role_name}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-[#64748B]">
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                  @{user.username}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {user.email}
                </span>
                {user.employee_code && (
                  <span className="flex items-center gap-1 font-mono">
                    <Briefcase className="w-3.5 h-3.5" />
                    {user.employee_code}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 text-xs text-[#64748B]">
            <div>User ID: <span className="font-mono font-bold text-[#0F172A]">#{user.user_id}</span></div>
            <div>Member Since: <span className="font-medium text-[#0F172A]">{formatDate(user.created_at)}</span></div>
          </div>
        </div>
      </div>

      {/* 4 Dedicated Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. ACCOUNT INFORMATION */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8F0]">
            <UserIcon className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-base font-bold text-[#0F172A]">Account Information</h2>
          </div>

          <div className="space-y-3.5 text-sm">
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Username:</span>
              <span className="col-span-2 font-mono font-medium text-[#0F172A]">{user.username}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Email Address:</span>
              <span className="col-span-2 font-medium text-[#0F172A]">{user.email}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Account Status:</span>
              <span className="col-span-2">
                <Badge variant={getStatusBadgeVariant(user.status)}>
                  {user.status}
                </Badge>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Email Verification:</span>
              <span className="col-span-2 flex items-center gap-1.5 font-medium">
                {user.email_verified_at ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Verified ({formatDate(user.email_verified_at)})</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-amber-500" />
                    <span className="text-amber-700">Pending Verification</span>
                  </>
                )}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Last Login:</span>
              <span className="col-span-2 font-medium text-[#0F172A]">{formatDate(user.last_login_at)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Created Date:</span>
              <span className="col-span-2 font-medium text-[#0F172A]">{formatDate(user.created_at)}</span>
            </div>
          </div>
        </div>

        {/* 2. EMPLOYEE LINK */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#2563EB]" />
              <h2 className="text-base font-bold text-[#0F172A]">Employee Link</h2>
            </div>
            {user.employee_id ? (
              <Badge variant="success">Linked</Badge>
            ) : (
              <Badge variant="neutral">Unlinked Account</Badge>
            )}
          </div>

          {user.employee_id ? (
            <div className="space-y-3.5 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-[#64748B]">Employee Name:</span>
                <span className="col-span-2 font-semibold text-[#0F172A]">
                  {user.employee_name || `${user.first_name} ${user.last_name}`}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-[#64748B]">Employee Code:</span>
                <span className="col-span-2 font-mono font-bold text-[#0F172A]">
                  {user.employee_code || '—'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-[#64748B]">Department:</span>
                <span className="col-span-2 font-medium text-[#0F172A]">
                  {user.department_name || 'Unassigned'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-[#64748B]">Job Position:</span>
                <span className="col-span-2 font-medium text-[#0F172A]">
                  {user.position_name || 'Unassigned'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-[#64748B]">Classification:</span>
                <span className="col-span-2 font-medium text-[#0F172A]">
                  {user.employee_type_name || 'Regular'}
                </span>
              </div>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/employees/${user.employee_id}`)}
                >
                  View Full HR Profile →
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center space-y-3">
              <p className="text-sm text-[#64748B]">
                This user account is not linked to any employee record.
              </p>
              {canManage && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsLinkModalOpen(true)}
                  leftIcon={<Link2 className="w-4 h-4" />}
                >
                  Link to Employee
                </Button>
              )}
            </div>
          )}
        </div>

        {/* 3. SECURITY & CREDENTIALS */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8F0]">
            <Shield className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-base font-bold text-[#0F172A]">Security</h2>
          </div>

          <div className="space-y-3.5 text-sm">
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Account Status:</span>
              <span className="col-span-2 font-semibold text-[#0F172A]">{user.status}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Invitation Status:</span>
              <span className="col-span-2 font-medium text-[#0F172A]">
                {user.status === 'INVITED'
                  ? user.invitation_expires_at && new Date(user.invitation_expires_at) < new Date()
                    ? 'Invitation Expired'
                    : 'Invitation Pending'
                  : 'Accepted / Active'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Email Verification:</span>
              <span className="col-span-2 font-medium text-[#0F172A]">
                {user.email_verified_at ? 'Verified' : 'Unverified'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Last Login:</span>
              <span className="col-span-2 font-medium text-[#0F172A]">{formatDate(user.last_login_at)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Must Change Pass:</span>
              <span className="col-span-2 font-medium text-[#0F172A]">
                {user.must_change_password ? 'Yes (Next Login)' : 'No'}
              </span>
            </div>
          </div>
        </div>

        {/* 4. ACCESS & ROLE OVERVIEW */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#2563EB]" />
              <h2 className="text-base font-bold text-[#0F172A]">Access</h2>
            </div>
            <Badge variant="info">{user.role_name}</Badge>
          </div>

          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Assigned Role:</span>
              <span className="col-span-2 font-bold text-[#0F172A]">{user.role_name}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Total Permissions:</span>
              <span className="col-span-2 font-semibold text-[#0F172A]">
                {user.permissions ? user.permissions.length : 0} Authoritative Permissions
              </span>
            </div>
            <p className="text-xs text-[#64748B] pt-1">
              Role permissions dictate real backend RBAC middleware evaluation. No hardcoded frontend access is applied.
            </p>
          </div>
        </div>
      </div>

      {/* FULL ACCESS / PERMISSION REGISTRY CATALOG */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">Authoritative Permissions Catalog</h2>
            <p className="text-xs text-[#64748B]">
              Real-time permissions and scopes mapped to role: <strong className="text-[#0F172A]">{user.role_name}</strong>
            </p>
          </div>
          <Badge variant="neutral">{user.permissions ? user.permissions.length : 0} Granted</Badge>
        </div>

        {Object.keys(groupedPermissions).length === 0 ? (
          <p className="text-sm text-[#64748B] py-6 text-center">No explicit permissions assigned to this role.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(groupedPermissions).map(([moduleName, perms]) => (
              <div key={moduleName} className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono text-[#0F172A] uppercase tracking-wider">
                    {moduleName}
                  </span>
                  <span className="text-[11px] text-[#64748B] font-semibold">{perms.length} actions</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {perms.map((p) => (
                    <span
                      key={p.permission_id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-white border border-[#CBD5E1] text-[#0F172A]"
                    >
                      <span>{p.action}</span>
                      <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${p.scope === 'ALL' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {p.scope}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Status Dialog */}
      <ConfirmDialog
        isOpen={isStatusDialogOpen}
        title={user.status === 'ACTIVE' ? 'Disable User Account?' : 'Enable User Account?'}
        message={
          user.status === 'ACTIVE'
            ? 'Are you sure you want to disable this user? The user will immediately be blocked from logging in.'
            : 'Are you sure you want to re-enable this user account?'
        }
        confirmLabel={user.status === 'ACTIVE' ? 'Disable User' : 'Enable User'}
        isDestructive={user.status === 'ACTIVE'}
        isLoading={isUpdatingStatus}
        onConfirm={handleStatusToggle}
        onClose={() => setIsStatusDialogOpen(false)}
      />

      {/* Change Role Modal */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-[#0F172A]">Assign Role</h3>
            <p className="text-xs text-[#64748B]">
              Select from the existing roles. Permissions will immediately refresh for this user.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Select Role
              </label>
              <select
                value={selectedRoleName}
                onChange={(e) => setSelectedRoleName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                {roles.map((r) => (
                  <option key={r.role_id} value={r.role_name}>
                    {r.role_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsRoleModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" isLoading={isSavingRole} onClick={handleRoleSave}>
                Save Role
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Link Employee Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-[#0F172A]">Link User to Employee</h3>
            <p className="text-xs text-[#64748B]">
              Select an employee record to link with this user account.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Employee
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                <option value="">-- Unlinked (No Employee) --</option>
                {employees.map((emp) => (
                  <option key={emp.employee_id} value={String(emp.employee_id)}>
                    {emp.full_name || `${emp.first_name} ${emp.last_name}`} — {emp.employee_code} ({emp.email || 'No email'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsLinkModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" isLoading={isSavingLink} onClick={handleLinkSave}>
                Save Link
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
