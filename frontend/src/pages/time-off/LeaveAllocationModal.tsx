import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { leaveApi } from '../../api/leave.api';
import { employeesApi } from '../../api/employees.api';
import type { LeaveType, CreateAllocationPayload } from '../../types/leave';
import type { Employee } from '../../types/organization';

interface LeaveAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const LeaveAllocationModal: React.FC<LeaveAllocationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);

  const [employeeId, setEmployeeId] = useState('');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [allocatedDays, setAllocatedDays] = useState('20');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (isOpen) {
      Promise.all([
        employeesApi.getEmployees({ limit: 200, status: 'ACTIVE' }).catch(() => ({ rows: [] })),
        leaveApi.listLeaveTypes().catch(() => []),
      ]).then(([empsRes, typesRes]) => {
        if (!active) return;
        const empRows = (empsRes as any)?.rows || (Array.isArray(empsRes) ? empsRes : []);
        setEmployees(empRows);
        setLeaveTypes(typesRes || []);
      });
      setError(null);
    }
    return () => { active = false; };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!employeeId) {
      setError('Please select an employee');
      return;
    }
    if (!leaveTypeId) {
      setError('Please select a leave type');
      return;
    }
    if (!allocatedDays || Number(allocatedDays) <= 0) {
      setError('Allocated days must be a positive number');
      return;
    }

    setLoading(true);
    try {
      const payload: CreateAllocationPayload = {
        employee_id: Number(employeeId),
        leave_type_id: Number(leaveTypeId),
        year: Number(year),
        allocated_days: Number(allocatedDays),
        valid_from: validFrom || null,
        valid_to: validTo || null,
        status: 'APPROVED',
      };

      await leaveApi.createAllocation(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to create leave allocation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Leave Allocation"
      description="Grant annual time-off balance entitlements to employees."
      maxWidth="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={loading}>
            Create Allocation
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

        <div>
          <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
            Employee *
          </label>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-md text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            required
          >
            <option value="">Select Employee...</option>
            {employees.map((emp) => (
              <option key={emp.employee_id} value={emp.employee_id}>
                {emp.first_name} {emp.last_name} ({emp.employee_code})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
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
              <option value="">Select Type...</option>
              {leaveTypes.map((t) => (
                <option key={t.leave_type_id} value={t.leave_type_id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Year *
            </label>
            <Input
              type="number"
              min="2020"
              max="2035"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
            Allocated Days *
          </label>
          <Input
            type="number"
            min="0.5"
            step="0.5"
            value={allocatedDays}
            onChange={(e) => setAllocatedDays(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Valid From
            </label>
            <Input
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Valid To
            </label>
            <Input
              type="date"
              value={validTo}
              onChange={(e) => setValidTo(e.target.value)}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};
