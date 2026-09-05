import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usersApi } from '../../api/users.api';
import type { User } from '../../types/users';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { TableSkeleton, ErrorAlert } from '../../components/common/States';
import { ChangePasswordModal } from '../../components/auth/ChangePasswordModal';
import { getStatusBadgeVariant } from '../../utils/status';
import {
  User as UserIcon,
  Mail,
  Briefcase,
  CheckCircle2,
  XCircle,
  KeyRound,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const UserProfilePage: React.FC = () => {
  const { user: authUser, role } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      if (!authUser?.user_id) return;
      setIsLoading(true);
      try {
        const fullUser = await usersApi.getUserById(authUser.user_id);
        if (isMounted) setUser(fullUser);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load profile';
        if (isMounted) setError(msg);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [authUser?.user_id]);

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
      <div className="space-y-6 max-w-4xl">
        <TableSkeleton rows={6} cols={3} />
      </div>
    );
  }

  const activeUser = user || authUser;
  if (!activeUser) {
    return (
      <div className="space-y-6 max-w-4xl">
        <ErrorAlert message={error || 'Profile not found'} />
      </div>
    );
  }

  const displayName =
    activeUser.employee_name ||
    `${activeUser.first_name || ''} ${activeUser.last_name || ''}`.trim() ||
    activeUser.username;

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">My Profile</h1>
        <p className="text-sm text-[#64748B] mt-0.5">
          View your authenticated account credentials, linked employment profile, and security preferences.
        </p>
      </div>

      {/* Main Profile Summary Card */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#EFF6FF] text-[#2563EB] font-bold text-2xl flex items-center justify-center border border-blue-200 shadow-2xs shrink-0">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-[#0F172A]">{displayName}</h2>
                <Badge variant={getStatusBadgeVariant(activeUser.status)}>
                  {activeUser.status}
                </Badge>
                <Badge variant="info">{role || activeUser.role_name}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-[#64748B]">
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                  @{activeUser.username}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {activeUser.email}
                </span>
                {activeUser.employee_code && (
                  <span className="flex items-center gap-1 font-mono">
                    <Briefcase className="w-3.5 h-3.5" />
                    {activeUser.employee_code}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => setChangePasswordOpen(true)}
            leftIcon={<KeyRound className="w-4 h-4" />}
          >
            Change Password
          </Button>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Details */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8F0]">
            <UserIcon className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-base font-bold text-[#0F172A]">Account Information</h3>
          </div>

          <div className="space-y-3.5 text-sm">
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Username:</span>
              <span className="col-span-2 font-mono font-semibold text-[#0F172A]">
                {activeUser.username}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Email Address:</span>
              <span className="col-span-2 font-medium text-[#0F172A]">{activeUser.email}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">System Role:</span>
              <span className="col-span-2 font-semibold text-[#2563EB]">
                {activeUser.role_name || role}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Account Status:</span>
              <span className="col-span-2">
                <Badge variant={getStatusBadgeVariant(activeUser.status)}>
                  {activeUser.status}
                </Badge>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Email Verification:</span>
              <span className="col-span-2 flex items-center gap-1.5 font-medium">
                {activeUser.email_verified_at ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Verified</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-amber-500" />
                    <span className="text-amber-700">Unverified</span>
                  </>
                )}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Last Login:</span>
              <span className="col-span-2 font-medium text-[#0F172A]">
                {formatDate(activeUser.last_login_at)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Member Since:</span>
              <span className="col-span-2 font-medium text-[#0F172A]">
                {formatDate(activeUser.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Linked Employee HR Record */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#2563EB]" />
              <h3 className="text-base font-bold text-[#0F172A]">Employment Link</h3>
            </div>
            {activeUser.employee_id ? (
              <Badge variant="success">Linked Employee</Badge>
            ) : (
              <Badge variant="neutral">Not Linked</Badge>
            )}
          </div>

          {activeUser.employee_id ? (
            <div className="space-y-3.5 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-[#64748B]">Employee Code:</span>
                <span className="col-span-2 font-mono font-bold text-[#0F172A]">
                  {activeUser.employee_code || '—'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-[#64748B]">Department:</span>
                <span className="col-span-2 font-medium text-[#0F172A]">
                  {activeUser.department_name || 'Unassigned'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-[#64748B]">Job Position:</span>
                <span className="col-span-2 font-medium text-[#0F172A]">
                  {activeUser.position_name || 'Unassigned'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-[#64748B]">Classification:</span>
                <span className="col-span-2 font-medium text-[#0F172A]">
                  {activeUser.employee_type_name || 'Regular Employee'}
                </span>
              </div>
              <div className="pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/employees/${activeUser.employee_id}`)}
                >
                  View My Employee Record →
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-[#64748B]">
              <p>No HR employee record is linked to this login identity.</p>
              <p className="text-xs mt-1 text-[#94A3B8]">
                Contact your HR Administrator to link your employee profile.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        isForced={false}
      />
    </div>
  );
};
