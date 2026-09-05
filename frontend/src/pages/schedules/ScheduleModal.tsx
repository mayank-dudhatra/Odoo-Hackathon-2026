import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { schedulesApi } from '../../api/schedules.api';
import { attendanceApi } from '../../api/attendance.api';
import type { WorkingSchedule, ScheduleDay, CreateSchedulePayload } from '../../types/schedules';
import type { AttendancePolicy } from '../../types/attendance';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schedule?: WorkingSchedule | null;
}

const DAYS_OF_WEEK = [
  { day: 1, name: 'Monday' },
  { day: 2, name: 'Tuesday' },
  { day: 3, name: 'Wednesday' },
  { day: 4, name: 'Thursday' },
  { day: 5, name: 'Friday' },
  { day: 6, name: 'Saturday' },
  { day: 7, name: 'Sunday' },
];

const DEFAULT_DAYS: ScheduleDay[] = DAYS_OF_WEEK.map(({ day }) => ({
  day_of_week: day,
  is_working_day: day >= 1 && day <= 5,
  start_time: day >= 1 && day <= 5 ? '09:00' : null,
  end_time: day >= 1 && day <= 5 ? '18:00' : null,
  break_minutes: day >= 1 && day <= 5 ? 60 : 0,
}));

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  schedule,
}) => {
  const isEditing = Boolean(schedule);
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [attendancePolicyId, setAttendancePolicyId] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [days, setDays] = useState<ScheduleDay[]>(DEFAULT_DAYS);
  const [policies, setPolicies] = useState<AttendancePolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (isOpen) {
      attendanceApi.listPolicies().then((data) => {
        if (active) setPolicies(data);
      }).catch(() => {});
    }
    return () => { active = false; };
  }, [isOpen]);

  useEffect(() => {
    if (schedule) {
      setName(schedule.name);
      setTimezone(schedule.timezone || 'UTC');
      setAttendancePolicyId(schedule.attendance_policy_id ? String(schedule.attendance_policy_id) : '');
      setIsActive(schedule.is_active ?? true);
      if (schedule.days && schedule.days.length > 0) {
        const mappedDays = DAYS_OF_WEEK.map(({ day }) => {
          const found = schedule.days?.find((d) => d.day_of_week === day);
          return found || {
            day_of_week: day,
            is_working_day: false,
            start_time: null,
            end_time: null,
            break_minutes: 0,
          };
        });
        setDays(mappedDays);
      } else {
        setDays(DEFAULT_DAYS);
      }
    } else {
      setName('');
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
      setAttendancePolicyId('');
      setIsActive(true);
      setDays(DEFAULT_DAYS);
    }
    setError(null);
  }, [schedule, isOpen]);

  const handleDayChange = (dayIndex: number, field: keyof ScheduleDay, value: unknown) => {
    setDays((prev) => {
      const next = [...prev];
      const target = { ...next[dayIndex], [field]: value };
      if (field === 'is_working_day' && value === false) {
        target.start_time = null;
        target.end_time = null;
        target.break_minutes = 0;
      } else if (field === 'is_working_day' && value === true) {
        target.start_time = target.start_time || '09:00';
        target.end_time = target.end_time || '18:00';
        target.break_minutes = target.break_minutes ?? 60;
      }
      next[dayIndex] = target;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Schedule name is required');
      return;
    }

    // Validate day intervals
    for (const d of days) {
      if (d.is_working_day) {
        if (!d.start_time || !d.end_time) {
          const dayName = DAYS_OF_WEEK.find((item) => item.day === d.day_of_week)?.name;
          setError(`Please specify start and end time for ${dayName}`);
          return;
        }
        if (d.start_time >= d.end_time) {
          const dayName = DAYS_OF_WEEK.find((item) => item.day === d.day_of_week)?.name;
          setError(`End time must be after start time for ${dayName}`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      const payload: CreateSchedulePayload = {
        name: name.trim(),
        timezone,
        attendance_policy_id: attendancePolicyId ? Number(attendancePolicyId) : null,
        is_active: isActive,
        days: days.map((d) => ({
          day_of_week: d.day_of_week,
          is_working_day: d.is_working_day,
          start_time: d.is_working_day ? d.start_time : null,
          end_time: d.is_working_day ? d.end_time : null,
          break_minutes: d.is_working_day ? Number(d.break_minutes || 0) : 0,
        })),
      };

      if (isEditing && schedule) {
        await schedulesApi.updateSchedule(schedule.schedule_id, payload);
      } else {
        await schedulesApi.createSchedule(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to save schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Working Schedule' : 'Create Working Schedule'}
      description="Define weekly operational hours, shift times, and attendance policies."
      maxWidth="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={loading}>
            {isEditing ? 'Save Changes' : 'Create Schedule'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-[#FEE2E2] border border-[#FECACA] rounded-lg text-sm text-[#DC2626]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Schedule Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard 40h Office"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Timezone
            </label>
            <Input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="e.g. Asia/Kolkata or UTC"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Attendance Policy
            </label>
            <select
              value={attendancePolicyId}
              onChange={(e) => setAttendancePolicyId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-md text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value="">None (Standard)</option>
              {policies.map((p) => (
                <option key={p.policy_id} value={p.policy_id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center pt-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-[#2563EB] rounded-sm border-[#E2E8F0] focus:ring-[#2563EB]"
              />
              <span className="text-sm font-medium text-[#0F172A]">Schedule is Active</span>
            </label>
          </div>
        </div>

        {/* Weekly Schedule Table */}
        <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
          <h4 className="text-sm font-semibold text-[#0F172A] mb-3">Weekly Schedule (Monday – Sunday)</h4>
          <div className="overflow-x-auto border border-[#E2E8F0] rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold">
                  <th className="p-2.5">Day</th>
                  <th className="p-2.5">Working</th>
                  <th className="p-2.5">Start Time</th>
                  <th className="p-2.5">End Time</th>
                  <th className="p-2.5">Break (mins)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {days.map((d, idx) => {
                  const dayName = DAYS_OF_WEEK.find((item) => item.day === d.day_of_week)?.name;
                  return (
                    <tr key={d.day_of_week} className={d.is_working_day ? 'bg-white' : 'bg-[#F8FAFC]/50 text-[#94A3B8]'}>
                      <td className="p-2.5 font-medium text-[#0F172A]">{dayName}</td>
                      <td className="p-2.5">
                        <input
                          type="checkbox"
                          checked={d.is_working_day}
                          onChange={(e) => handleDayChange(idx, 'is_working_day', e.target.checked)}
                          className="w-4 h-4 text-[#2563EB] rounded-sm border-[#E2E8F0] focus:ring-[#2563EB]"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="time"
                          disabled={!d.is_working_day}
                          value={d.start_time || ''}
                          onChange={(e) => handleDayChange(idx, 'start_time', e.target.value)}
                          className="px-2 py-1 border border-[#E2E8F0] rounded-md text-xs disabled:bg-gray-100 disabled:text-gray-400"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="time"
                          disabled={!d.is_working_day}
                          value={d.end_time || ''}
                          onChange={(e) => handleDayChange(idx, 'end_time', e.target.value)}
                          className="px-2 py-1 border border-[#E2E8F0] rounded-md text-xs disabled:bg-gray-100 disabled:text-gray-400"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="0"
                          max="720"
                          disabled={!d.is_working_day}
                          value={d.break_minutes ?? 0}
                          onChange={(e) => handleDayChange(idx, 'break_minutes', e.target.value)}
                          className="w-20 px-2 py-1 border border-[#E2E8F0] rounded-md text-xs disabled:bg-gray-100 disabled:text-gray-400"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </form>
    </Modal>
  );
};
