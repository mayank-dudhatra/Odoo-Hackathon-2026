import React, { useState, useEffect, useCallback } from 'react';
import { LogIn, LogOut, Clock, Calendar, CheckCircle2 } from 'lucide-react';
import { attendanceApi } from '../../api/attendance.api';
import type { AttendanceRecord, AttendanceStatus } from '../../types/attendance';
import { Button } from '../../components/common/Button';
import { Badge, type BadgeVariant } from '../../components/common/Badge';
import { TableSkeleton, ErrorAlert, EmptyState } from '../../components/common/States';
import { formatDate, formatTime } from '../../utils/format';

export const MyAttendancePage: React.FC = () => {
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const [todayRes, historyRes] = await Promise.all([
        attendanceApi.getMyAttendanceByDate(localToday).catch(() => null),
        attendanceApi.getMyAttendance({ limit: 30 }),
      ]);
      const records = Array.isArray(historyRes) ? historyRes : [];
      setHistory(records);
      const matchedToday =
        todayRes ||
        records.find(
          (r) =>
            (r.work_date && r.work_date.slice(0, 10) === localToday) ||
            (r.check_in && new Date(r.check_in).toDateString() === now.toDateString())
        );
      setTodayRecord(matchedToday || null);
    } catch (err: unknown) {
      const errorObj = err as { message?: string; response?: { data?: { message?: string } } };
      setError(errorObj?.response?.data?.message || errorObj?.message || 'Failed to load your attendance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      await attendanceApi.checkIn({});
      await fetchData();
    } catch (err: unknown) {
      const errorObj = err as { message?: string; response?: { data?: { message?: string } } };
      alert(errorObj?.response?.data?.message || errorObj?.message || 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      await attendanceApi.checkOut({});
      await fetchData();
    } catch (err: unknown) {
      const errorObj = err as { message?: string; response?: { data?: { message?: string } } };
      alert(errorObj?.response?.data?.message || errorObj?.message || 'Check-out failed');
    } finally {
      setActionLoading(false);
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

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="pb-5 border-b border-[#E2E8F0]">
        <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">My Attendance</h1>
        <p className="text-sm text-[#64748B] mt-1">
          Record your daily work shift check-in, check-out, and review past attendance entries.
        </p>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchData} />}

      {/* Clock In / Out Main Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center border border-blue-100 shrink-0">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#0F172A] font-mono tracking-tight">
                {currentTime}
              </div>
              <div className="text-xs font-medium text-[#64748B] flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
                {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {!todayRecord?.check_in ? (
              <Button
                variant="primary"
                size="lg"
                leftIcon={<LogIn className="w-5 h-5" />}
                onClick={handleCheckIn}
                isLoading={actionLoading}
              >
                Check In Now
              </Button>
            ) : !todayRecord?.check_out ? (
              <Button
                variant="destructive"
                size="lg"
                leftIcon={<LogOut className="w-5 h-5" />}
                onClick={handleCheckOut}
                isLoading={actionLoading}
              >
                Check Out Now
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-semibold">Shift Completed Today</span>
              </div>
            )}
          </div>
        </div>

        {/* Current Day Stats */}
        {todayRecord && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#E2E8F0] text-center">
            <div>
              <span className="text-xs text-[#64748B]">Check In:</span>
              <div className="text-sm font-semibold text-[#0F172A] font-mono mt-0.5">
                {formatTime(todayRecord.check_in)}
              </div>
            </div>
            <div>
              <span className="text-xs text-[#64748B]">Check Out:</span>
              <div className="text-sm font-semibold text-[#0F172A] font-mono mt-0.5">
                {formatTime(todayRecord.check_out)}
              </div>
            </div>
            <div>
              <span className="text-xs text-[#64748B]">Worked Hours:</span>
              <div className="text-sm font-semibold text-[#0F172A] mt-0.5">
                {(todayRecord.hours_worked ?? todayRecord.worked_hours) != null
                  ? `${todayRecord.hours_worked ?? todayRecord.worked_hours}h`
                  : '—'}
              </div>
            </div>
            <div>
              <span className="text-xs text-[#64748B]">Status:</span>
              <div className="mt-0.5">{getStatusBadge(todayRecord.status)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Attendance History */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#0F172A]">Attendance History</h2>

        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : history.length === 0 ? (
          <EmptyState
            title="No Attendance History"
            description="You don't have any past attendance records yet."
          />
        ) : (
          <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Check In</th>
                    <th className="py-3 px-4">Check Out</th>
                    <th className="py-3 px-4">Worked Hours</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {history.map((r) => (
                    <tr key={r.attendance_id} className="hover:bg-[#F8FAFC]/60 transition-colors">
                      <td className="py-3 px-4 font-medium text-[#0F172A] font-mono text-xs">
                        {formatDate(r.work_date)}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-emerald-700">
                        {formatTime(r.check_in)}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-600">
                        {formatTime(r.check_out)}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-[#0F172A]">
                        {(r.hours_worked ?? r.worked_hours) != null
                          ? `${r.hours_worked ?? r.worked_hours}h`
                          : '—'}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(r.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default MyAttendancePage;
