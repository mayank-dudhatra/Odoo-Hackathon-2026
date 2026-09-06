import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, Shield, Building2, Briefcase, User, CheckCircle2, LogIn, LogOut, Clock, Calendar } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Badge } from './Badge';
import { Button } from './Button';
import { attendanceApi } from '../../api/attendance.api';
import type { AttendanceRecord } from '../../types/attendance';

export const EmployeeProfileRoleCard: React.FC = () => {
  const navigate = useNavigate();
  const { user, employee, role, permissions } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const hasEmp = Boolean(user?.employee_id || employee?.employee_id);

  const fetchTodayAttendance = useCallback(async () => {
    if (!hasEmp) return;
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const records = await attendanceApi.getOwnAttendance({ work_date: todayStr });
      setTodayAttendance(records && records.length > 0 ? records[0] : null);
    } catch {
      // Ignore fallback if user not linked
    }
  }, [hasEmp]);

  useEffect(() => {
    fetchTodayAttendance();
  }, [fetchTodayAttendance]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      await attendanceApi.checkIn();
      fetchTodayAttendance();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      await attendanceApi.checkOut();
      fetchTodayAttendance();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Check-out failed');
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleVariant = (rName: string | null) => {
    switch (rName) {
      case 'Admin':
        return 'danger';
      case 'HR Manager':
        return 'warning';
      case 'Payroll Manager':
      case 'Payroll User':
        return 'info';
      case 'Manager':
        return 'primary';
      default:
        return 'neutral';
    }
  };

  const moduleNames = Array.from(new Set(permissions.map((p) => p.module)));
  const isCheckedIn = Boolean(todayAttendance && todayAttendance.check_in);
  const isCheckedOut = Boolean(todayAttendance && todayAttendance.check_out);

  const profilePath = (user?.employee_id || employee?.employee_id)
    ? `/employees/${user?.employee_id || employee?.employee_id}`
    : '/profile';

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs p-5 mb-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Col: Employee Information */}
        <div className="lg:col-span-7 flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-4 lg:pb-0 border-b lg:border-b-0 lg:border-r border-[#E2E8F0] lg:pr-6">
          <div className="w-14 h-14 rounded-full bg-[#EFF6FF] border-2 border-[#2563EB]/20 flex items-center justify-center text-[#2563EB] font-bold text-xl shrink-0 shadow-xs">
            {employee?.first_name ? employee.first_name[0].toUpperCase() : user?.username[0].toUpperCase()}
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-[#0F172A] truncate">
                {employee?.full_name || user?.username}
              </h2>
              {employee?.employee_code && (
                <span className="px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569] text-xs font-mono font-semibold border border-[#E2E8F0]">
                  {employee.employee_code}
                </span>
              )}
              <Badge variant={employee?.status === 'ACTIVE' || user?.status === 'ACTIVE' ? 'success' : 'neutral'}>
                {employee?.status || user?.status || 'ACTIVE'}
              </Badge>
            </div>

            <p className="text-xs text-[#64748B] flex items-center gap-2 flex-wrap">
              <span>{user?.email}</span>
            </p>

            {/* HR Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 text-xs">
              <div className="flex items-center gap-1.5 text-[#475569]">
                <Building2 className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                <span className="truncate">{employee?.department_name || 'General Dept'}</span>
              </div>

              <div className="flex items-center gap-1.5 text-[#475569]">
                <Briefcase className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                <span className="truncate">{employee?.position_name || 'Staff Member'}</span>
              </div>

              <div className="flex items-center gap-1.5 text-[#475569]">
                <User className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                <span className="truncate">Mgr: {employee?.manager_name || 'Direct / Admin'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Role Access & Self-Service Punch Controls */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#2563EB]" />
              Role & Self-Service
            </span>
            <Badge variant={getRoleVariant(role)} size="md">
              {role || 'Role Unassigned'}
            </Badge>
          </div>

          {/* Quick Punch Clock Controls for Employees / HR / Payroll / Managers */}
          {hasEmp && (
            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                <Clock className="w-4 h-4 text-[#2563EB] shrink-0" />
                <div>
                  <span className="font-semibold text-[#0F172A] block text-[11px]">Daily Attendance Punch</span>
                  <span className="text-[10px] text-[#64748B]">
                    {isCheckedOut
                      ? 'Shift Completed'
                      : isCheckedIn
                      ? `In: ${new Date(todayAttendance!.check_in!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'Not Checked In'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {!isCheckedIn ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleCheckIn}
                    isLoading={actionLoading}
                    leftIcon={<LogIn className="w-3.5 h-3.5" />}
                  >
                    Check In
                  </Button>
                ) : !isCheckedOut ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleCheckOut}
                    isLoading={actionLoading}
                    leftIcon={<LogOut className="w-3.5 h-3.5" />}
                  >
                    Check Out
                  </Button>
                ) : (
                  <Badge variant="success">Completed</Badge>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/time-off')}
                  leftIcon={<Calendar className="w-3.5 h-3.5" />}
                  title="Request Time Off"
                >
                  Leave
                </Button>
              </div>
            </div>
          )}

          <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] space-y-1 text-xs">
            <div className="flex items-center justify-between text-[#0F172A]">
              <span className="text-[#64748B]">Quick Links:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(profilePath)}
                  className="text-[#2563EB] hover:underline font-semibold text-[11px] flex items-center gap-1"
                >
                  <UserCheck className="w-3 h-3" /> My Profile
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => navigate('/my-attendance')}
                  className="text-[#2563EB] hover:underline font-semibold text-[11px] flex items-center gap-1"
                >
                  <Clock className="w-3 h-3" /> My Attendance
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

