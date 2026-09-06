import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { attendanceApi } from '../../api/attendance.api';
import { leaveApi } from '../../api/leave.api';
import { payrollApi } from '../../api/payroll.api';
import type { AttendanceRecord } from '../../types/attendance';
import type { LeaveBalance } from '../../types/leave';
import type { Payslip } from '../../types/payroll';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ErrorAlert } from '../../components/common/States';
import { EmployeeProfileRoleCard } from '../../components/common/EmployeeProfileRoleCard';
import { formatCurrency, formatDate } from '../../utils/format';
import {
  Clock,
  Calendar,
  DollarSign,
  Download,
  Eye,
  CheckCircle2,
  Briefcase,
  Building2,
  LogIn,
  LogOut,
  PlusCircle,
  FileText,
} from 'lucide-react';

export const EmployeeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const [attendances, balances, ownPayslips] = await Promise.all([
        attendanceApi.getOwnAttendance({ work_date: todayStr }).catch(() => []),
        leaveApi.getOwnLeaveBalances().catch(() => []),
        payrollApi.getMyPayslips().catch(() => []),
      ]);

      setTodayAttendance(attendances && attendances.length > 0 ? attendances[0] : null);
      setLeaveBalances(balances || []);
      setPayslips(ownPayslips || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load employee dashboard';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      await attendanceApi.checkIn();
      showSuccess('Checked in successfully!');
      fetchDashboardData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to check in';
      alert(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      await attendanceApi.checkOut();
      showSuccess('Checked out successfully!');
      fetchDashboardData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to check out';
      alert(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPdf = async (slipId: number, periodName?: string) => {
    try {
      await payrollApi.downloadPayslipPdf(slipId, `payslip_${periodName || slipId}.pdf`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to download payslip PDF';
      alert(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl">
        <div className="h-28 bg-white rounded-xl border border-[#E2E8F0] animate-pulse p-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-white rounded-xl border border-[#E2E8F0] animate-pulse p-6" />
          <div className="h-64 bg-white rounded-xl border border-[#E2E8F0] animate-pulse p-6" />
          <div className="h-64 bg-white rounded-xl border border-[#E2E8F0] animate-pulse p-6" />
        </div>
      </div>
    );
  }

  const isCheckedIn = Boolean(todayAttendance && todayAttendance.check_in);
  const isCheckedOut = Boolean(todayAttendance && todayAttendance.check_out);

  const formatPunchTime = (ts?: string | null) => {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  const latestPayslip = payslips.length > 0 ? payslips[0] : null;

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* 0. EMPLOYEE PROFILE & ROLE GOVERNANCE BANNER */}
      <EmployeeProfileRoleCard />
      {/* Toast Alert */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && <ErrorAlert message={error} onRetry={fetchDashboardData} />}

      {/* 1. WELCOME BANNER */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-100 bg-white/10 px-2.5 py-0.5 rounded-md backdrop-blur-xs">
            Employee Self-Service
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold mt-2">
            Hello, {employeeName} 👋
          </h1>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-blue-100">
            {user?.employee_code && (
              <span className="flex items-center gap-1 font-mono font-bold bg-white/20 px-2 py-0.5 rounded">
                <Briefcase className="w-3.5 h-3.5" />
                {user.employee_code}
              </span>
            )}
            {user?.department_name && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {user.department_name}
              </span>
            )}
            {user?.position_name && (
              <span>• {user.position_name}</span>
            )}
            <span>• Status: <strong className="text-white">{user?.status || 'Active'}</strong></span>
          </div>
        </div>

        {/* Quick Punch Button in Banner */}
        <div className="shrink-0">
          {!isCheckedIn ? (
            <Button
              variant="secondary"
              size="lg"
              onClick={handleCheckIn}
              isLoading={actionLoading}
              leftIcon={<LogIn className="w-5 h-5 text-emerald-600" />}
              className="bg-white text-slate-900 hover:bg-slate-50 font-bold shadow-md"
            >
              Check In Now
            </Button>
          ) : !isCheckedOut ? (
            <Button
              variant="secondary"
              size="lg"
              onClick={handleCheckOut}
              isLoading={actionLoading}
              leftIcon={<LogOut className="w-5 h-5 text-amber-600" />}
              className="bg-white text-slate-900 hover:bg-slate-50 font-bold shadow-md"
            >
              Check Out Now
            </Button>
          ) : (
            <div className="bg-white/20 backdrop-blur-xs px-4 py-2 rounded-xl text-center">
              <span className="text-xs font-semibold text-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Completed Shift Today
              </span>
              <span className="text-[11px] text-blue-100 font-mono">
                {formatPunchTime(todayAttendance?.check_in)} - {formatPunchTime(todayAttendance?.check_out)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. ATTENDANCE & LEAVE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Attendance Widget */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#2563EB]" />
                <h2 className="text-base font-bold text-[#0F172A]">Today's Attendance</h2>
              </div>
              {isCheckedIn ? (
                <Badge variant={isCheckedOut ? 'neutral' : 'success'}>
                  {isCheckedOut ? 'Completed' : 'Clocked In'}
                </Badge>
              ) : (
                <Badge variant="warning">Not Checked In</Badge>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-center">
              <div className="p-3 bg-[#F8FAFC] rounded-xl border border-slate-100">
                <span className="text-[11px] text-[#64748B] font-medium block">Check In</span>
                <span className="text-sm font-bold font-mono text-[#0F172A] mt-1 block">
                  {formatPunchTime(todayAttendance?.check_in)}
                </span>
              </div>

              <div className="p-3 bg-[#F8FAFC] rounded-xl border border-slate-100">
                <span className="text-[11px] text-[#64748B] font-medium block">Check Out</span>
                <span className="text-sm font-bold font-mono text-[#0F172A] mt-1 block">
                  {formatPunchTime(todayAttendance?.check_out)}
                </span>
              </div>

              <div className="p-3 bg-[#F8FAFC] rounded-xl border border-slate-100">
                <span className="text-[11px] text-[#64748B] font-medium block">Worked Hours</span>
                <span className="text-sm font-bold text-[#2563EB] mt-1 block">
                  {todayAttendance?.hours_worked !== undefined && todayAttendance?.hours_worked !== null
                    ? `${Number(todayAttendance.hours_worked).toFixed(1)} hrs`
                    : todayAttendance?.worked_hours !== undefined && todayAttendance?.worked_hours !== null
                    ? `${Number(todayAttendance.worked_hours).toFixed(1)} hrs`
                    : '—'}
                </span>
              </div>

              <div className="p-3 bg-[#F8FAFC] rounded-xl border border-slate-100">
                <span className="text-[11px] text-[#64748B] font-medium block">Status</span>
                <span className="text-xs font-semibold text-[#0F172A] mt-1 block">
                  {todayAttendance?.status || (isCheckedIn ? 'PRESENT' : 'PENDING')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            {!isCheckedIn ? (
              <Button
                variant="primary"
                onClick={handleCheckIn}
                isLoading={actionLoading}
                leftIcon={<LogIn className="w-4 h-4" />}
                className="flex-1"
              >
                Punch Clock In
              </Button>
            ) : !isCheckedOut ? (
              <Button
                variant="destructive"
                onClick={handleCheckOut}
                isLoading={actionLoading}
                leftIcon={<LogOut className="w-4 h-4" />}
                className="flex-1"
              >
                Punch Clock Out
              </Button>
            ) : (
              <Button
                variant="secondary"
                disabled
                className="flex-1 text-xs"
              >
                Today's Punches Recorded
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => navigate('/my-attendance')}
            >
              View Attendance →
            </Button>
          </div>
        </div>

        {/* Leave Balances Widget */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#2563EB]" />
                <h2 className="text-base font-bold text-[#0F172A]">Leave Balances</h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/time-off')}
                leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
              >
                Request Time Off
              </Button>
            </div>

            {leaveBalances.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#64748B]">
                <p>No active leave allocations found.</p>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {leaveBalances.slice(0, 3).map((bal) => (
                  <div
                    key={bal.leave_type_id}
                    className="p-3 bg-[#F8FAFC] rounded-xl border border-slate-100 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-xs text-[#0F172A] block">
                        {bal.leave_type_name}
                      </span>
                      <span className="text-[11px] text-[#64748B]">
                        Allocated: {bal.allocated_days}d • Used: {bal.used_days}d
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold text-emerald-700 block">
                        {bal.remaining_days} Days
                      </span>
                      <span className="text-[10px] text-[#64748B] font-medium uppercase">
                        Remaining
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate('/time-off')}
              className="text-xs text-[#2563EB] hover:underline font-semibold flex items-center gap-1"
            >
              View Full Leave Details & Request History →
            </button>
          </div>
        </div>
      </div>

      {/* 3. LATEST PAYSLIP & RECENT PAYSLIPS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Payslip Card (1 col) */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#2563EB]" />
                <h2 className="text-base font-bold text-[#0F172A]">Latest Payslip</h2>
              </div>
              {latestPayslip && (
                <Badge variant="success">{latestPayslip.status || 'PAID'}</Badge>
              )}
            </div>

            {latestPayslip ? (
              <div className="space-y-3.5 pt-2 text-sm">
                <div>
                  <span className="text-[11px] text-[#64748B] font-medium">Payroll Period</span>
                  <p className="font-bold text-[#0F172A]">
                    {latestPayslip.payrun_name || `${formatDate(latestPayslip.period_start)} - ${formatDate(latestPayslip.period_end)}`}
                  </p>
                </div>

                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                  <span className="text-[11px] text-[#64748B] font-medium">Net Take-Home Pay</span>
                  <p className="text-xl font-bold text-[#2563EB]">
                    {formatCurrency(latestPayslip.net_pay || 0)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[#64748B]">Gross Pay:</span>
                    <p className="font-semibold text-[#0F172A]">{formatCurrency(latestPayslip.gross_pay || 0)}</p>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Deductions:</span>
                    <p className="font-semibold text-rose-600">{formatCurrency(latestPayslip.total_deductions || 0)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-[#64748B]">
                <p>No payslips generated yet.</p>
              </div>
            )}
          </div>

          {latestPayslip && (
            <div className="flex items-center gap-2 pt-3">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleDownloadPdf(latestPayslip.payslip_id, latestPayslip.payrun_name)}
                leftIcon={<Download className="w-3.5 h-3.5" />}
                className="flex-1"
              >
                Download PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/payslips')}
                leftIcon={<Eye className="w-3.5 h-3.5" />}
              >
                View
              </Button>
            </div>
          )}
        </div>

        {/* Recent Payslips List (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-base font-bold text-[#0F172A]">Recent Payslips</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/payslips')}
              className="text-xs text-[#2563EB] hover:underline font-semibold"
            >
              View All Payslips →
            </button>
          </div>

          {payslips.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#64748B]">
              <p>No past payslips available for your profile.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-sm">
              {payslips.slice(0, 4).map((slip) => (
                <div key={slip.payslip_id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-semibold text-[#0F172A] block text-xs sm:text-sm">
                      {slip.payrun_name || `${formatDate(slip.period_start)} - ${formatDate(slip.period_end)}`}
                    </span>
                    <span className="text-[11px] text-[#64748B]">
                      Gross: {formatCurrency(slip.gross_pay || 0)} • Deductions: {formatCurrency(slip.total_deductions || 0)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#0F172A] text-xs sm:text-sm">
                      {formatCurrency(slip.net_pay || 0)}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPdf(slip.payslip_id, slip.payrun_name)}
                      leftIcon={<Download className="w-3.5 h-3.5" />}
                    >
                      PDF
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
