import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../../api/users.api';
import { dashboardApi, type OverallDashboardData } from '../../api/dashboard.api';
import type { UserSummary } from '../../types/users';
import { Button } from '../../components/common/Button';
import { TableSkeleton, ErrorAlert } from '../../components/common/States';
import { formatCurrency } from '../../utils/format';
import {
  Users,
  Shield,
  KeyRound,
  Building2,
  UserCheck,
  UserX,
  Mail,
  ArrowRight,
} from 'lucide-react';

import { EmployeeProfileRoleCard } from '../../components/common/EmployeeProfileRoleCard';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [userSummary, setUserSummary] = useState<UserSummary>({
    total_users: 0,
    active_users: 0,
    invited_users: 0,
    disabled_users: 0,
  });
  const [overallData, setOverallData] = useState<OverallDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [summary, overall] = await Promise.all([
        usersApi.getUsersSummary().catch(() => ({
          total_users: 0,
          active_users: 0,
          invited_users: 0,
          disabled_users: 0,
        })),
        dashboardApi.getOverallDashboard().catch(() => null),
      ]);
      setUserSummary(summary);
      setOverallData(overall);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load system admin dashboard';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminDashboard();
  }, [fetchAdminDashboard]);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl">
        <TableSkeleton rows={6} cols={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Top Banner: Employee Profile + Role Governance */}
      <EmployeeProfileRoleCard />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">System Administration</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Enterprise identity management, RBAC access governance, and overall platform health.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            onClick={() => navigate('/users')}
            leftIcon={<Users className="w-4 h-4" />}
          >
            Manage Users
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/roles')}
            leftIcon={<Shield className="w-4 h-4" />}
          >
            Roles & Permissions
          </Button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchAdminDashboard} />}

      {/* 1. IDENTITY & USER ACCOUNTS SUMMARY */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-3">
          User Accounts & Identity
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B]">Total Registered</span>
              <div className="p-2 rounded-lg bg-blue-50 text-[#2563EB]">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#0F172A]">{userSummary.total_users}</p>
            <p className="text-[11px] text-[#64748B]">Identity logins created</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B]">Active Accounts</span>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-700">{userSummary.active_users}</p>
            <p className="text-[11px] text-[#64748B]">Active and verified logins</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B]">Pending Invitations</span>
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Mail className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-600">{userSummary.invited_users}</p>
            <p className="text-[11px] text-[#64748B]">Awaiting onboarding completion</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B]">Disabled Accounts</span>
              <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                <UserX className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-700">{userSummary.disabled_users}</p>
            <p className="text-[11px] text-[#64748B]">Login access blocked</p>
          </div>
        </div>
      </div>

      {/* 2. OVERALL SYSTEM OPERATIONS & SHORTCUTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Operations Health */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
          <h2 className="text-base font-bold text-[#0F172A] pb-3 border-b border-[#E2E8F0]">
            System Operations Snapshot
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1">
            <div className="p-4 bg-[#F8FAFC] rounded-xl border border-slate-100">
              <span className="text-xs text-[#64748B] font-medium block">Active Employees</span>
              <span className="text-xl font-bold text-[#0F172A] mt-1 block">
                {overallData?.hr?.active_employees ?? 0}
              </span>
            </div>

            <div className="p-4 bg-[#F8FAFC] rounded-xl border border-slate-100">
              <span className="text-xs text-[#64748B] font-medium block">Total Net Payroll</span>
              <span className="text-xl font-bold text-[#2563EB] mt-1 block">
                {formatCurrency(Number(overallData?.payroll?.total_net) || 0)}
              </span>
            </div>

            <div className="p-4 bg-[#F8FAFC] rounded-xl border border-slate-100">
              <span className="text-xs text-[#64748B] font-medium block">Attendance Present Today</span>
              <span className="text-xl font-bold text-emerald-700 mt-1 block">
                {overallData?.attendance_health?.present_count ?? 0}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/users')}
            >
              Open Complete User Management Table →
            </Button>
          </div>
        </div>

        {/* Administration Shortcuts */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
          <h2 className="text-base font-bold text-[#0F172A] pb-3 border-b border-[#E2E8F0]">
            Admin Quick Links
          </h2>

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => navigate('/users')}
              className="w-full p-2.5 rounded-lg border border-slate-200 hover:border-[#2563EB] hover:bg-blue-50/40 text-left text-xs font-semibold text-[#0F172A] flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#2563EB]" />
                User Accounts
              </span>
              <ArrowRight className="w-4 h-4 text-[#64748B]" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/roles')}
              className="w-full p-2.5 rounded-lg border border-slate-200 hover:border-[#2563EB] hover:bg-blue-50/40 text-left text-xs font-semibold text-[#0F172A] flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#2563EB]" />
                Roles Configuration
              </span>
              <ArrowRight className="w-4 h-4 text-[#64748B]" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/permissions')}
              className="w-full p-2.5 rounded-lg border border-slate-200 hover:border-[#2563EB] hover:bg-blue-50/40 text-left text-xs font-semibold text-[#0F172A] flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#2563EB]" />
                Permissions Registry
              </span>
              <ArrowRight className="w-4 h-4 text-[#64748B]" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/departments')}
              className="w-full p-2.5 rounded-lg border border-slate-200 hover:border-[#2563EB] hover:bg-blue-50/40 text-left text-xs font-semibold text-[#0F172A] flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#2563EB]" />
                Organization Units
              </span>
              <ArrowRight className="w-4 h-4 text-[#64748B]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
