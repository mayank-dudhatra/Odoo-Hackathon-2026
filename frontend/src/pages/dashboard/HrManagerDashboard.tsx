import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, type HrDashboardMetrics, type AttendanceHealthMetrics, type TimeOffMetrics } from '../../api/dashboard.api';
import { Button } from '../../components/common/Button';
import { TableSkeleton, ErrorAlert } from '../../components/common/States';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Calendar,
  Building2,
  Plus,
  ArrowRight,
} from 'lucide-react';

import { EmployeeProfileRoleCard } from '../../components/common/EmployeeProfileRoleCard';

export const HrManagerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [hrData, setHrData] = useState<HrDashboardMetrics | null>(null);
  const [attendanceHealth, setAttendanceHealth] = useState<AttendanceHealthMetrics | null>(null);
  const [timeOffData, setTimeOffData] = useState<TimeOffMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHrDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [hr, att, time] = await Promise.all([
        dashboardApi.getHrDashboard().catch(() => null),
        dashboardApi.getAttendanceDashboard().catch(() => null),
        dashboardApi.getTimeOffDashboard().catch(() => null),
      ]);
      setHrData(hr);
      setAttendanceHealth(att);
      setTimeOffData(time);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load HR dashboard';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHrDashboard();
  }, [fetchHrDashboard]);

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
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">HR Operations Dashboard</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Real-time workforce health, daily attendance tracking, and time-off operations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            onClick={() => navigate('/employees/new')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Employee
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/time-off')}
          >
            Review Time Off
          </Button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchHrDashboard} />}

      {/* 1. KEY WORKFORCE METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">Total Employees</span>
            <div className="p-2 rounded-lg bg-blue-50 text-[#2563EB]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0F172A]">{hrData?.total_employees ?? 0}</p>
          <p className="text-[11px] text-[#64748B]">Company workforce directory</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">Active Employees</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{hrData?.active_employees ?? 0}</p>
          <p className="text-[11px] text-[#64748B]">On active employment</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">Pending Time Off</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600">{timeOffData?.pending_requests ?? 0}</p>
          <p className="text-[11px] text-[#64748B]">Awaiting manager review</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">Inactive / Terminated</span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-700">
            {(hrData?.inactive_employees ?? 0) + (hrData?.terminated_employees ?? 0)}
          </p>
          <p className="text-[11px] text-[#64748B]">Past & deactivated records</p>
        </div>
      </div>

      {/* 2. TODAY'S ATTENDANCE HEALTH */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-base font-bold text-[#0F172A]">Today's Attendance Health</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/attendance')}
            >
              Full Attendance Log →
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 text-center">
            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
              <span className="text-xs text-emerald-800 font-semibold block">Present</span>
              <span className="text-2xl font-bold text-emerald-700 mt-1 block">
                {attendanceHealth?.present_count ?? 0}
              </span>
            </div>

            <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-100">
              <span className="text-xs text-amber-800 font-semibold block">Late Arrival</span>
              <span className="text-2xl font-bold text-amber-700 mt-1 block">
                {attendanceHealth?.late_count ?? 0}
              </span>
            </div>

            <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-100">
              <span className="text-xs text-rose-800 font-semibold block">Absent</span>
              <span className="text-2xl font-bold text-rose-700 mt-1 block">
                {attendanceHealth?.absent_count ?? 0}
              </span>
            </div>

            <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100">
              <span className="text-xs text-blue-800 font-semibold block">Total Expected</span>
              <span className="text-2xl font-bold text-blue-700 mt-1 block">
                {attendanceHealth?.total_expected ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Operations Actions */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] pb-3 border-b border-[#E2E8F0]">
              Operational Shortcuts
            </h2>
            <div className="space-y-2 pt-3">
              <button
                type="button"
                onClick={() => navigate('/employees')}
                className="w-full p-2.5 rounded-lg border border-slate-200 hover:border-[#2563EB] hover:bg-blue-50/40 text-left text-xs font-semibold text-[#0F172A] flex items-center justify-between transition-colors"
              >
                <span>Directory & Profiles</span>
                <ArrowRight className="w-4 h-4 text-[#64748B]" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/departments')}
                className="w-full p-2.5 rounded-lg border border-slate-200 hover:border-[#2563EB] hover:bg-blue-50/40 text-left text-xs font-semibold text-[#0F172A] flex items-center justify-between transition-colors"
              >
                <span>Manage Departments</span>
                <ArrowRight className="w-4 h-4 text-[#64748B]" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/positions')}
                className="w-full p-2.5 rounded-lg border border-slate-200 hover:border-[#2563EB] hover:bg-blue-50/40 text-left text-xs font-semibold text-[#0F172A] flex items-center justify-between transition-colors"
              >
                <span>Manage Job Positions</span>
                <ArrowRight className="w-4 h-4 text-[#64748B]" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/attendance-policies')}
                className="w-full p-2.5 rounded-lg border border-slate-200 hover:border-[#2563EB] hover:bg-blue-50/40 text-left text-xs font-semibold text-[#0F172A] flex items-center justify-between transition-colors"
              >
                <span>Attendance Policies</span>
                <ArrowRight className="w-4 h-4 text-[#64748B]" />
              </button>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-[#64748B] flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>HR operational workspace</span>
          </div>
        </div>
      </div>
    </div>
  );
};
