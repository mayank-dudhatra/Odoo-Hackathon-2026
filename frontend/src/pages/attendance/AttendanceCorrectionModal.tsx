import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { attendanceApi } from '../../api/attendance.api';
import type { AttendanceRecord, AttendanceStatus, DeductionType, AttendanceCorrectionPayload } from '../../types/attendance';

interface AttendanceCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  record: AttendanceRecord | null;
}

export const AttendanceCorrectionModal: React.FC<AttendanceCorrectionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  record,
}) => {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [status, setStatus] = useState<AttendanceStatus>('PRESENT');
  const [deductionType, setDeductionType] = useState<DeductionType>('NONE');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (record) {
      setCheckIn(record.check_in ? record.check_in.slice(11, 16) : '');
      setCheckOut(record.check_out ? record.check_out.slice(11, 16) : '');
      setStatus(record.status || 'PRESENT');
      setDeductionType(record.deduction_type || 'NONE');
      setRemarks(record.remarks || '');
    }
    setError(null);
  }, [record, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;

    setError(null);
    setLoading(true);

    try {
      // Build ISO timestamp strings using record work_date if time provided
      const baseDate = record.work_date ? record.work_date.slice(0, 10) : new Date().toISOString().slice(0, 10);
      const checkInISO = checkIn ? `${baseDate}T${checkIn}:00` : null;
      const checkOutISO = checkOut ? `${baseDate}T${checkOut}:00` : null;

      const payload: AttendanceCorrectionPayload = {
        check_in: checkInISO,
        check_out: checkOutISO,
        status,
        deduction_type: deductionType,
        remarks: remarks.trim() || undefined,
      };

      await attendanceApi.correctAttendance(record.attendance_id, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to update attendance record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Correct Attendance Record"
      description={
        record
          ? `Editing attendance for ${record.employee_name || `${record.employee_first_name || ''} ${record.employee_last_name || ''}`.trim() || `Employee #${record.employee_id}`} (${record.work_date?.slice(0, 10)})`
          : 'Attendance Correction'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={loading}>
            Save Correction
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Check-In Time
            </label>
            <Input
              type="time"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Check-Out Time
            </label>
            <Input
              type="time"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Attendance Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-md text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value="PRESENT">PRESENT</option>
              <option value="ABSENT">ABSENT</option>
              <option value="HALF_DAY">HALF DAY</option>
              <option value="LATE">LATE</option>
              <option value="ON_LEAVE">ON LEAVE</option>
              <option value="OVERTIME">OVERTIME</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Deduction Type
            </label>
            <select
              value={deductionType}
              onChange={(e) => setDeductionType(e.target.value as DeductionType)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-md text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value="NONE">None</option>
              <option value="HALF_DAY">Half Day</option>
              <option value="FULL_DAY">Full Day</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
            Reason / Remarks
          </label>
          <Input
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Approved adjustment due to system clock desync"
          />
        </div>
      </form>
    </Modal>
  );
};
