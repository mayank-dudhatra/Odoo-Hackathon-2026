import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Check, X, Ban, Calendar, Clock, Layers, FileSpreadsheet } from 'lucide-react';
import { leaveApi } from '../../api/leave.api';
import type { LeaveRequest, LeaveBalance, LeaveAllocation, LeaveType, LeaveRequestStatus } from '../../types/leave';
import { Button } from '../../components/common/Button';
import { Badge, type BadgeVariant } from '../../components/common/Badge';
import { TableSkeleton, ErrorAlert, EmptyState } from '../../components/common/States';
import { LeaveRequestModal } from './LeaveRequestModal';
import { LeaveAllocationModal } from './LeaveAllocationModal';
import { LeaveTypesModal } from './LeaveTypesModal';
import { formatDate } from '../../utils/format';
import { useAuth } from '../../hooks/useAuth';

export const TimeOffPage: React.FC = () => {
  const { user, checkPermission, role } = useAuth();
  const isAdmin = role === 'Admin';
  const [activeTab, setActiveTab] = useState<'requests' | 'balances' | 'allocations' | 'types'>('requests');

  // Requests
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState<string | null>(null);

  // Balances
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);

  // Allocations
  const [allocations, setAllocations] = useState<LeaveAllocation[]>([]);
  const [allocationsLoading, setAllocationsLoading] = useState(false);

  // Leave Types
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);

  // Modals
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [allocationModalOpen, setAllocationModalOpen] = useState(false);
  const [typesModalOpen, setTypesModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<LeaveType | null>(null);

  // Action states
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Permissions
  const canApprove = isAdmin || checkPermission('LEAVE_REQUESTS', 'APPROVE');
  const canRefuse = isAdmin || checkPermission('LEAVE_REQUESTS', 'REFUSE');
  const canManageAllocations = isAdmin || checkPermission('LEAVE_ALLOCATIONS', 'CREATE');
  const canManageTypes = isAdmin || checkPermission('LEAVE_TYPES', 'CREATE');

  const fetchRequests = useCallback(async () => {
    setRequestsLoading(true);
    setRequestsError(null);
    try {
      const isEmployeeOnly = user?.role_name === 'Employee';
      let data: LeaveRequest[];
      if (isEmployeeOnly) {
        data = await leaveApi.getOwnLeaveRequests();
      } else {
        try {
          data = await leaveApi.listLeaveRequests();
        } catch {
          data = await leaveApi.getOwnLeaveRequests();
        }
      }
      setRequests(data || []);
    } catch (err: any) {
      setRequestsError(err?.response?.data?.message || err.message || 'Failed to fetch leave requests');
    } finally {
      setRequestsLoading(false);
    }
  }, [user]);

  const fetchBalances = useCallback(async () => {
    setBalancesLoading(true);
    try {
      const data = await leaveApi.getOwnLeaveBalances();
      setBalances(data);
    } catch {
      setBalances([]);
    } finally {
      setBalancesLoading(false);
    }
  }, []);

  const fetchAllocations = useCallback(async () => {
    setAllocationsLoading(true);
    try {
      const data = await leaveApi.listAllocations();
      setAllocations(data);
    } catch {
      setAllocations([]);
    } finally {
      setAllocationsLoading(false);
    }
  }, []);

  const fetchTypes = useCallback(async () => {
    setTypesLoading(true);
    try {
      const data = await leaveApi.listLeaveTypes();
      setLeaveTypes(data);
    } catch {
      setLeaveTypes([]);
    } finally {
      setTypesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    fetchBalances();
    fetchTypes();
  }, [fetchRequests, fetchBalances, fetchTypes]);

  useEffect(() => {
    if (activeTab === 'allocations') fetchAllocations();
    if (activeTab === 'types') fetchTypes();
  }, [activeTab, fetchAllocations, fetchTypes]);

  const handleApprove = async (id: number) => {
    setActionLoadingId(id);
    try {
      await leaveApi.approveLeaveRequest(id);
      fetchRequests();
      fetchBalances();
    } catch (err: any) {
      alert(err?.message || err?.response?.data?.message || 'Failed to approve request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRefuse = async (id: number) => {
    const reason = prompt('Please enter the refusal reason/remarks:');
    if (reason === null) return;
    setActionLoadingId(id);
    try {
      await leaveApi.refuseLeaveRequest(id, reason);
      fetchRequests();
      fetchBalances();
    } catch (err: any) {
      alert(err?.message || err?.response?.data?.message || 'Failed to refuse request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Are you sure you want to cancel your leave request?')) return;
    setActionLoadingId(id);
    try {
      await leaveApi.cancelLeaveRequest(id);
      fetchRequests();
      fetchBalances();
    } catch (err: any) {
      alert(err?.message || err?.response?.data?.message || 'Failed to cancel request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status: LeaveRequestStatus) => {
    const map: Record<LeaveRequestStatus, { label: string; variant: BadgeVariant }> = {
      APPROVED: { label: 'Approved', variant: 'success' },
      PENDING: { label: 'Pending', variant: 'warning' },
      REFUSED: { label: 'Refused', variant: 'danger' },
      CANCELLED: { label: 'Cancelled', variant: 'neutral' },
    };
    const s = map[status] || { label: status, variant: 'neutral' };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const displayBalances: LeaveBalance[] = balances;

  const totalAllocated = displayBalances.reduce((sum, b) => sum + (Number(b.allocated_days) || 0), 0);
  const totalUsed = displayBalances.reduce((sum, b) => sum + (Number(b.used_days) || 0), 0);
  const totalRemaining = displayBalances.reduce((sum, b) => sum + (Number(b.remaining_days) || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Time Off & Leaves</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Request time off, view company attendance policies, manage allocations, and track real-time leave balances.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setRequestModalOpen(true)}
        >
          Request Time Off
        </Button>
      </div>

      {/* Overview Cards: Total Granted, Taken, Remaining & Policy Types */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#64748B] font-medium">
            <span>Total Granted Leave</span>
            <Calendar className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A] mt-2">
            {totalAllocated} <span className="text-xs font-normal text-[#64748B]">Days</span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">Company Allocated Quotas</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#64748B] font-medium">
            <span>Leaves Taken / Used</span>
            <Clock className="w-4 h-4 text-[#DC2626]" />
          </div>
          <div className="text-2xl font-bold text-[#DC2626] mt-2">
            {totalUsed} <span className="text-xs font-normal text-[#64748B]">Days</span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">Approved Time-Off Days</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#64748B] font-medium">
            <span>Remaining Leave Balance</span>
            <Check className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-[#2563EB] mt-2">
            {totalRemaining} <span className="text-xs font-normal text-[#64748B]">Days</span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">Available Real-time Balance</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#64748B] font-medium">
            <span>Leave Policy Types</span>
            <Layers className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A] mt-2">
            {leaveTypes.length || displayBalances.length} <span className="text-xs font-normal text-[#64748B]">Active Policies</span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">Configured Attendance Rules</p>
        </div>
      </div>

      {/* Company Leave Policies & Remaining Balances Card Breakdown */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#2563EB]" />
              Company Leave Policies & Available Quotas
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Live details of granted leave policies, consumption, and remaining balance quotas.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setRequestModalOpen(true)}
          >
            Apply Time Off
          </Button>
        </div>

        {displayBalances.length === 0 ? (
          <div className="p-6 text-center text-sm text-[#64748B] bg-[#F8FAFC] rounded-lg border border-dashed border-[#CBD5E1]">
            No leave types or balance quotas configured for your company yet. Company Admin can add Leave Types under the <strong>Leave Types</strong> tab.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayBalances.map((b) => (
              <div
                key={b.leave_type_id}
                className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 hover:border-[#2563EB]/40 transition-colors space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0F172A] text-sm truncate">{b.leave_type_name}</span>
                  <Badge variant={b.is_paid ? 'success' : 'warning'}>
                    {b.is_paid ? 'Paid' : 'Unpaid'}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-lg border border-[#E2E8F0]">
                    <span className="text-[#64748B]">Allocated</span>
                    <div className="font-bold text-[#0F172A] mt-0.5">{b.allocated_days ?? '∞'}d</div>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-[#E2E8F0]">
                    <span className="text-[#64748B]">Used</span>
                    <div className="font-bold text-[#DC2626] mt-0.5">{b.used_days ?? 0}d</div>
                  </div>
                  <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                    <span className="text-[#1E40AF]">Available</span>
                    <div className="font-bold text-[#2563EB] mt-0.5">{b.remaining_days ?? '∞'}d</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E2E8F0] gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'requests'
              ? 'border-[#2563EB] text-[#2563EB]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          Leave Requests
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('balances')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'balances'
              ? 'border-[#2563EB] text-[#2563EB]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          My Balances
        </button>

        {canManageAllocations && (
          <button
            type="button"
            onClick={() => setActiveTab('allocations')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'allocations'
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            Allocations
          </button>
        )}

        {canManageTypes && (
          <button
            type="button"
            onClick={() => setActiveTab('types')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'types'
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            Leave Types
          </button>
        )}
      </div>

      {/* TAB 1: REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {requestsError && <ErrorAlert message={requestsError} onRetry={fetchRequests} />}

          {requestsLoading ? (
            <TableSkeleton rows={6} cols={6} />
          ) : requests.length === 0 ? (
            <EmptyState
              title="No Leave Requests Found"
              description="Submit your first time-off request to see it tracked here."
              actionLabel="Request Time Off"
              onAction={() => setRequestModalOpen(true)}
              icon={<Calendar className="w-8 h-8 text-[#2563EB]" />}
            />
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Leave Type</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Days</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Reason / Remarks</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {requests.map((r) => {
                      const reqId = (r.leave_request_id ?? r.request_id)!;
                      const isPending = r.status === 'PENDING';
                      const isOwn = Boolean(user?.employee_id && r.employee_id === user.employee_id);
                      const isLoading = actionLoadingId === reqId;

                      return (
                        <tr key={reqId} className="hover:bg-[#F8FAFC]/60 transition-colors">
                          <td className="py-3.5 px-4 font-medium text-[#0F172A]">
                            <div>{r.employee_name || 'Employee'}</div>
                            <div className="text-xs text-[#64748B] font-normal">{r.employee_code}</div>
                          </td>
                          <td className="py-3.5 px-4 text-[#0F172A]">
                            <div className="font-medium">{r.leave_type_name}</div>
                          </td>
                          <td className="py-3.5 px-4 text-xs font-mono text-[#0F172A]">
                            <div>{formatDate(r.start_date)}</div>
                            <div className="text-[#64748B]">to {formatDate(r.end_date)}</div>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-[#0F172A]">
                            {r.days_requested} {r.days_requested === 1 ? 'day' : 'days'}
                          </td>
                          <td className="py-3.5 px-4">
                            {getStatusBadge(r.status)}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-[#475569] max-w-xs truncate">
                            {r.reason || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {isPending && canApprove && (
                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() => handleApprove(reqId)}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                                  title="Approve Request"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                              {isPending && canRefuse && (
                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() => handleRefuse(reqId)}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                  title="Refuse Request"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                              {isPending && isOwn && (
                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() => handleCancel(reqId)}
                                  className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                  title="Cancel Request"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY BALANCES */}
      {activeTab === 'balances' && (
        <div className="space-y-4">
          {balancesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <TableSkeleton rows={3} cols={2} />
            </div>
          ) : balances.length === 0 ? (
            <EmptyState
              title="No Leave Balances Available"
              description="No active leave allocations were found for your employee profile."
              icon={<Clock className="w-8 h-8 text-[#2563EB]" />}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {balances.map((b) => (
                <div
                  key={b.leave_type_id}
                  className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[#0F172A]">{b.leave_type_name}</h3>
                    <Badge variant={b.is_paid ? 'success' : 'warning'}>{b.is_paid ? 'Paid' : 'Unpaid'}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-2">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-xs text-[#64748B]">Allocated</span>
                      <div className="text-base font-bold text-[#0F172A] mt-0.5">{b.allocated_days}d</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-xs text-[#64748B]">Used</span>
                      <div className="text-base font-bold text-[#DC2626] mt-0.5">{b.used_days}d</div>
                    </div>
                    <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                      <span className="text-xs text-[#1E40AF]">Available</span>
                      <div className="text-base font-bold text-[#2563EB] mt-0.5">{b.remaining_days}d</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ALLOCATIONS */}
      {activeTab === 'allocations' && canManageAllocations && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setAllocationModalOpen(true)}
            >
              New Allocation
            </Button>
          </div>

          {allocationsLoading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : allocations.length === 0 ? (
            <EmptyState
              title="No Allocations Granted"
              description="Grant annual time-off balance entitlements to employees."
              actionLabel="Create Allocation"
              onAction={() => setAllocationModalOpen(true)}
              icon={<Layers className="w-8 h-8 text-[#2563EB]" />}
            />
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Leave Type</th>
                      <th className="py-3 px-4">Year</th>
                      <th className="py-3 px-4">Allocated Days</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {allocations.map((a) => (
                      <tr key={a.allocation_id} className="hover:bg-[#F8FAFC]/60 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-[#0F172A]">
                          <div>{a.employee_name || 'Staff'}</div>
                          <div className="text-xs text-[#64748B] font-normal">{a.employee_code}</div>
                        </td>
                        <td className="py-3.5 px-4 text-[#0F172A]">{a.leave_type_name}</td>
                        <td className="py-3.5 px-4 text-xs font-mono">{a.year}</td>
                        <td className="py-3.5 px-4 font-semibold text-[#0F172A]">{a.allocated_days} days</td>
                        <td className="py-3.5 px-4">
                          <Badge variant={a.status === 'APPROVED' ? 'success' : 'neutral'}>
                            {a.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: LEAVE TYPES */}
      {activeTab === 'types' && canManageTypes && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setSelectedType(null);
                setTypesModalOpen(true);
              }}
            >
              New Leave Type
            </Button>
          </div>

          {typesLoading ? (
            <TableSkeleton rows={4} cols={5} />
          ) : leaveTypes.length === 0 ? (
            <EmptyState
              title="No Leave Types Configured"
              description="Define leave types like Annual Vacation, Casual Leave, Sick Leave, or Maternity."
              actionLabel="Create Leave Type"
              onAction={() => {
                setSelectedType(null);
                setTypesModalOpen(true);
              }}
              icon={<FileSpreadsheet className="w-8 h-8 text-[#2563EB]" />}
            />
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                      <th className="py-3 px-4">Leave Type Name</th>
                      <th className="py-3 px-4">Unit</th>
                      <th className="py-3 px-4">Compensation</th>
                      <th className="py-3 px-4">Payroll Integration</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {leaveTypes.map((t) => (
                      <tr key={t.leave_type_id} className="hover:bg-[#F8FAFC]/60 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-[#0F172A]">{t.name}</td>
                        <td className="py-3.5 px-4 text-xs text-[#64748B]">{t.unit}</td>
                        <td className="py-3.5 px-4">
                          <Badge variant={t.is_paid ? 'success' : 'warning'}>
                            {t.is_paid ? 'Paid' : 'Unpaid'}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-[#0F172A]">
                          {t.payroll_integration ? 'Yes (Integrated)' : 'No'}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant={t.is_active ? 'success' : 'neutral'}>
                            {t.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedType(t);
                              setTypesModalOpen(true);
                            }}
                            className="p-1 text-[#64748B] hover:text-[#2563EB] rounded-md hover:bg-[#F1F5F9] transition-colors"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <LeaveRequestModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onSuccess={() => {
          fetchRequests();
          fetchBalances();
        }}
      />

      <LeaveAllocationModal
        isOpen={allocationModalOpen}
        onClose={() => setAllocationModalOpen(false)}
        onSuccess={() => {
          fetchAllocations();
          fetchBalances();
        }}
      />

      <LeaveTypesModal
        isOpen={typesModalOpen}
        onClose={() => {
          setTypesModalOpen(false);
          setSelectedType(null);
        }}
        onSuccess={fetchTypes}
        leaveType={selectedType}
      />
    </div>
  );
};
export default TimeOffPage;
