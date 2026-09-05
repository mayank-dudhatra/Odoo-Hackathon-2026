import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { leaveApi } from '../../api/leave.api';
import { employeesApi } from '../../api/employees.api';
import type { LeaveType, LeaveBalance, CreateLeaveRequestPayload } from '../../types/leave';
import type { Employee } from '../../types/organization';
import { useAuth } from '../../hooks/useAuth';

interface LeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, checkPermission, role } = useAuth();
  const isAdmin = role === 'Admin';
  const canAdmin = isAdmin || checkPermission('LEAVE_REQUESTS', 'CREATE');
  const isEmployeeRole = role === 'Employee' || user?.role_name === 'Employee';

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);

  const [employeeId, setEmployeeId] = useState<string>('');
  const [leaveTypeId, setLeaveTypeId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [daysRequested, setDaysRequested] = useState<string>('1');
  const [reason, setReason] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (isOpen) {
      Promise.all([
        leaveApi.listLeaveTypes().catch(() => []),
        !isEmployeeRole ? employeesApi.getEmployees({ limit: 150, status: 'ACTIVE' }).catch(() => ({ rows: [] })) : Promise.resolve({ rows: [] }),
        leaveApi.getOwnLeaveBalances().catch(() => []),
      ]).then(([typesRes, empsRes, balancesRes]) => {
        if (!active) return;
        setLeaveTypes(typesRes || []);
        const empList = (empsRes as any)?.rows || (Array.isArray(empsRes) ? empsRes : []);
        setEmployees(empList);
        setBalances(balancesRes || []);
      });
    }
    return () => { active = false; };
  }, [isOpen, isEmployeeRole]);

  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().slice(0, 10);
      setStartDate(today);
      setEndDate(today);
      setDaysRequested('1');
      setReason('');
      setError(null);
      if (user?.employee_id) {
        setEmployeeId(String(user.employee_id));
      }
    }
  }, [isOpen, user]);

  // Calculate day count automatically when dates change
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end >= start) {
        const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
        setDaysRequested(String(diffDays));
      }
    }
  }, [startDate, endDate]);

  const selectedBalance = balances.find((b) => String(b.leave_type_id) === leaveTypeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!leaveTypeId) {
      setError('Please select a leave type');
      return;
    }
    if (!startDate || !endDate) {
      setError('Start date and end date are required');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError('End date cannot be earlier than start date');
      return;
    }
    if (!daysRequested || Number(daysRequested) <= 0) {
      setError('Days requested must be greater than zero');
      return;
    }

    setLoading(true);
    try {
      const payload: CreateLeaveRequestPayload = {
        leave_type_id: Number(leaveTypeId),
        employee_id: employeeId ? Number(employeeId) : undefined,
        start_date: startDate,
        end_date: endDate,
        days_requested: Number(daysRequested),
        reason: reason.trim() || undefined,
      };

      await leaveApi.createLeaveRequest(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to submit leave request';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request Time Off"
      description="Submit a paid or unpaid time-off leave request for manager approval."
      maxWidth="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={loading}>
            Submit Request
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

        {/* Optional Employee Selector for Admin/HR creating on behalf */}
        {!isEmployeeRole && canAdmin && employees.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              On Behalf of Employee (Optional)
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-md text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value="">Myself ({user?.first_name} {user?.last_name})</option>
              {employees.map((emp) => (
                <option key={emp.employee_id} value={emp.employee_id}>
                  {emp.first_name} {emp.last_name} ({emp.employee_code})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Leave Type */}
        <div>
          <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
            Leave Type *
          </label>
          <select
            value={leaveTypeId}
            onChange={(e) => setLeaveTypeId(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-md text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            required
          >
            <option value="">Select Leave Type...</option>
            {leaveTypes.map((t) => (
              <option key={t.leave_type_id} value={t.leave_type_id}>
                {t.name} ({t.is_paid ? 'Paid' : 'Unpaid'})
              </option>
            ))}
          </select>
        </div>

        {/* Current Balance Notice */}
        {selectedBalance && (
          <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg text-xs text-[#1E40AF] flex justify-between items-center">
            <span>Current Available Balance:</span>
            <span className="font-bold text-sm">{selectedBalance.remaining_days} days</span>
          </div>
        )}

        {/* Start and End Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Start Date *
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              End Date *
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Days requested */}
        <div>
          <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
            Days Requested *
          </label>
          <Input
            type="number"
            min="0.5"
            step="0.5"
            value={daysRequested}
            onChange={(e) => setDaysRequested(e.target.value)}
            required
          />
        </div>

        {/* Reason */}
        <div>
          <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
            Reason (Optional)
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain reason for time-off..."
            className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-md text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
          />
        </div>
      </form>
    </Modal>
  );
};
