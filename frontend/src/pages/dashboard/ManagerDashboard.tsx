import React, { useState, useEffect } from 'react';
import { Users, CalendarCheck, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { EmployeeProfileRoleCard } from '../../components/common/EmployeeProfileRoleCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { TableSkeleton, ErrorAlert, EmptyState } from '../../components/common/States';
import { leaveApi } from '../../api/leave.api';
import { attendanceApi } from '../../api/attendance.api';
import { employeesApi } from '../../api/employees.api';
import type { LeaveRequest } from '../../types/leave';
import type { AttendanceRecord } from '../../types/attendance';
import type { Employee } from '../../types/employee';

export const ManagerDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [teamAttendance, setTeamAttendance] = useState<AttendanceRecord[]>([]);
  const [teamMembers, setTeamMembers] = useState<Employee[]>([]);

  const fetchManagerData = async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [leaves, attendance, empsRes] = await Promise.all([
        leaveApi.listLeaveRequests({ status: 'PENDING' }).catch(() => []),
        attendanceApi.listAttendance({ date: today }).catch(() => []),
        employeesApi.listEmployees({ limit: 50 }).catch(() => ({ rows: [] })),
      ]);
      setPendingLeaves(leaves);
      setTeamAttendance(attendance);
      setTeamMembers(empsRes.rows || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load manager dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagerData();
  }, []);

  const handleApproveLeave = async (id: number) => {
    try {
      await leaveApi.approveLeaveRequest(id, { comments: 'Approved by manager' });
      fetchManagerData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to approve leave request');
    }
  };

  const handleRejectLeave = async (id: number) => {
    try {
      await leaveApi.rejectLeaveRequest(id, { comments: 'Rejected by manager' });
      fetchManagerData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to reject leave request');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Employee Profile + Manager Role Access */}
      <EmployeeProfileRoleCard />

      {error && <ErrorAlert message={error} onRetry={fetchManagerData} />}

      {/* Manager Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Team Direct Reports</p>
            <p className="text-2xl font-bold text-[#0F172A]">{teamMembers.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Pending Leave Approvals</p>
            <p className="text-2xl font-bold text-[#0F172A]">{pendingLeaves.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Present Today</p>
            <p className="text-2xl font-bold text-[#0F172A]">
              {teamAttendance.filter((a) => a.check_in).length}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Pending Approvals & Today's Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
            <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Pending Team Leave Requests
            </h3>
            <Badge variant="warning">{pendingLeaves.length} Pending</Badge>
          </div>

          {loading ? (
            <TableSkeleton rows={3} cols={3} />
          ) : pendingLeaves.length === 0 ? (
            <EmptyState
              title="No Pending Requests"
              description="All team leave requests have been processed."
              icon={<CheckCircle2 className="w-8 h-8 text-emerald-500" />}
            />
          ) : (
            <div className="space-y-3">
              {pendingLeaves.map((lr) => (
                <div key={lr.leave_request_id} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex items-center justify-between gap-4 text-xs">
                  <div>
                    <p className="font-semibold text-[#0F172A]">
                      {lr.employee_name || `Employee #${lr.employee_id}`}
                    </p>
                    <p className="text-[#64748B]">
                      {lr.leave_type_name} ({lr.days_requested} days): {lr.start_date} to {lr.end_date}
                    </p>
                    {lr.reason && <p className="text-[11px] text-[#475569] italic mt-0.5">"{lr.reason}"</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="primary" size="sm" onClick={() => handleApproveLeave(lr.leave_request_id)}>
                      Approve
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleRejectLeave(lr.leave_request_id)}>
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Attendance Overview */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
            <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-[#2563EB]" />
              Today's Attendance Overview
            </h3>
            <span className="text-xs text-[#64748B] font-mono">{new Date().toISOString().slice(0, 10)}</span>
          </div>

          {loading ? (
            <TableSkeleton rows={3} cols={3} />
          ) : teamAttendance.length === 0 ? (
            <EmptyState title="No Attendance Activity" description="No check-ins recorded yet today." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold">
                    <th className="py-2 px-3">Employee</th>
                    <th className="py-2 px-3">Check In</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {teamAttendance.slice(0, 5).map((att) => (
                    <tr key={att.attendance_id}>
                      <td className="py-2.5 px-3 font-medium text-[#0F172A]">
                        {att.employee_name || `Employee #${att.employee_id}`}
                      </td>
                      <td className="py-2.5 px-3 text-[#64748B]">
                        {att.check_in ? new Date(att.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant={att.status === 'PRESENT' ? 'success' : att.late_minutes > 0 ? 'warning' : 'neutral'}>
                          {att.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
