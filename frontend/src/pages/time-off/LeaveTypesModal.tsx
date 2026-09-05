import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { leaveApi } from '../../api/leave.api';
import type { LeaveType, CreateLeaveTypePayload, LeaveUnit } from '../../types/leave';

interface LeaveTypesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  leaveType?: LeaveType | null;
}

export const LeaveTypesModal: React.FC<LeaveTypesModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  leaveType,
}) => {
  const isEditing = Boolean(leaveType);

  const [name, setName] = useState('');
  const [unit, setUnit] = useState<LeaveUnit>('DAYS');
  const [isPaid, setIsPaid] = useState(true);
  const [requiresAllocation, setRequiresAllocation] = useState(true);
  const [defaultDays, setDefaultDays] = useState(0);
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [payrollIntegration, setPayrollIntegration] = useState(true);
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (leaveType) {
      setName(leaveType.name);
      setUnit(leaveType.unit || 'DAYS');
      setIsPaid(leaveType.is_paid ?? true);
      setRequiresAllocation(leaveType.requires_allocation ?? true);
      setDefaultDays(leaveType.default_days_year ?? 0);
      setApprovalRequired(leaveType.approval_required ?? true);
      setPayrollIntegration(leaveType.payroll_integration ?? true);
      setIsActive(leaveType.is_active ?? true);
    } else {
      setName('');
      setUnit('DAYS');
      setIsPaid(true);
      setRequiresAllocation(true);
      setDefaultDays(15);
      setApprovalRequired(true);
      setPayrollIntegration(true);
      setIsActive(true);
    }
    setError(null);
  }, [leaveType, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Leave type name is required');
      return;
    }

    setLoading(true);
    setError(null);

    const payload: CreateLeaveTypePayload = {
      name: name.trim(),
      unit,
      is_paid: isPaid,
      requires_allocation: requiresAllocation,
      default_days_year: Number(defaultDays),
      approval_required: approvalRequired,
      payroll_integration: payrollIntegration,
      is_active: isActive,
    };

    try {
      if (isEditing && leaveType) {
        await leaveApi.updateLeaveType(leaveType.leave_type_id, payload);
      } else {
        await leaveApi.createLeaveType(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to save leave type');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Leave Type' : 'Create Leave Type'}
      description="Configure entitlement units, paid status, and payroll deduction integration."
      maxWidth="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={loading}>
            {isEditing ? 'Save Changes' : 'Create Leave Type'}
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
            Leave Type Name *
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Annual Vacation, Sick Leave"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Measurement Unit *
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as LeaveUnit)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-md text-[#0F172A]"
            >
              <option value="DAYS">Days</option>
              <option value="HOURS">Hours</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Default Annual Days
            </label>
            <Input
              type="number"
              min="0"
              value={defaultDays}
              onChange={(e) => setDefaultDays(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
              className="w-4 h-4 text-[#2563EB] rounded-sm border-[#E2E8F0]"
            />
            <span className="text-sm font-medium text-[#0F172A]">Paid Time Off (No salary deduction)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={requiresAllocation}
              onChange={(e) => setRequiresAllocation(e.target.checked)}
              className="w-4 h-4 text-[#2563EB] rounded-sm border-[#E2E8F0]"
            />
            <span className="text-sm font-medium text-[#0F172A]">Requires Prior Allocation Balance</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={payrollIntegration}
              onChange={(e) => setPayrollIntegration(e.target.checked)}
              className="w-4 h-4 text-[#2563EB] rounded-sm border-[#E2E8F0]"
            />
            <span className="text-sm font-medium text-[#0F172A]">Integrate with Payroll Calculations</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={approvalRequired}
              onChange={(e) => setApprovalRequired(e.target.checked)}
              className="w-4 h-4 text-[#2563EB] rounded-sm border-[#E2E8F0]"
            />
            <span className="text-sm font-medium text-[#0F172A]">Requires Manager Approval</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-[#2563EB] rounded-sm border-[#E2E8F0]"
            />
            <span className="text-sm font-medium text-[#0F172A]">Active Leave Type</span>
          </label>
        </div>
      </form>
    </Modal>
  );
};
