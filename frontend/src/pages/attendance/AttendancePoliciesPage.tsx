import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, ShieldCheck } from 'lucide-react';
import { attendanceApi } from '../../api/attendance.api';
import { leaveApi } from '../../api/leave.api';
import type { AttendancePolicy, PenaltyType } from '../../types/attendance';
import type { LeaveType } from '../../types/leave';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { TableSkeleton, ErrorAlert, EmptyState } from '../../components/common/States';
import { useAuth } from '../../hooks/useAuth';

export const AttendancePoliciesPage: React.FC = () => {
  const { checkPermission, role } = useAuth();
  const isAdmin = role === 'Admin';

  const [policies, setPolicies] = useState<AttendancePolicy[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'true' | 'false' | 'all'>('true');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<AttendancePolicy | null>(null);
  const [name, setName] = useState('');
  const [graceMinutes, setGraceMinutes] = useState(15);
  const [graceOccurrences, setGraceOccurrences] = useState(3);
  const [gracePenalty, setGracePenalty] = useState<PenaltyType>('NONE');
  const [beyondGracePenalty, setBeyondGracePenalty] = useState<PenaltyType>('HALF_DAY');
  const [earlyLeaveGrace, setEarlyLeaveGrace] = useState(15);
  const [earlyLeavePenalty, setEarlyLeavePenalty] = useState<PenaltyType>('HALF_DAY');
  const [maxUnexcused, setMaxUnexcused] = useState(3);
  const [leaveQuotas, setLeaveQuotas] = useState<Record<number, number>>({});
  const [stackDeductions, setStackDeductions] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete State
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const canCreate = isAdmin || checkPermission('ATTENDANCE_POLICIES', 'CREATE');
  const canUpdate = isAdmin || checkPermission('ATTENDANCE_POLICIES', 'UPDATE');
  const canDelete = isAdmin || checkPermission('ATTENDANCE_POLICIES', 'DELETE');

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [policiesData, typesData] = await Promise.all([
        attendanceApi.listPolicies({ is_active: statusFilter }),
        leaveApi.listLeaveTypes().catch(() => []),
      ]);
      setPolicies(policiesData);
      setLeaveTypes(typesData);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to fetch attendance policies');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const handleOpenModal = (policy?: AttendancePolicy) => {
    const initialQuotas: Record<number, number> = {};
    leaveTypes.forEach((lt) => {
      if (policy && policy.leave_type_quotas) {
        const val = policy.leave_type_quotas[lt.leave_type_id] ?? policy.leave_type_quotas[String(lt.leave_type_id)];
        initialQuotas[lt.leave_type_id] = val !== undefined ? Number(val) : 0;
      } else {
        initialQuotas[lt.leave_type_id] = Number(lt.default_days_year) || 0;
      }
    });
    setLeaveQuotas(initialQuotas);

    if (policy) {
      setSelectedPolicy(policy);
      setName(policy.name);
      setGraceMinutes(policy.grace_period_minutes ?? 15);
      setGraceOccurrences(policy.grace_occurrences_allowed ?? 3);
      setGracePenalty(policy.grace_period_penalty ?? 'NONE');
      setBeyondGracePenalty(policy.beyond_grace_penalty ?? 'HALF_DAY');
      setEarlyLeaveGrace(policy.early_leave_grace_minutes ?? 15);
      setEarlyLeavePenalty(policy.early_leave_penalty ?? 'HALF_DAY');
      setMaxUnexcused(policy.max_unexcused_absences ?? 3);
      setStackDeductions(policy.stack_deductions ?? false);
      setIsActive(policy.is_active ?? true);
    } else {
      setSelectedPolicy(null);
      setName('');
      setGraceMinutes(15);
      setGraceOccurrences(3);
      setGracePenalty('NONE');
      setBeyondGracePenalty('HALF_DAY');
      setEarlyLeaveGrace(15);
      setEarlyLeavePenalty('HALF_DAY');
      setMaxUnexcused(3);
      setStackDeductions(false);
      setIsActive(true);
    }
    setModalError(null);
    setModalOpen(true);
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setModalError('Policy name is required');
      return;
    }

    setModalLoading(true);
    setModalError(null);

    const payload = {
      name: name.trim(),
      grace_period_minutes: Number(graceMinutes),
      grace_occurrences_allowed: Number(graceOccurrences),
      grace_period_penalty: gracePenalty,
      beyond_grace_penalty: beyondGracePenalty,
      early_leave_grace_minutes: Number(earlyLeaveGrace),
      early_leave_penalty: earlyLeavePenalty,
      max_unexcused_absences: Number(maxUnexcused),
      leave_type_quotas: leaveQuotas,
      stack_deductions: stackDeductions,
      is_active: isActive,
    };

    try {
      if (selectedPolicy) {
        await attendanceApi.updatePolicy(selectedPolicy.policy_id, payload);
      } else {
        await attendanceApi.createPolicy(payload);
      }
      setModalOpen(false);
      fetchPolicies();
    } catch (err: any) {
      setModalError(err?.response?.data?.message || err.message || 'Failed to save policy');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await attendanceApi.deletePolicy(deleteId);
      setDeleteId(null);
      fetchPolicies();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete policy');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Attendance Policies</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Configure late-arrival grace thresholds, early leave penalties, and automatic deduction rules.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'true' | 'false' | 'all')}
            aria-label="Filter by policy status"
            className="px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
          >
            <option value="true">Active Policies</option>
            <option value="false">Inactive / Archived</option>
            <option value="all">All Policies</option>
          </select>
          {canCreate && (
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => handleOpenModal()}>
              New Policy
            </Button>
          )}
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchPolicies} />}

      {loading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : policies.length === 0 ? (
        <EmptyState
          title="No Attendance Policies Found"
          description="Create attendance policies to govern grace periods and automated payroll deductions."
          actionLabel={canCreate ? 'Create Policy' : undefined}
          onAction={canCreate ? () => handleOpenModal() : undefined}
          icon={<ShieldCheck className="w-8 h-8 text-[#2563EB]" />}
        />
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  <th className="py-3 px-4">Policy Name</th>
                  <th className="py-3 px-4">Grace Window</th>
                  <th className="py-3 px-4">Late Penalties</th>
                  <th className="py-3 px-4">Early Leave</th>
                  <th className="py-3 px-4">Leave Quotas</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {policies.map((p) => (
                  <tr key={p.policy_id} className="hover:bg-[#F8FAFC]/60 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-[#0F172A]">
                      {p.name}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#0F172A]">
                      <div>{p.grace_period_minutes} mins grace</div>
                      <div className="text-[#64748B]">{p.grace_occurrences_allowed} allowed/mo</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#475569]">
                      <div>Grace penalty: <span className="font-medium text-[#0F172A]">{p.grace_period_penalty}</span></div>
                      <div>Beyond grace: <span className="font-medium text-red-600">{p.beyond_grace_penalty}</span></div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#475569]">
                      <div>Grace: {p.early_leave_grace_minutes} mins</div>
                      <div>Penalty: <span className="font-medium text-[#0F172A]">{p.early_leave_penalty}</span></div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#475569]">
                      <div className="flex flex-wrap gap-x-1.5 gap-y-1">
                        {leaveTypes.length > 0 ? (
                          leaveTypes.map((lt) => {
                            const val = p.leave_type_quotas
                              ? (p.leave_type_quotas[lt.leave_type_id] ?? p.leave_type_quotas[String(lt.leave_type_id)] ?? 0)
                              : 0;
                            return (
                              <span key={lt.leave_type_id} className="inline-flex items-center gap-1 bg-[#F1F5F9] px-1.5 py-0.5 rounded text-[11px]">
                                <span className="text-[#64748B]">{lt.name}:</span>
                                <span className="font-semibold text-[#0F172A]">{val}d</span>
                              </span>
                            );
                          })
                        ) : (
                          <div>
                            PTO: <span className="font-semibold text-[#2563EB]">{p.paid_leave_days_count ?? 20}d</span> | Sick: <span className="font-semibold text-[#0F172A]">{p.sick_leave_days_count ?? 10}d</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-1 text-[#64748B]">Max Absences: <span className="font-semibold text-rose-600">{p.max_unexcused_absences ?? 3}d</span></div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={p.is_active ? 'success' : 'neutral'}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => handleOpenModal(p)}
                            className="p-1 text-[#64748B] hover:text-[#2563EB] rounded-md hover:bg-[#F1F5F9] transition-colors"
                            title="Edit Policy"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeleteId(p.policy_id)}
                            className="p-1 text-[#64748B] hover:text-[#DC2626] rounded-md hover:bg-[#F1F5F9] transition-colors"
                            title="Delete Policy"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Policy Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedPolicy ? 'Edit Attendance Policy' : 'Create Attendance Policy'}
        description="Configure grace period tolerances, penalty deductions, and configurable annual leave quotas."
        maxWidth="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={modalLoading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSavePolicy} isLoading={modalLoading}>
              Save Policy
            </Button>
          </>
        }
      >
        <form onSubmit={handleSavePolicy} className="space-y-4">
          {modalError && (
            <div className="p-3 bg-[#FEE2E2] border border-[#FECACA] rounded-lg text-sm text-[#DC2626]">
              {modalError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Policy Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard Strict Attendance"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                Grace Period (Minutes)
              </label>
              <Input
                type="number"
                min="0"
                value={graceMinutes}
                onChange={(e) => setGraceMinutes(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                Allowed Grace Occurrences
              </label>
              <Input
                type="number"
                min="0"
                value={graceOccurrences}
                onChange={(e) => setGraceOccurrences(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                Grace Occurrence Penalty
              </label>
              <select
                value={gracePenalty}
                onChange={(e) => setGracePenalty(e.target.value as PenaltyType)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-md text-[#0F172A]"
              >
                <option value="NONE">NONE</option>
                <option value="HALF_DAY">HALF DAY</option>
                <option value="FULL_DAY">FULL DAY</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                Beyond Grace Penalty
              </label>
              <select
                value={beyondGracePenalty}
                onChange={(e) => setBeyondGracePenalty(e.target.value as PenaltyType)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-md text-[#0F172A]"
              >
                <option value="NONE">NONE</option>
                <option value="HALF_DAY">HALF DAY</option>
                <option value="FULL_DAY">FULL DAY</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                Early Leave Grace (Mins)
              </label>
              <Input
                type="number"
                min="0"
                value={earlyLeaveGrace}
                onChange={(e) => setEarlyLeaveGrace(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                Early Leave Penalty
              </label>
              <select
                value={earlyLeavePenalty}
                onChange={(e) => setEarlyLeavePenalty(e.target.value as PenaltyType)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-md text-[#0F172A]"
              >
                <option value="NONE">NONE</option>
                <option value="HALF_DAY">HALF DAY</option>
                <option value="FULL_DAY">FULL DAY</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-[#E2E8F0]">
            <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-2">
              Policy Leave Quotas & Absence Entitlements
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {leaveTypes.map((lt) => (
                <div key={lt.leave_type_id}>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">
                    {lt.name} Days (Year)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={leaveQuotas[lt.leave_type_id] ?? 0}
                    onChange={(e) =>
                      setLeaveQuotas((prev) => ({
                        ...prev,
                        [lt.leave_type_id]: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-1">
                  Max Unexcused Absences / Month
                </label>
                <Input
                  type="number"
                  min="0"
                  value={maxUnexcused}
                  onChange={(e) => setMaxUnexcused(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={stackDeductions}
                onChange={(e) => setStackDeductions(e.target.checked)}
                className="w-4 h-4 text-[#2563EB] rounded-sm border-[#E2E8F0]"
              />
              <span className="text-sm font-medium text-[#0F172A]">Stack Deductions</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-[#2563EB] rounded-sm border-[#E2E8F0]"
              />
              <span className="text-sm font-medium text-[#0F172A]">Policy Active</span>
            </label>
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Attendance Policy"
        message="Are you sure you want to delete this policy? Any schedules referencing it will lose policy enforcement."
        confirmLabel="Delete"
        isDestructive={true}
        isLoading={deleteLoading}
      />
    </div>
  );
};
export default AttendancePoliciesPage;
