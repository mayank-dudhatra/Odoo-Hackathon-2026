import React, { useState, useEffect, useCallback } from 'react';
import { LogIn, LogOut, Edit2, Calendar, Search } from 'lucide-react';
import { attendanceApi } from '../../api/attendance.api';
import type { AttendanceRecord, AttendanceStatus, DeductionType } from '../../types/attendance';
import { Button } from '../../components/common/Button';
import { Badge, type BadgeVariant } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { TableSkeleton, ErrorAlert, EmptyState } from '../../components/common/States';
import { AttendanceCorrectionModal } from './AttendanceCorrectionModal';
import { formatDate, formatTime } from '../../utils/format';
import { useAuth } from '../../hooks/useAuth';

export const AttendancePage: React.FC = () => {
  const { user, checkPermission, role } = useAuth();
  const isAdmin = role === 'Admin';

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Self check-in states
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [selfActionLoading, setSelfActionLoading] = useState(false);

  // Correction Modal
  const [correctionRecord, setCorrectionRecord] = useState<AttendanceRecord | null>(null);
  const [correctionOpen, setCorrectionOpen] = useState(false);

  // Permissions
  const canUpdate = isAdmin || checkPermission('ATTENDANCE', 'UPDATE');
  const hasEmployee = Boolean(user?.employee_id);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await attendanceApi.listAttendance({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        status: statusFilter !== 'ALL' ? (statusFilter as AttendanceStatus) : undefined,
        limit: 100,
      });
      setRecords(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to fetch attendance records');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, statusFilter]);

  const fetchTodaySelf = useCallback(async () => {
    if (!hasEmployee) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await attendanceApi.getMyAttendanceByDate(today);
      setTodayRecord(res);
    } catch {
      setTodayRecord(null);
    }
  }, [hasEmployee]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    fetchTodaySelf();
  }, [fetchTodaySelf]);

  const handleSelfCheckIn = async () => {
    setSelfActionLoading(true);
    try {
      await attendanceApi.checkIn({});
      await fetchTodaySelf();
      fetchRecords();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Check-in failed');
    } finally {
      setSelfActionLoading(false);
    }
  };

  const handleSelfCheckOut = async () => {
    setSelfActionLoading(true);
    try {
      await attendanceApi.checkOut({});
      await fetchTodaySelf();
      fetchRecords();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Check-out failed');
    } finally {
      setSelfActionLoading(false);
    }
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    const map: Record<AttendanceStatus, { label: string; variant: BadgeVariant }> = {
      PRESENT: { label: 'Present', variant: 'success' },
      LATE: { label: 'Late', variant: 'warning' },
      HALF_DAY: { label: 'Half Day', variant: 'warning' },
      ABSENT: { label: 'Absent', variant: 'danger' },
      ON_LEAVE: { label: 'On Leave', variant: 'info' },
      OVERTIME: { label: 'Overtime', variant: 'success' },
    };
    const s = map[status] || { label: status, variant: 'neutral' };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const getDeductionBadge = (type?: DeductionType) => {
    if (!type || type === 'NONE') return null;
    if (type === 'HALF_DAY') return <Badge variant="warning">Half Day Deduction</Badge>;
    if (type === 'FULL_DAY') return <Badge variant="danger">Full Day Deduction</Badge>;
    return null;
  };

  const filteredRecords = records.filter((r) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const name = (r.employee_name || `${r.employee_first_name || ''} ${r.employee_last_name || ''}`).toLowerCase();
    const code = (r.employee_code || '').toLowerCase();
    return name.includes(term) || code.includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Attendance Management</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Track real-time employee check-ins, worked hours, grace policies, and attendance exceptions.
          </p>
        </div>

        {/* Quick Check-in/out for active employee */}
        {hasEmployee && (
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-[#E2E8F0] shadow-2xs">
            <span className="text-xs font-semibold text-[#64748B] uppercase px-2">Quick Action:</span>
            {!todayRecord?.check_in ? (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<LogIn className="w-4 h-4" />}
                onClick={handleSelfCheckIn}
                isLoading={selfActionLoading}
              >
                Check In
              </Button>
            ) : !todayRecord?.check_out ? (
              <Button
                variant="destructive"
                size="sm"
                leftIcon={<LogOut className="w-4 h-4" />}
                onClick={handleSelfCheckOut}
                isLoading={selfActionLoading}
              >
                Check Out
              </Button>
            ) : (
              <Badge variant="success">Completed Today</Badge>
            )}
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
        <div className="w-full md:w-64">
          <Input
            placeholder="Search employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-[#64748B]" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <span>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-md text-[#0F172A]"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <span>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-md text-[#0F172A]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-md text-[#0F172A]"
          >
            <option value="ALL">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="LATE">Late</option>
            <option value="HALF_DAY">Half Day</option>
            <option value="ABSENT">Absent</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="OVERTIME">Overtime</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {error && <ErrorAlert message={error} onRetry={fetchRecords} />}

      {loading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : filteredRecords.length === 0 ? (
        <EmptyState
          title="No Attendance Records Found"
          description="There are no attendance records matching the selected date range and filter criteria."
          icon={<Calendar className="w-8 h-8 text-[#2563EB]" />}
        />
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Work Date</th>
                  <th className="py-3 px-4">In / Out</th>
                  <th className="py-3 px-4">Worked Hours</th>
                  <th className="py-3 px-4">Exceptions</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredRecords.map((r) => (
                  <tr key={r.attendance_id} className="hover:bg-[#F8FAFC]/60 transition-colors">
                    <td className="py-3 px-4 font-medium text-[#0F172A]">
                      <div>{r.employee_name || `${r.employee_first_name || ''} ${r.employee_last_name || ''}`.trim() || `Employee #${r.employee_id}`}</div>
                      <div className="text-xs text-[#64748B] font-normal">{r.employee_code}</div>
                    </td>
                    <td className="py-3 px-4 text-[#0F172A] text-xs font-mono">
                      {formatDate(r.work_date)}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono">
                      <div className="text-emerald-700">In: {formatTime(r.check_in)}</div>
                      <div className="text-slate-600">Out: {formatTime(r.check_out)}</div>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span className="font-semibold text-[#0F172A]">
                        {(r.hours_worked ?? r.worked_hours) != null ? `${r.hours_worked ?? r.worked_hours}h` : '—'}
                      </span>
                      {r.scheduled_hours != null && (
                        <span className="text-[#64748B] ml-1">/ {r.scheduled_hours}h</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs space-y-1">
                      {r.late_minutes && r.late_minutes > 0 ? (
                        <div className="text-amber-700 font-medium">Late: {r.late_minutes}m</div>
                      ) : null}
                      {r.early_leave_minutes && r.early_leave_minutes > 0 ? (
                        <div className="text-orange-700 font-medium">Early: {r.early_leave_minutes}m</div>
                      ) : null}
                      {getDeductionBadge(r.deduction_type)}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(r.status)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {canUpdate && (
                        <button
                          type="button"
                          onClick={() => {
                            setCorrectionRecord(r);
                            setCorrectionOpen(true);
                          }}
                          className="p-1 text-[#64748B] hover:text-[#2563EB] rounded-md hover:bg-[#F1F5F9] transition-colors"
                          title="Correct Attendance"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Correction Modal */}
      <AttendanceCorrectionModal
        isOpen={correctionOpen}
        onClose={() => {
          setCorrectionOpen(false);
          setCorrectionRecord(null);
        }}
        onSuccess={fetchRecords}
        record={correctionRecord}
      />
    </div>
  );
};
export default AttendancePage;
